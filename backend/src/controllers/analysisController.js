import { Analysis } from '../models/Analysis.js';
import { Plant } from '../models/Plant.js';
import { SensorReading } from '../models/SensorReading.js';
import { Alert } from '../models/Alert.js';
import { uploadImage } from '../services/cloudinaryService.js';
import { analyzePlantImage } from '../services/geminiService.js';

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
