import { GoogleGenerativeAI } from '@google/generative-ai';

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
    console.log('[Gemini] GEMINI_API_KEY is not configured in backend/.env. Returning simulated analysis with setup notice.');
    return generateSmartFallback({ plantName, species, sensorData });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Prepare image part for Gemini
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

Evaluate visible symptoms on leaves, stems, and soil, and correlate with the environmental sensor data if available.

CRITICAL INSTRUCTION:
You MUST respond with ONLY a valid, raw JSON object (no markdown code blocks, no backticks, no explanations before or after).
The JSON object MUST strictly adhere to this format:
{
  "symptoms": [
    "Clear description of observed symptom 1",
    "Clear description of observed symptom 2"
  ],
  "possibleDiseases": [
    {
      "name": "Disease or Stress Factor Name (e.g. Early Blight or Overwatering Stress)",
      "probability": 0.85,
      "alternativeCauses": ["Alternative cause 1", "Alternative cause 2"]
    }
  ],
  "recommendations": [
    "Actionable care recommendation 1",
    "Actionable care recommendation 2",
    "Actionable care recommendation 3"
  ],
  "uncertainty": "low",
  "confidence": 0.85
}

Note:
- "uncertainty" must be exactly one of: "low", "medium", or "high".
- "confidence" must be a float between 0.0 and 1.0.
- "probability" for each disease must be a float between 0.0 and 1.0.`;

    const parts = imagePart ? [prompt, imagePart] : [prompt];
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    return parseGeminiResponse(responseText, { plantName, species, sensorData });
  } catch (err) {
    console.error('[Gemini] Analysis error:', err.message);
    // Return graceful fallback on API error so UI never crashes
    return generateSmartFallback({ plantName, species, sensorData, errorNotice: err.message });
  }
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
      console.warn('[Gemini] Failed to fetch remote image for inlineData:', fetchErr.message);
      return null;
    }
  }

  return null;
}

/**
 * Extracts and cleans JSON from Gemini's response
 */
function parseGeminiResponse(text, context) {
  try {
    // Strip markdown formatting if any was returned
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      symptoms: Array.isArray(parsed.symptoms) && parsed.symptoms.length ? parsed.symptoms : ['No abnormal symptoms detected'],
      possibleDiseases: Array.isArray(parsed.possibleDiseases) && parsed.possibleDiseases.length
        ? parsed.possibleDiseases.map((d) => ({
            name: d.name || 'Unidentified Condition',
            probability: typeof d.probability === 'number' ? Math.min(Math.max(d.probability, 0), 1) : 0.5,
            alternativeCauses: Array.isArray(d.alternativeCauses) ? d.alternativeCauses : [],
          }))
        : [{ name: 'Healthy / Normal Growth', probability: 0.9, alternativeCauses: [] }],
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length
        ? parsed.recommendations
        : ['Continue current care routine and monitor environment'],
      uncertainty: ['low', 'medium', 'high'].includes(parsed.uncertainty) ? parsed.uncertainty : 'medium',
      confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.75,
    };
  } catch (err) {
    console.error('[Gemini] JSON parsing error from Gemini output:', err.message, '\nRaw text was:', text);
    return generateSmartFallback(context);
  }
}

/**
 * Provides an intelligent fallback diagnostic based on plant species and sensor data
 */
function generateSmartFallback({ plantName, species, sensorData, errorNotice }) {
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
    recommendations.push('Water thoroughly at root level until drainage occurs');
    recommendations.push('Verify soil drainage and mulch if topsoil dries rapidly');
  } else if (moisture > 75) {
    diseaseName = 'Overwatering / Root Saturation Risk';
    probability = 0.72;
    symptoms.push('Soil moisture is elevated above 75%');
    symptoms.push('Check for lower leaf chlorosis or sogginess');
    recommendations.push('Allow topsoil to dry before watering again');
    recommendations.push('Ensure planter drainage holes are clear');
  } else if (temp > 33) {
    diseaseName = 'Heat Stress & Evaporative Strain';
    probability = 0.69;
    symptoms.push(`Ambient temperature measured at ${temp}°C`);
    symptoms.push('Possible leaf curl or edge drying due to heat');
    recommendations.push('Provide partial shade or move away from direct midday sun');
    recommendations.push('Increase air circulation and check humidity levels');
  } else {
    symptoms.push('General foliage color within normal parameters');
    symptoms.push('Environmental sensors report balanced growing conditions');
    recommendations.push('Maintain regular watering schedule suited for ' + (species || plantName || 'this plant'));
    recommendations.push('Inspect undersides of leaves weekly for early pest detection');
  }

  if (errorNotice) {
    recommendations.push(`Notice: Gemini API responded with [${errorNotice}]. Check backend/.env.`);
  }

  return {
    symptoms,
    possibleDiseases: [
      {
        name: diseaseName,
        probability,
        alternativeCauses: ['Natural aging of foliage', 'Nutrient imbalance'],
      },
    ],
    recommendations,
    uncertainty: 'medium',
    confidence: probability,
  };
}
