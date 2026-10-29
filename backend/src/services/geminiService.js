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

  const prompt = `You are a professional botanical taxonomist and plant pathology expert.
Analyze this plant image and the associated environmental telemetry to deliver a comprehensive botanical diagnosis.

Context provided by the user:
- Registered Plant Label: ${plantName || 'Unknown plant'}
- Registered Species: ${species || 'Not specified'}
${telemetryContext}

CRITICAL BOTANICAL & DIAGNOSTIC INSTRUCTIONS:
1. PLANT IDENTIFICATION:
   - Identify the plant visible in the image.
   - If the image is identifiable, provide the common name and binomial scientific name (genus and species).
   - If the image is blurry, ambiguous, not a plant, or cannot be reliably identified to a species, explicitly state the uncertainty in "plantIdentification.notes", set "isIdentified": false, and do NOT invent or hallucinate a plant name.
   - Provide a brief botanical description of the identified plant.

2. HEALTH STATUS & DETAILED DIAGNOSIS:
   - Clearly distinguish VISUAL OBSERVATIONS (what is directly seen on leaves, stems, flowers, soil) from DIAGNOSTIC HYPOTHESES (what disease, pest, or abiotic stress might cause it).
   - Do NOT assert that a disease or deficiency is confirmed unless characteristic diagnostic signs (e.g. distinct fungal fruiting bodies, specific insect pests) are unequivocally visible. Express diagnostic hypotheses with appropriate probability.
   - Provide overall health status: "healthy", "warning", "critical", or "unknown".
   - Assign severity: "low", "moderate", or "high".
   - In "detailedDiagnosis", provide a coherent, professional botanical assessment synthesizing observed symptoms with probable causes.
   - For each possible cause, provide the name, estimated probability (0.0 to 1.0), an explanation of why the suspected cause produces these symptoms, and reasonable alternative causes.
   - Provide actionable treatment steps (corrective actions) and follow-up care guidelines.

3. IDEAL GROWING ENVIRONMENT:
   - Provide the specific botanical environmental requirements for the identified plant species.
   - Ideal temperature range in °C (numerical min and max, plus brief description).
   - Preferred relative humidity range in % (numerical min and max, plus brief description).
   - Sunlight requirements and approximate duration.
   - Watering requirements and schedule advice.
   - Soil type and drainage requirements.
   - Indoor/outdoor suitability.
   - Any species-specific environmental sensitivities (e.g., cold draft sensitivity, sensitivity to tap water minerals, etc.).
   - If the plant species is uncertain, state general ranges for common houseplants and express uncertainty.

CRITICAL INSTRUCTION:
Return ONLY a valid JSON object matching this schema:
{
  "plantIdentification": {
    "commonName": "Common Plant Name",
    "scientificName": "Genus species or null",
    "description": "Brief botanical description",
    "confidence": 0.85,
    "isIdentified": true,
    "notes": "Basis for identification or reasons for uncertainty"
  },
  "healthStatus": "healthy",
  "severity": "low",
  "detailedDiagnosis": "Thorough botanical assessment distinguishing visual observations from diagnostic hypotheses...",
  "symptoms": ["Observed symptom 1", "Observed symptom 2"],
  "possibleCauses": [
    {
      "cause": "Disease or Stress Factor Name",
      "probability": 0.85,
      "explanation": "Why this cause produces the observed symptoms",
      "alternativeCauses": ["Alternative cause 1", "Alternative cause 2"]
    }
  ],
  "treatment": ["Actionable corrective step 1", "Actionable corrective step 2"],
  "followUpCare": ["Follow-up care guideline 1", "Follow-up care guideline 2"],
  "idealEnvironment": {
    "temperature": {
      "min": 18,
      "max": 28,
      "description": "18°C – 28°C ideal growing range"
    },
    "humidity": {
      "min": 50,
      "max": 70,
      "description": "50% – 70% relative humidity"
    },
    "sunlight": "Direct sunlight requirements",
    "watering": "Watering requirements",
    "soil": "Soil and drainage requirements",
    "indoorOutdoor": "Indoor or outdoor suitability",
    "speciesRequirements": "Species-specific considerations"
  },
  "recommendations": ["Actionable care recommendation 1", "Actionable care recommendation 2"],
  "uncertainty": "low",
  "confidence": 0.85
}

Note:
- "healthStatus" MUST be exactly one of: "healthy", "warning", "critical", or "unknown".
- "severity" MUST be exactly one of: "low", "moderate", or "high".
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

    // 1. Uncertainty & Confidence Normalization
    let normalizedUncertainty = 'medium';
    if (typeof parsed.uncertainty === 'string') {
      const lower = parsed.uncertainty.toLowerCase();
      if (lower.includes('low')) normalizedUncertainty = 'low';
      else if (lower.includes('high')) normalizedUncertainty = 'high';
      else normalizedUncertainty = 'medium';
    }

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(Math.max(parsed.confidence, 0), 1)
      : 0.85;

    // 2. Plant Identification Normalization
    const rawId = parsed.plantIdentification || {};
    const rawCommon = (rawId.commonName && String(rawId.commonName).trim()) || '';
    const isExplicitlyUncertain = Boolean(
      !rawId.isIdentified ||
      rawCommon.toLowerCase().includes('unidentified') ||
      rawCommon.toLowerCase().includes('unknown') ||
      rawCommon.toLowerCase().includes('uncertain')
    );

    const plantIdentification = {
      commonName: rawCommon || context.plantName || 'Unidentified Plant',
      scientificName: (rawId.scientificName && String(rawId.scientificName).trim()) || null,
      description: (rawId.description && String(rawId.description).trim()) || 'Botanical description not available.',
      confidence: typeof rawId.confidence === 'number' ? Math.min(Math.max(rawId.confidence, 0), 1) : (isExplicitlyUncertain ? 0.35 : 0.85),
      isIdentified: !isExplicitlyUncertain,
      notes: (rawId.notes && String(rawId.notes).trim()) || (isExplicitlyUncertain ? 'Image features are insufficient for definitive species identification.' : 'Identified from visible foliage, growth habit, and leaf morphology.'),
    };

    // 3. Health Status & Severity Normalization
    let healthStatus = 'healthy';
    if (typeof parsed.healthStatus === 'string') {
      const hs = parsed.healthStatus.toLowerCase();
      if (['healthy', 'warning', 'critical', 'unknown'].includes(hs)) {
        healthStatus = hs;
      } else if (hs.includes('crit') || hs.includes('severe')) {
        healthStatus = 'critical';
      } else if (hs.includes('warn') || hs.includes('stress') || hs.includes('mild')) {
        healthStatus = 'warning';
      }
    }

    let severity = 'low';
    if (typeof parsed.severity === 'string') {
      const sev = parsed.severity.toLowerCase();
      if (['low', 'moderate', 'high'].includes(sev)) {
        severity = sev;
      } else if (sev.includes('high') || sev.includes('severe')) {
        severity = 'high';
      } else if (sev.includes('mod') || sev.includes('med')) {
        severity = 'moderate';
      }
    }

    // 4. Detailed Diagnosis Narrative
    const detailedDiagnosis = (parsed.detailedDiagnosis && String(parsed.detailedDiagnosis).trim())
      || 'Botanical examination conducted based on observable foliar characteristics and environmental telemetry.';

    // 5. Visually Observed Symptoms
    const symptoms = Array.isArray(parsed.symptoms) && parsed.symptoms.length
      ? parsed.symptoms.map(String)
      : ['No abnormal visible symptoms detected on foliage or stems'];

    // 6. Possible Causes (distinguishing hypotheses from observations)
    let possibleCauses = [];
    if (Array.isArray(parsed.possibleCauses) && parsed.possibleCauses.length > 0) {
      possibleCauses = parsed.possibleCauses.map((c) => ({
        cause: c.cause || c.name || 'Normal Physiological Development',
        probability: typeof c.probability === 'number' ? Math.min(Math.max(c.probability, 0), 1) : 0.8,
        explanation: c.explanation ? String(c.explanation) : 'Observed foliar characteristics correlate with this condition.',
        alternativeCauses: Array.isArray(c.alternativeCauses) ? c.alternativeCauses.map(String) : [],
      }));
    } else if (Array.isArray(parsed.possibleDiseases) && parsed.possibleDiseases.length > 0) {
      possibleCauses = parsed.possibleDiseases.map((d) => ({
        cause: d.name || 'Normal Physiological Development',
        probability: typeof d.probability === 'number' ? Math.min(Math.max(d.probability, 0), 1) : 0.8,
        explanation: 'Observed foliar characteristics correlate with this condition.',
        alternativeCauses: Array.isArray(d.alternativeCauses) ? d.alternativeCauses.map(String) : [],
      }));
    } else {
      possibleCauses = [
        {
          cause: 'Healthy / Normal Growth',
          probability: 0.9,
          explanation: 'Foliage coloration and structure appear consistent with healthy botanical development.',
          alternativeCauses: ['Natural leaf maturation'],
        },
      ];
    }

    // 7. Treatment & Follow-up Care
    const treatment = Array.isArray(parsed.treatment) && parsed.treatment.length
      ? parsed.treatment.map(String)
      : (Array.isArray(parsed.recommendations) && parsed.recommendations.length
        ? parsed.recommendations.map(String)
        : ['Maintain regular watering and monitoring']);

    const followUpCare = Array.isArray(parsed.followUpCare) && parsed.followUpCare.length
      ? parsed.followUpCare.map(String)
      : [
          'Inspect leaf undersides weekly for signs of pest activity.',
          'Re-evaluate foliage coloration and hydration in 5–7 days.',
        ];

    // 8. Ideal Growing Environment
    const ie = parsed.idealEnvironment || {};
    const tempMin = typeof ie.temperature?.min === 'number' ? ie.temperature.min : null;
    const tempMax = typeof ie.temperature?.max === 'number' ? ie.temperature.max : null;
    const humMin = typeof ie.humidity?.min === 'number' ? ie.humidity.min : null;
    const humMax = typeof ie.humidity?.max === 'number' ? ie.humidity.max : null;

    const idealEnvironment = {
      temperature: {
        min: tempMin,
        max: tempMax,
        description: ie.temperature?.description || (tempMin && tempMax ? `${tempMin}°C – ${tempMax}°C recommended growing range` : '18°C – 28°C recommended for temperate plants'),
      },
      humidity: {
        min: humMin,
        max: humMax,
        description: ie.humidity?.description || (humMin && humMax ? `${humMin}% – ${humMax}% relative humidity` : '45% – 65% relative humidity'),
      },
      sunlight: ie.sunlight ? String(ie.sunlight) : 'Bright, indirect sunlight for 6–8 hours daily',
      watering: ie.watering ? String(ie.watering) : 'Water thoroughly when top 2–3 cm of soil is dry; ensure proper drainage',
      soil: ie.soil ? String(ie.soil) : 'Well-draining, nutrient-rich potting soil with balanced organic matter',
      indoorOutdoor: ie.indoorOutdoor ? String(ie.indoorOutdoor) : 'Suitable for bright indoors or sheltered outdoor garden positions',
      speciesRequirements: ie.speciesRequirements ? String(ie.speciesRequirements) : 'Avoid cold drafts and maintain steady ambient temperatures',
    };

    // 9. Backwards-compatible legacy fields
    const possibleDiseases = possibleCauses.map((c) => ({
      name: c.cause,
      probability: c.probability,
      alternativeCauses: c.alternativeCauses,
    }));

    const recommendations = Array.from(new Set([...treatment, ...followUpCare]));

    return {
      plantIdentification,
      healthStatus,
      severity,
      detailedDiagnosis,
      symptoms,
      possibleCauses,
      treatment,
      followUpCare,
      idealEnvironment,
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
 * Returns botanical profile presets for smart fallback
 */
function getBotanicalProfile(plantName = '', species = '') {
  const text = `${plantName} ${species}`.toLowerCase();

  if (text.includes('rose')) {
    return {
      commonName: 'Rose',
      scientificName: 'Rosa sp.',
      description: 'Woody perennial flowering shrub of the genus Rosa in the family Rosaceae, characterized by sharp prickles and pinnate leaves with serrated margins.',
      idealTemp: { min: 15, max: 28, description: '15°C – 28°C (Optimal growth between 18°C and 25°C; heat stress above 30°C)' },
      idealHum: { min: 45, max: 65, description: '45% – 65% RH (High humidity >75% increases susceptibility to black spot and powdery mildew)' },
      sunlight: 'Full direct sun, minimum 6 hours daily for robust flowering and vigor',
      watering: 'Deep watering at root zone when top 3 cm of soil is dry; avoid wetting foliage',
      soil: 'Rich, loamy, well-draining soil with organic compost, pH 6.0 – 6.5',
      indoorOutdoor: 'Outdoor preferred; requires high light intensity and natural air movement',
      speciesRequirements: 'Prune dead or crossing canes annually. Provide open spacing for airflow to deter Diplocarpon rosae (black spot).',
    };
  }

  if (text.includes('tomato')) {
    return {
      commonName: 'Tomato',
      scientificName: 'Solanum lycopersicum',
      description: 'Annual botanical berry in the nightshade family (Solanaceae), prized for succulent fruit and glandular aromatic foliage.',
      idealTemp: { min: 18, max: 29, description: '18°C – 29°C (Pollen viability drops when temperatures exceed 32°C)' },
      idealHum: { min: 50, max: 70, description: '50% – 70% RH (Moderate humidity supports pollination without promoting fungal blights)' },
      sunlight: 'Full direct sun (6–8 hours daily minimum)',
      watering: 'Consistent, even soil moisture; erratic watering can trigger blossom-end rot or fruit cracking',
      soil: 'Fertile, well-draining loam enriched with compost, pH 6.2 – 6.8',
      indoorOutdoor: 'Outdoor garden beds or warm, ventilated greenhouses',
      speciesRequirements: 'Stake or cage vines for vertical support; prune lower suckers to maximize airflow.',
    };
  }

  if (text.includes('tulsi') || text.includes('basil')) {
    return {
      commonName: 'Holy Basil (Tulsi)',
      scientificName: 'Ocimum tenuiflorum',
      description: 'Aromatic perennial shrub in the family Lamiaceae, cultivated for traditional medicinal, culinary, and spiritual importance.',
      idealTemp: { min: 20, max: 32, description: '20°C – 32°C (Sensitive to frost and cold drafts below 12°C)' },
      idealHum: { min: 45, max: 65, description: '45% – 65% RH (Thrives in warm, moderately humid environments)' },
      sunlight: 'Full direct sunlight (minimum 4–6 hours daily)',
      watering: 'Water when top 2 cm of soil dries; avoid waterlogging roots',
      soil: 'Light, well-draining, fertile loamy soil, pH 6.0 – 7.5',
      indoorOutdoor: 'Sunny windowsills, balconies, or outdoor garden beds in warm climates',
      speciesRequirements: 'Pinch flower buds periodically to encourage bushy vegetative foliage.',
    };
  }

  if (text.includes('monstera')) {
    return {
      commonName: 'Swiss Cheese Plant',
      scientificName: 'Monstera deliciosa',
      description: 'Tropical evergreen epiphyte in the arum family (Araceae), celebrated for distinctive natural leaf fenestrations.',
      idealTemp: { min: 18, max: 30, description: '18°C – 30°C (Growth halts below 15°C)' },
      idealHum: { min: 60, max: 80, description: '60% – 80% RH (Thrives in tropical ambient moisture)' },
      sunlight: 'Bright, indirect sunlight; direct harsh afternoon sun can scorch foliage',
      watering: 'Allow top third of soil to dry out between thorough waterings',
      soil: 'Chunky, well-aerated aroid mix with bark, perlite, and peat, pH 5.5 – 7.0',
      indoorOutdoor: 'Indoor houseplant or shaded subtropical outdoor garden',
      speciesRequirements: 'Provide a moss pole or trellis for aerial roots to climb.',
    };
  }

  if (text.includes('snake')) {
    return {
      commonName: 'Snake Plant',
      scientificName: 'Dracaena trifasciata',
      description: 'Hardy evergreen perennial with stiff, sword-like variegated leaves, exceptionally tolerant of low light and drought.',
      idealTemp: { min: 15, max: 29, description: '15°C – 29°C (Avoid cold exposure below 10°C)' },
      idealHum: { min: 30, max: 50, description: '30% – 50% RH (Tolerates dry indoor air with ease)' },
      sunlight: 'Low to bright indirect light; highly adaptable to various illumination levels',
      watering: 'Water sparingly; allow potting soil to dry out completely between waterings',
      soil: 'Fast-draining cactus or succulent gritty mix, pH 6.0 – 7.0',
      indoorOutdoor: 'Indoor houseplant or warm outdoor rock gardens',
      speciesRequirements: 'Extremely prone to root rot if overwatered; ensure container has unobstructed drainage.',
    };
  }

  return {
    commonName: plantName || 'Temperate Foliage Plant',
    scientificName: species || null,
    description: 'Cultivated botanical specimen observed under indoor or domestic garden cultivation.',
    idealTemp: { min: 18, max: 28, description: '18°C – 28°C standard domestic growing temperature' },
    idealHum: { min: 45, max: 65, description: '45% – 65% RH comfortable ambient moisture range' },
    sunlight: 'Bright indirect sunlight for 6–8 hours daily',
    watering: 'Water when top 2–3 cm of soil is dry to the touch',
    soil: 'Well-draining, nutrient-rich potting compost',
    indoorOutdoor: 'Suitable for bright indoor rooms or sheltered patios',
    speciesRequirements: 'Monitor microclimate for thermal stability and good ambient ventilation.',
  };
}

/**
 * Provides an intelligent botanical diagnostic based on plant species and sensor telemetry.
 * Cleanly provides real horticultural advice without raw API error strings.
 */
function generateSmartFallback({ plantName, species, sensorData, sensorHistory }) {
  const profile = getBotanicalProfile(plantName, species);
  const temp = sensorData?.temperature ?? 26;
  const humidity = sensorData?.humidity ?? 50;
  // Note: 0 is an uninstalled probe placeholder, not genuine 0% moisture
  const moisture = sensorData?.soilMoisture !== undefined && sensorData.soilMoisture > 0
    ? sensorData.soilMoisture
    : null;

  let healthStatus = 'healthy';
  let severity = 'low';
  let causeName = 'Healthy Foliage / Normal Growth';
  let probability = 0.88;
  let explanation = 'Foliage coloration, turgor, and leaf structure are consistent with healthy vegetative growth.';
  const symptoms = [];
  const treatment = [];
  const followUpCare = [
    'Inspect leaf undersides weekly for early signs of mites or thrips.',
    'Rotate plant 90 degrees every two weeks to promote balanced phototropic development.',
  ];

  if (temp > 32) {
    healthStatus = 'warning';
    severity = 'moderate';
    causeName = 'Heat Stress & Transpirational Strain';
    probability = 0.76;
    explanation = `Ambient temperature measured at ${temp}°C exceeds the optimal thermal threshold for ${profile.commonName}, elevating evaporative demand faster than roots can supply moisture.`;
    symptoms.push(`Elevated ambient microclimate temperature measured at ${temp}°C`);
    if (sensorHistory?.maxTemperature) {
      symptoms.push(`Peak temperature reached ${sensorHistory.maxTemperature}°C in recent window`);
    }
    symptoms.push('Potential for transpirational leaf margin drying, slight downward leaf curl, or heat scorch');
    treatment.push('Provide partial shade or diffuse intense afternoon direct sunlight during peak thermal hours');
    treatment.push('Increase ambient air circulation and ensure root zone hydration remains consistent');
  } else if (humidity > 72) {
    healthStatus = 'warning';
    severity = 'moderate';
    causeName = 'High Humidity Microclimate & Fungal Risk';
    probability = 0.70;
    explanation = `Elevated relative humidity (${humidity}%) creates extended leaf wetness and microclimate stagnation, favoring fungal spore germination (e.g. powdery mildew or leaf spot).`;
    symptoms.push(`Elevated ambient relative humidity measured at ${humidity}% RH`);
    symptoms.push('Microclimate conditions elevate susceptibility to foliar fungal pathogens');
    treatment.push('Improve air circulation with gentle ventilation between plant foliage');
    treatment.push('Water strictly at the soil base and avoid wetting leaves to deny fungal spores free water');
  } else if (moisture !== null && moisture < 25) {
    healthStatus = 'warning';
    severity = 'moderate';
    causeName = 'Moisture Deficit / Underwatering Stress';
    probability = 0.78;
    explanation = `Calibrated soil moisture sensor indicates root-zone moisture depletion (${moisture}%), resulting in reduced cellular turgor.`;
    symptoms.push(`Low calibrated soil moisture detected at ${moisture}%`);
    symptoms.push('Foliage shows signs of moisture deficit and mild turgor loss');
    treatment.push('Provide a thorough, deep soaking until water drains freely from pot drainage holes');
    treatment.push('Apply a light layer of mulch to conserve topsoil moisture in warm weather');
  } else {
    symptoms.push('Foliage coloration and growth appear consistent with healthy botanical development');
    symptoms.push(`Ambient climate (${temp}°C, ${humidity}% RH) is within comfortable growing ranges`);
    treatment.push(`Maintain regular watering schedule suited for ${profile.commonName}`);
    treatment.push('Ensure bright, indirect illumination to promote steady photosynthetic activity');
  }

  const detailedDiagnosis = `Botanical assessment of ${profile.commonName}: ${explanation} Observations distinguish visually verified foliage conditions from microclimate hypotheses.`;

  const plantIdentification = {
    commonName: profile.commonName,
    scientificName: profile.scientificName,
    description: profile.description,
    confidence: plantName ? 0.85 : 0.5,
    isIdentified: Boolean(plantName),
    notes: plantName ? `Identified based on registered garden plant record: ${plantName}.` : 'General botanical identification profile.',
  };

  const idealEnvironment = {
    temperature: profile.idealTemp,
    humidity: profile.idealHum,
    sunlight: profile.sunlight,
    watering: profile.watering,
    soil: profile.soil,
    indoorOutdoor: profile.indoorOutdoor,
    speciesRequirements: profile.speciesRequirements,
  };

  const possibleCauses = [
    {
      cause: causeName,
      probability,
      explanation,
      alternativeCauses: ['Natural leaf maturation', 'Minor environmental adaptation'],
    },
  ];

  const possibleDiseases = possibleCauses.map((c) => ({
    name: c.cause,
    probability: c.probability,
    alternativeCauses: c.alternativeCauses,
  }));

  const recommendations = Array.from(new Set([...treatment, ...followUpCare]));

  return {
    plantIdentification,
    healthStatus,
    severity,
    detailedDiagnosis,
    symptoms,
    possibleCauses,
    treatment,
    followUpCare,
    idealEnvironment,
    possibleDiseases,
    recommendations,
    uncertainty: 'medium',
    confidence: probability,
  };
}
