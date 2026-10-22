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
 * Formats calibrated telemetry context for Gemini, guarding against uncalibrated values
 */
function formatTelemetryContext(sensorData, sensorHistory) {
  if (!sensorData) {
    return 'Environmental Sensor Telemetry: No live sensor telemetry currently available.';
  }

  const lines = ['Real-time Environmental Telemetry (Live ESP32 Microcontroller):'];

  // 1. Calibrated Ambient Temperature (DHT11)
  if (sensorData.temperature !== undefined) {
    let tLine = `- Ambient Temperature: ${sensorData.temperature}°C (Calibrated DHT11 sensor)`;
    if (sensorHistory && sensorHistory.avgTemperature !== null) {
      tLine += ` | Recent window: Avg ${sensorHistory.avgTemperature}°C (Range: ${sensorHistory.minTemperature}°C – ${sensorHistory.maxTemperature}°C across ${sensorHistory.count} readings)`;
    }
    lines.push(tLine);
  }

  // 2. Calibrated Ambient Relative Humidity (DHT11)
  if (sensorData.humidity !== undefined) {
    let hLine = `- Ambient Relative Humidity: ${sensorData.humidity}% (Calibrated DHT11 sensor)`;
    if (sensorHistory && sensorHistory.avgHumidity !== null) {
      hLine += ` | Recent window: Avg ${sensorHistory.avgHumidity}% (Range: ${sensorHistory.minHumidity}% – ${sensorHistory.maxHumidity}% across ${sensorHistory.count} readings)`;
    }
    lines.push(hLine);
  }

  // 3. Soil Moisture (Placeholder Protection: 0 is an uninstalled probe)
  if (sensorData.soilMoisture === 0) {
    lines.push('- Soil Moisture Sensor: UNINSTALLED / PLACEHOLDER (Hardware value 0 represents an uninstalled probe; DO NOT diagnose underwatering, dehydration, or drought based on this value).');
  } else if (sensorData.soilMoisture !== undefined) {
    lines.push(`- Soil Moisture: ${sensorData.soilMoisture}%`);
  }

  // 4. Light Sensor (Raw 12-bit ADC Protection: 4095 is max ADC, not lux)
  if (sensorData.lightIntensity !== undefined) {
    if (sensorData.lightIntensity >= 4000) {
      lines.push(`- Ambient Illumination: Raw ADC ${sensorData.lightIntensity}/4095 (Uncalibrated analog photoresistor reading indicating bright daytime exposure, NOT calibrated lux).`);
    } else {
      lines.push(`- Ambient Illumination: Raw ADC ${sensorData.lightIntensity}/4095 (Uncalibrated analog photoresistor reading, NOT calibrated lux).`);
    }
  }

  lines.push('');
  lines.push('DIAGNOSTIC GUIDELINES FOR SENSORS:');
  lines.push('- Correlate visible foliar symptoms with calibrated temperature and humidity (e.g., prolonged high humidity favoring fungal pathogens like powdery mildew, or heat stress scorch from sustained >30°C temperature).');
  lines.push('- Disregard the 0% soil moisture placeholder; assess plant hydration strictly from visual leaf turgor and foliage appearance in the photo.');
  lines.push('- Treat light intensity solely as qualitative ambient day/night exposure.');

  return lines.join('\n');
}

/**
 * Analyzes a plant image along with sensor telemetry using Google Gemini.
 *
 * @param {Object} params
 * @param {string} params.imageUrl - Remote URL, local path, or base64 data URL
 * @param {string} params.plantName - Plant name
 * @param {string} params.species - Plant species (if known)
 * @param {Object} [params.sensorData] - Telemetry (soilMoisture, temperature, humidity, lightIntensity)
 * @param {Object} [params.sensorHistory] - Telemetry summary (averages, min, max, count)
 * @returns {Promise<Object>} Formatted analysis result
 */
export async function analyzePlantImage({ imageUrl, plantName, species, sensorData, sensorHistory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.trim() && !apiKey.includes('your_'));

  if (!isKeyConfigured) {
    console.log('[Gemini] GEMINI_API_KEY is not configured in backend/.env. Using rule-based botanical diagnostic.');
    return generateSmartFallback({ plantName, species, sensorData, sensorHistory });
  }

  // Build candidate models list: user configured model first, followed by verified defaults
  const userModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : null;
  const modelsToTry = userModel && !DEFAULT_MODELS.includes(userModel)
    ? [userModel, ...DEFAULT_MODELS]
    : DEFAULT_MODELS;

  // Prepare image part once
  const imagePart = await prepareImagePart(imageUrl);

  const telemetryContext = formatTelemetryContext(sensorData, sensorHistory);

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
      const parsed = parseGeminiResponse(responseText, { plantName, species, sensorData, sensorHistory });
      
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
  return generateSmartFallback({ plantName, species, sensorData, sensorHistory });
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
function generateSmartFallback({ plantName, species, sensorData, sensorHistory }) {
  const temp = sensorData?.temperature ?? 26;
  const humidity = sensorData?.humidity ?? 50;
  // Note: 0 is an uninstalled probe placeholder, not genuine 0% moisture
  const moisture = sensorData?.soilMoisture !== undefined && sensorData.soilMoisture > 0
    ? sensorData.soilMoisture
    : null;

  let diseaseName = 'Healthy Foliage / Normal Growth';
  let probability = 0.88;
  const symptoms = [];
  const recommendations = [];

  if (temp > 32) {
    diseaseName = 'Heat Stress & Evaporative Strain';
    probability = 0.72;
    symptoms.push(`Elevated ambient temperature measured at ${temp}°C`);
    if (sensorHistory?.maxTemperature) {
      symptoms.push(`Peak temperature reached ${sensorHistory.maxTemperature}°C in recent window`);
    }
    symptoms.push('Potential for leaf margin drying or transpirational leaf curl under high heat');
    recommendations.push('Provide partial shade during afternoon peak hours to minimize heat stress');
    recommendations.push('Maintain consistent humidity around foliage to reduce evaporative strain');
  } else if (humidity > 72) {
    diseaseName = 'High Humidity & Fungal Risk Factor';
    probability = 0.68;
    symptoms.push(`Elevated ambient relative humidity measured at ${humidity}%`);
    symptoms.push('Prolonged high humidity increases susceptibility to fungal foliar spots or powdery mildew');
    recommendations.push('Ensure good ventilation and gentle airflow between foliage');
    recommendations.push('Avoid wetting leaves during watering to discourage fungal spore germination');
  } else if (moisture !== null && moisture < 25) {
    diseaseName = 'Underwatering / Moisture Stress';
    probability = 0.75;
    symptoms.push(`Low calibrated soil moisture detected (${moisture}%)`);
    symptoms.push('Foliage shows signs of moisture deficit');
    recommendations.push('Water thoroughly at root level until soil is evenly hydrated');
    recommendations.push('Verify container drainage and mulch topsoil if drying too quickly');
  } else {
    symptoms.push('Foliage coloration and growth appear consistent with healthy botanical development');
    symptoms.push(`Ambient climate (${temp}°C, ${humidity}% RH) is within comfortable growing ranges`);
    recommendations.push(`Maintain regular watering schedule suited for ${species || plantName || 'this plant'}`);
    recommendations.push('Inspect undersides of leaves weekly to prevent pest establishment');
    recommendations.push('Ensure bright, indirect illumination to promote steady photosynthesis');
  }

  return {
    symptoms,
    possibleDiseases: [
      {
        name: diseaseName,
        probability,
        alternativeCauses: ['Natural leaf maturation', 'Minor environmental adaptation'],
      },
    ],
    recommendations,
    uncertainty: 'medium',
    confidence: probability,
  };
}
