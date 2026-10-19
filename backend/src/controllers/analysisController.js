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

    // Fetch latest sensor readings for this plant to provide context to Gemini
    const latestReading = await SensorReading.findOne({ plantId }).sort({ timestamp: -1 });
    const sensorData = latestReading
      ? {
          soilMoisture: latestReading.soilMoisture,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          lightIntensity: latestReading.lightIntensity,
        }
      : null;

    // 1. Upload image to Cloudinary (or local fallback)
    const uploadedUrl = await uploadImage(image, 'plantsight/analyses');

    // 2. Call Gemini for AI botanical diagnosis
    const aiResult = await analyzePlantImage({
      imageUrl: image, // pass full data URI or URL for vision prompt
      plantName,
      species,
      sensorData,
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
      sensorSnapshot: sensorData || undefined,
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
