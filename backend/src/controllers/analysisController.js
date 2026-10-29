import { Analysis } from '../models/Analysis.js';
import { Plant } from '../models/Plant.js';
import { SensorReading } from '../models/SensorReading.js';
import { Alert } from '../models/Alert.js';
import { uploadImage } from '../services/cloudinaryService.js';
import { analyzePlantImage } from '../services/geminiService.js';

/**
 * Builds a structured environmental comparison comparing live sensor telemetry
 * against the identified botanical ideal environment.
 */
function buildEnvironmentalComparison({ latestReading, idealEnvironment, plantName }) {
  if (!latestReading) {
    return {
      hasSensorData: false,
      sensorStatus: 'unavailable',
      timestamp: null,
      temperatureAssessment: {
        current: null,
        targetRange: idealEnvironment?.temperature?.description || '18°C – 28°C',
        status: 'unknown',
        isCalibrated: false,
        evaluation: 'No live or recent ESP32 sensor telemetry recorded for this plant.',
      },
      humidityAssessment: {
        current: null,
        targetRange: idealEnvironment?.humidity?.description || '45% – 65% RH',
        status: 'unknown',
        isCalibrated: false,
        evaluation: 'No live or recent ESP32 sensor telemetry recorded for this plant.',
      },
      soilMoistureAssessment: {
        current: null,
        targetRange: idealEnvironment?.watering || 'Evenly moist soil',
        status: 'uncalibrated',
        isCalibrated: false,
        evaluation: 'Soil moisture telemetry unavailable. Check soil moisture manually by feeling topsoil 2–3 cm deep.',
      },
      lightAssessment: {
        current: null,
        targetRange: idealEnvironment?.sunlight || 'Bright indirect to direct sun',
        status: 'unknown',
        isCalibrated: false,
        evaluation: 'Light sensor telemetry unavailable.',
      },
      parametersSummary: [
        {
          parameter: 'Temperature',
          currentValue: 'No data',
          targetValue: idealEnvironment?.temperature?.description || '18°C – 28°C',
          status: 'warning',
        },
        {
          parameter: 'Relative Humidity',
          currentValue: 'No data',
          targetValue: idealEnvironment?.humidity?.description || '45% – 65% RH',
          status: 'warning',
        },
        {
          parameter: 'Soil Moisture',
          currentValue: 'No data',
          targetValue: idealEnvironment?.watering || 'Evenly moist soil',
          status: 'uncalibrated',
        },
        {
          parameter: 'Ambient Light',
          currentValue: 'No data',
          targetValue: idealEnvironment?.sunlight || 'Bright indirect to direct sun',
          status: 'info',
        },
      ],
      practicalRecommendations: [
        'Connect an ESP32 microcontroller kit to stream live ambient microclimate telemetry.',
        `Follow general botanical growing guidelines for ${plantName || 'this plant'}.`,
      ],
    };
  }

  const readingDate = new Date(latestReading.timestamp);
  const ageHours = (Date.now() - readingDate.getTime()) / (1000 * 60 * 60);
  const isStale = ageHours > 24;
  const sensorStatus = isStale ? 'stale' : 'live';

  const practicalRecommendations = [];
  const parametersSummary = [];

  // 1. Temperature Assessment
  const curTemp = latestReading.temperature;
  const minTemp = idealEnvironment?.temperature?.min;
  const maxTemp = idealEnvironment?.temperature?.max;
  let tempStatus = 'optimal';
  let tempEval = '';

  if (minTemp != null && maxTemp != null) {
    if (curTemp < minTemp) {
      tempStatus = 'low';
      tempEval = `Current ambient temperature (${curTemp}°C) is below the recommended range (${minTemp}°C – ${maxTemp}°C). Prolonged cooler conditions can slow vegetative growth.`;
      practicalRecommendations.push(`Temperature is below optimal (${curTemp}°C vs minimum ${minTemp}°C). Consider moving ${plantName || 'the plant'} to a warmer, sheltered location away from cold drafts.`);
    } else if (curTemp > maxTemp) {
      tempStatus = 'high';
      tempEval = `Current ambient temperature (${curTemp}°C) exceeds the recommended threshold (${maxTemp}°C). High heat increases transpirational demand and evaporative stress on foliage.`;
      practicalRecommendations.push(`Ambient temperature is elevated (${curTemp}°C vs max ${maxTemp}°C). Provide afternoon shade or improve cross-ventilation to mitigate thermal stress.`);
    } else {
      tempStatus = 'optimal';
      tempEval = `Current ambient temperature (${curTemp}°C) is within the ideal growing range (${minTemp}°C – ${maxTemp}°C).`;
    }
  } else {
    tempEval = `Current ambient temperature is ${curTemp}°C (calibrated DHT11 sensor).`;
  }

  parametersSummary.push({
    parameter: 'Temperature',
    currentValue: `${curTemp}°C`,
    targetValue: minTemp != null && maxTemp != null ? `${minTemp}°C – ${maxTemp}°C` : (idealEnvironment?.temperature?.description || '18°C – 28°C'),
    status: tempStatus === 'optimal' ? 'optimal' : tempStatus === 'high' ? 'alert' : 'warning',
  });

  // 2. Humidity Assessment
  const curHum = latestReading.humidity;
  const minHum = idealEnvironment?.humidity?.min;
  const maxHum = idealEnvironment?.humidity?.max;
  let humStatus = 'optimal';
  let humEval = '';

  if (minHum != null && maxHum != null) {
    if (curHum < minHum) {
      humStatus = 'low';
      humEval = `Current relative humidity (${curHum}%) is lower than the preferred range (${minHum}% – ${maxHum}%). Dry ambient air accelerates transpirational moisture loss from leaves.`;
      practicalRecommendations.push(`Relative humidity is low (${curHum}% vs preferred ${minHum}%). Mist surrounding air or use a humidity tray if leaf tips show drying.`);
    } else if (curHum > maxHum) {
      humStatus = 'high';
      humEval = `Current relative humidity (${curHum}%) exceeds the optimal ceiling (${maxHum}%). Extended high ambient moisture with stagnant airflow increases vulnerability to foliar fungal pathogens.`;
      practicalRecommendations.push(`Ambient humidity is elevated (${curHum}% vs ceiling ${maxHum}%). Ensure adequate spacing between plants and gentle ventilation to discourage fungal spore proliferation.`);
    } else {
      humStatus = 'optimal';
      humEval = `Current relative humidity (${curHum}%) is well-aligned with the preferred growing range (${minHum}% – ${maxHum}%).`;
    }
  } else {
    humEval = `Current relative humidity is ${curHum}% (calibrated DHT11 sensor).`;
  }

  parametersSummary.push({
    parameter: 'Relative Humidity',
    currentValue: `${curHum}% RH`,
    targetValue: minHum != null && maxHum != null ? `${minHum}% – ${maxHum}%` : (idealEnvironment?.humidity?.description || '45% – 65% RH'),
    status: humStatus === 'optimal' ? 'optimal' : humStatus === 'high' ? 'warning' : 'warning',
  });

  // 3. Soil Moisture Assessment (Hardware Placeholder Protection: 0 is uninstalled)
  const rawMoisture = latestReading.soilMoisture;
  let isMoistureCalibrated = false;
  let moistureStatus = 'uncalibrated';
  let moistureEval = '';

  if (rawMoisture === 0) {
    isMoistureCalibrated = false;
    moistureStatus = 'uncalibrated';
    moistureEval = 'Raw sensor value (0) indicates an uninstalled or uncalibrated soil probe. DO NOT treat this as 0% moisture or drought stress; evaluate plant hydration strictly by manual soil touch and foliage turgor.';
  } else {
    isMoistureCalibrated = true;
    moistureStatus = rawMoisture < 25 ? 'low' : rawMoisture > 80 ? 'high' : 'optimal';
    moistureEval = `Calibrated soil moisture measured at ${rawMoisture}%.`;
  }

  parametersSummary.push({
    parameter: 'Soil Moisture',
    currentValue: rawMoisture === 0 ? '0 (Uncalibrated probe)' : `${rawMoisture}%`,
    targetValue: idealEnvironment?.watering || 'Evenly moist soil',
    status: 'uncalibrated',
  });

  // 4. Light Assessment (Raw ADC Protection: 4095 is ADC max saturation, not lux)
  const rawLight = latestReading.lightIntensity;
  let lightEval = '';
  if (rawLight >= 4000) {
    lightEval = `Raw 12-bit ADC reading (${rawLight}/4095) indicates strong ambient daylight exposure at the photoresistor. This is an uncalibrated analog signal, not calibrated lux.`;
  } else if (rawLight > 1000) {
    lightEval = `Raw 12-bit ADC reading (${rawLight}/4095) indicates moderate daytime ambient illumination (uncalibrated analog signal).`;
  } else {
    lightEval = `Raw 12-bit ADC reading (${rawLight}/4095) indicates low ambient illumination or shaded night conditions.`;
  }

  parametersSummary.push({
    parameter: 'Ambient Light',
    currentValue: `Raw ADC ${rawLight}/4095`,
    targetValue: idealEnvironment?.sunlight || 'Bright indirect to direct sun',
    status: 'info',
  });

  // Additional practical guidance
  practicalRecommendations.push('Check soil moisture manually by inserting a finger 2–3 cm into the potting mix before watering.');
  if (idealEnvironment?.speciesRequirements) {
    practicalRecommendations.push(idealEnvironment.speciesRequirements);
  }

  return {
    hasSensorData: true,
    sensorStatus,
    timestamp: latestReading.timestamp,
    temperatureAssessment: {
      current: curTemp,
      targetRange: minTemp != null && maxTemp != null ? `${minTemp}°C – ${maxTemp}°C` : (idealEnvironment?.temperature?.description || '18°C – 28°C'),
      status: tempStatus,
      isCalibrated: true,
      evaluation: tempEval,
    },
    humidityAssessment: {
      current: curHum,
      targetRange: minHum != null && maxHum != null ? `${minHum}% – ${maxHum}%` : (idealEnvironment?.humidity?.description || '45% – 65% RH'),
      status: humStatus,
      isCalibrated: true,
      evaluation: humEval,
    },
    soilMoistureAssessment: {
      current: rawMoisture,
      targetRange: idealEnvironment?.watering || 'Evenly moist soil',
      status: moistureStatus,
      isCalibrated: isMoistureCalibrated,
      evaluation: moistureEval,
    },
    lightAssessment: {
      current: rawLight,
      targetRange: idealEnvironment?.sunlight || 'Bright indirect to direct sun',
      status: 'qualitative',
      isCalibrated: false,
      evaluation: lightEval,
    },
    parametersSummary,
    practicalRecommendations,
  };
}

// GET /analysis
export async function listAnalyses(req, res, next) {
  try {
    const { plantId } = req.query;
    const query = {};
    if (plantId) query.plantId = plantId;

    const analyses = await Analysis.find(query).sort({ createdAt: -1 });
    res.json(analyses);
  } catch (err) {
    next(err);
  }
}

// POST /analysis/analyze
export async function runAnalysis(req, res, next) {
  try {
    let { plantId, image } = req.body;

    // Handle multipart upload if sent via multer
    if (req.file) {
      const mimeType = req.file.mimetype;
      image = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    }

    if (!image) {
      return res.status(400).json({ status: 'error', message: 'Plant image is required.' });
    }

    if (!plantId) {
      const firstPlant = await Plant.findOne();
      if (firstPlant) {
        plantId = firstPlant._id.toString();
      } else {
        return res.status(400).json({ status: 'error', message: 'plantId is required.' });
      }
    }

    // Find the plant
    const plant = await Plant.findById(plantId);
    const plantName = plant ? plant.name : 'Unknown Plant';
    const species = plant ? plant.species : '';

    // Fetch latest genuine sensor reading for this plant (with fallback to latest real reading if unassigned)
    const realFilter = { isSimulated: { $ne: true }, source: { $ne: 'simulated' } };
    let latestReading = await SensorReading.findOne({ plantId, ...realFilter }).sort({ timestamp: -1 });
    if (!latestReading) {
      latestReading = await SensorReading.findOne(realFilter).sort({ timestamp: -1 });
    }

    let sensorData = null;
    let sensorHistory = null;

    if (latestReading) {
      sensorData = {
        soilMoisture: latestReading.soilMoisture,
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        lightIntensity: latestReading.lightIntensity,
      };

      // Retrieve recent readings to compute microclimate averages and range
      const historyQuery = {
        plantId: latestReading.plantId,
        ...realFilter,
      };
      const recentReadings = await SensorReading.find(historyQuery)
        .sort({ timestamp: -1 })
        .limit(20);

      if (recentReadings.length > 0) {
        const temps = recentReadings.map((r) => r.temperature).filter((t) => typeof t === 'number');
        const humidities = recentReadings.map((r) => r.humidity).filter((h) => typeof h === 'number');

        const avgTemp = temps.length
          ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
          : null;
        const minTemp = temps.length ? Math.min(...temps) : null;
        const maxTemp = temps.length ? Math.max(...temps) : null;

        const avgHum = humidities.length
          ? Math.round((humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10) / 10
          : null;
        const minHum = humidities.length ? Math.min(...humidities) : null;
        const maxHum = humidities.length ? Math.max(...humidities) : null;

        sensorHistory = {
          count: recentReadings.length,
          avgTemperature: avgTemp,
          minTemperature: minTemp,
          maxTemperature: maxTemp,
          avgHumidity: avgHum,
          minHumidity: minHum,
          maxHumidity: maxHum,
        };
      }
    }

    // 1. Run Cloudinary upload and Gemini AI analysis in parallel for optimal response time
    const [uploadedUrl, aiResult] = await Promise.all([
      uploadImage(image, 'plantsight/analyses'),
      analyzePlantImage({
        imageUrl: image, // pass full data URI or URL for vision prompt
        plantName,
        species,
        sensorData,
        sensorHistory,
      }),
    ]);

    // 2. Perform sensor telemetry comparison against ideal botanical environment
    const environmentalComparison = buildEnvironmentalComparison({
      latestReading,
      idealEnvironment: aiResult.idealEnvironment,
      plantName,
    });

    // 3. Persist Analysis result in MongoDB
    const analysisDoc = await Analysis.create({
      plantId,
      plantName,
      imageUrl: uploadedUrl,
      symptoms: aiResult.symptoms,
      possibleDiseases: aiResult.possibleDiseases,
      recommendations: aiResult.recommendations,
      uncertainty: aiResult.uncertainty,
      confidence: aiResult.confidence,
      sensorSnapshot: sensorData
        ? {
            ...sensorData,
            avgTemperature: sensorHistory?.avgTemperature,
            avgHumidity: sensorHistory?.avgHumidity,
            readingCount: sensorHistory?.count,
          }
        : undefined,
      plantIdentification: aiResult.plantIdentification,
      healthStatus: aiResult.healthStatus,
      severity: aiResult.severity,
      detailedDiagnosis: aiResult.detailedDiagnosis,
      possibleCauses: aiResult.possibleCauses,
      treatment: aiResult.treatment,
      followUpCare: aiResult.followUpCare,
      idealEnvironment: aiResult.idealEnvironment,
      environmentalComparison,
      createdAt: new Date(),
    });

    // 4. If disease probability is significant, trigger a disease alert
    const topDisease = aiResult.possibleDiseases[0];
    if (topDisease && topDisease.probability > 0.65 && !topDisease.name.toLowerCase().includes('normal') && !topDisease.name.toLowerCase().includes('healthy')) {
      await Alert.create({
        plantId,
        plantName,
        severity: topDisease.probability > 0.8 ? 'high' : 'medium',
        category: 'disease',
        title: `Possible disease: ${topDisease.name}`,
        message: `AI analysis detected ${topDisease.name} (${Math.round(topDisease.probability * 100)}% match). Recommendations: ${aiResult.recommendations.slice(0, 2).join(' ')}`,
        acknowledged: false,
      }).catch((e) => console.warn('[Analysis] Could not create disease alert:', e.message));
    }

    res.status(201).json(analysisDoc);
  } catch (err) {
    next(err);
  }
}
