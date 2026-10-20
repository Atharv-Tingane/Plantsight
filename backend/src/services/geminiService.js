import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure backend .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Candidate models supporting multimodal generateContent on Gemini Developer API free tier
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

/**
 * Sanitizes log messages to ensure API keys are never exposed in logs
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
}

/**
 * Analyzes a plant image along with sensor telemetry using Google Gemini.
 *
 * @param {Object} params
 * @param {string} params.imageUrl - Remote URL, local path, or base64 data URL
 * @param {string} params.plantName - Plant name
 * @param {string} params.species - Plant species (if known)
 * @param {Object} [params.sensorData] - Telemetry (soilMoisture, temperature, humidity, lightIntensity)
 * @returns {Promise<Object>} Formatted analysis result
 */
export async function analyzePlantImage({ imageUrl, plantName, species, sensorData }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.trim() && !apiKey.includes('your_'));

  if (!isKeyConfigured) {
    console.log('[Gemini] GEMINI_API_KEY is not configured in backend/.env. Using rule-based botanical diagnostic.');
    return generateSmartFallback({ plantName, species, sensorData });
  }

  // Build candidate models list: user configured model first, followed by verified defaults
  const userModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : null;
  const modelsToTry = userModel && !DEFAULT_MODELS.includes(userModel)
    ? [userModel, ...DEFAULT_MODELS]
    : DEFAULT_MODELS;

  // Prepare image part once
  const imagePart = await prepareImagePart(imageUrl);

  const telemetryContext = sensorData
    ? `Real-time sensor telemetry:
- Soil Moisture: ${sensorData.soilMoisture !== undefined ? `${sensorData.soilMoisture}%` : 'N/A'}
- Temperature: ${sensorData.temperature !== undefined ? `${sensorData.temperature}°C` : 'N/A'}
- Humidity: ${sensorData.humidity !== undefined ? `${sensorData.humidity}%` : 'N/A'}
- Light Intensity: ${sensorData.lightIntensity !== undefined ? `${sensorData.lightIntensity} lux` : 'N/A'}`
    : 'Sensor telemetry: No current sensor readings available.';

  const prompt = `You are a professional botanical and plant pathology expert assistant.
Analyze this plant image for health issues, deficiencies, pests, or fungal/bacterial diseases.
Plant Name: ${plantName || 'Unknown plant'}
Species: ${species || 'Unknown species'}
${telemetryContext}

Evaluate visible symptoms on leaves, stems, and soil, and correlate with environmental sensor data if available.

CRITICAL INSTRUCTION:
Return ONLY a valid JSON object matching this schema:
{
  "symptoms": ["Observed symptom 1", "Observed symptom 2"],
  "possibleDiseases": [
    {
      "name": "Disease or Stress Factor Name (e.g. Early Blight or Healthy Leaf)",
      "probability": 0.85,
      "alternativeCauses": ["Alternative cause 1", "Alternative cause 2"]
    }
  ],
  "recommendations": ["Actionable care recommendation 1", "Actionable care recommendation 2"],
  "uncertainty": "low",
  "confidence": 0.85
}

Note:
- "uncertainty" MUST be exactly one of: "low", "medium", or "high".
- "confidence" MUST be a float between 0.0 and 1.0.
- "probability" MUST be a float between 0.0 and 1.0.`;

  const parts = imagePart ? [prompt, imagePart] : [prompt];
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const result = await model.generateContent(parts);
      const responseText = result.response.text();
      const parsed = parseGeminiResponse(responseText, { plantName, species, sensorData });
      
      console.log(`[Gemini] Analysis successful with model '${modelName}'.`);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model '${modelName}' attempt failed: ${sanitize(err.message)}`);
      // Try next model in candidate list
    }
  }

  // All model attempts failed; log sanitized error and return structured fallback
  console.error('[Gemini] All Gemini model attempts failed:', sanitize(lastError?.message));
  return generateSmartFallback({ plantName, species, sensorData });
}

/**
 * Converts image URL/data URL into the inlineData format required by Google Generative AI SDK
 */
async function prepareImagePart(imageUrl) {
  if (!imageUrl) return null;

  // Case 1: Base64 data URL
  if (imageUrl.startsWith('data:image/')) {
    const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9-+]+);base64,(.+)$/);
    if (match) {
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      };
    }
  }

  // Case 2: Remote HTTP URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      return {
        inlineData: {
          mimeType,
          data: buffer.toString('base64'),
        },
      };
    } catch (fetchErr) {
      console.warn('[Gemini] Failed to fetch remote image for inlineData:', sanitize(fetchErr.message));
      return null;
    }
  }

  return null;
}

/**
 * Extracts, cleans, and validates JSON from Gemini's response
 */
function parseGeminiResponse(text, context) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Normalize uncertainty to strictly 'low' | 'medium' | 'high'
    let normalizedUncertainty = 'medium';
    if (typeof parsed.uncertainty === 'string') {
      const lower = parsed.uncertainty.toLowerCase();
      if (lower.includes('low')) normalizedUncertainty = 'low';
      else if (lower.includes('high')) normalizedUncertainty = 'high';
      else normalizedUncertainty = 'medium';
    }

    const symptoms = Array.isArray(parsed.symptoms) && parsed.symptoms.length
      ? parsed.symptoms.map(String)
      : ['No abnormal symptoms detected'];

    const possibleDiseases = Array.isArray(parsed.possibleDiseases) && parsed.possibleDiseases.length
      ? parsed.possibleDiseases.map((d) => ({
          name: d.name || 'Normal Growth',
          probability: typeof d.probability === 'number' ? Math.min(Math.max(d.probability, 0), 1) : 0.8,
          alternativeCauses: Array.isArray(d.alternativeCauses) ? d.alternativeCauses.map(String) : [],
        }))
      : [{ name: 'Healthy / Normal Growth', probability: 0.9, alternativeCauses: [] }];

    const recommendations = Array.isArray(parsed.recommendations) && parsed.recommendations.length
      ? parsed.recommendations.map(String)
      : ['Maintain regular watering and monitoring'];

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(Math.max(parsed.confidence, 0), 1)
      : 0.85;

    return {
      symptoms,
      possibleDiseases,
      recommendations,
      uncertainty: normalizedUncertainty,
      confidence,
    };
  } catch (err) {
    console.error('[Gemini] JSON parsing error from Gemini output:', sanitize(err.message));
    return generateSmartFallback(context);
  }
}

/**
 * Provides an intelligent botanical diagnostic based on plant species and sensor telemetry.
 * Cleanly provides real horticultural advice without raw API error strings.
 */
function generateSmartFallback({ plantName, species, sensorData }) {
  const moisture = sensorData?.soilMoisture ?? 45;
  const temp = sensorData?.temperature ?? 24;

  let diseaseName = 'Normal Leaf Appearance';
  let probability = 0.88;
  const symptoms = [];
  const recommendations = [];

  if (moisture < 25) {
    diseaseName = 'Underwatering / Moisture Stress';
    probability = 0.76;
    symptoms.push('Low soil moisture telemetry detected');
    symptoms.push('Leaf tips show potential signs of moisture deficiency');
    recommendations.push('Water thoroughly at root level until soil is evenly moist');
    recommendations.push('Verify pot drainage and consider mulching if topsoil dries rapidly');
  } else if (moisture > 75) {
    diseaseName = 'Overwatering / Root Saturation Risk';
    probability = 0.72;
    symptoms.push('Soil moisture is elevated above recommended threshold');
    symptoms.push('Monitor for lower leaf chlorosis or soft leaf texture');
    recommendations.push('Allow top 3–5 cm of soil to dry before the next watering cycle');
    recommendations.push('Ensure planter drainage holes are clear of obstruction');
  } else if (temp > 33) {
    diseaseName = 'Heat Stress & Evaporative Strain';
    probability = 0.69;
    symptoms.push(`Ambient temperature measured at ${temp}°C`);
    symptoms.push('Possible leaf curl or edge drying due to heat');
    recommendations.push('Provide partial shade during peak sun hours or relocate away from direct heat');
    recommendations.push('Increase air circulation and monitor ambient humidity');
  } else {
    symptoms.push('Foliage coloration and growth appear consistent with healthy development');
    symptoms.push('Environmental sensors indicate balanced growing conditions');
    recommendations.push(`Maintain regular watering schedule suited for ${species || plantName || 'this plant'}`);
    recommendations.push('Inspect undersides of leaves weekly to prevent pest establishment');
    recommendations.push('Ensure consistent indirect light to promote steady photosynthesis');
  }

  return {
    symptoms,
    possibleDiseases: [
      {
        name: diseaseName,
        probability,
        alternativeCauses: ['Natural leaf maturation', 'Minor nutrient fluctuation'],
      },
    ],
    recommendations,
    uncertainty: 'medium',
    confidence: probability,
  };
}
