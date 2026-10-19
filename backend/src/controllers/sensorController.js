import { SensorReading } from '../models/SensorReading.js';
import { Plant } from '../models/Plant.js';
import { evaluateReadingAlerts } from '../services/alertService.js';

// GET /sensors/latest
export async function getLatestReadings(req, res, next) {
  try {
    const { plantId } = req.query;

    if (plantId) {
      const latest = await SensorReading.findOne({ plantId }).sort({ timestamp: -1 });
      return res.json(latest ? [latest] : []);
    }

    // For all plants, find latest reading per plant
    const plants = await Plant.find().select('_id');
    const results = await Promise.all(
      plants.map(async (p) => {
        const idStr = p._id.toString();
        return SensorReading.findOne({ plantId: idStr }).sort({ timestamp: -1 });
      })
    );

    const filtered = results.filter(Boolean);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
}

// GET /sensors/history
export async function getSensorHistory(req, res, next) {
  try {
    const { plantId, from, to, range, limit } = req.query;
    const query = {};

    if (plantId && plantId !== 'all') {
      query.plantId = plantId;
    }

    const now = Date.now();
    if (range) {
      const rangeMsMap = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      if (rangeMsMap[range]) {
        query.timestamp = { $gte: new Date(now - rangeMsMap[range]) };
      }
    } else if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const maxLimit = limit ? Math.min(Number(limit), 1000) : 500;
    const readings = await SensorReading.find(query)
      .sort({ timestamp: 1 })
      .limit(maxLimit);

    res.json(readings);
  } catch (err) {
    next(err);
  }
}

// POST /sensors/reading (ESP32 ingestion endpoint)
export async function recordReading(req, res, next) {
  try {
    // Support body or query params for flexible microcontrollers
    const data = req.method === 'GET' ? req.query : req.body;
    let { plantId, soilMoisture, temperature, humidity, lightIntensity, isSimulated, source } = data;

    if (!plantId) {
      // If plantId not specified, associate with first registered plant
      const firstPlant = await Plant.findOne();
      if (firstPlant) {
        plantId = firstPlant._id.toString();
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'No plants exist. Please create a plant first before recording telemetry.',
        });
      }
    }

    if (soilMoisture === undefined || temperature === undefined || humidity === undefined || lightIntensity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'soilMoisture, temperature, humidity, and lightIntensity are all required.',
      });
    }

    const isSim = Boolean(isSimulated === true || isSimulated === 'true');

    const reading = await SensorReading.create({
      plantId: String(plantId),
      soilMoisture: Number(soilMoisture),
      temperature: Number(temperature),
      humidity: Number(humidity),
      lightIntensity: Number(lightIntensity),
      isSimulated: isSim,
      source: isSim ? 'simulated' : (source || 'esp32'),
      timestamp: new Date(),
    });

    // Trigger alert evaluation & update plant health score asynchronously
    evaluateReadingAlerts(reading);

    res.status(201).json({
      status: 'success',
      message: isSim ? 'Simulated reading stored (DEMO DATA)' : 'ESP32 sensor reading stored successfully',
      data: reading,
    });
  } catch (err) {
    next(err);
  }
}

// POST /sensors/simulate (Explicit simulation helper for demonstration)
export async function simulateReadings(req, res, next) {
  try {
    const plants = await Plant.find();
    if (plants.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No plants available to simulate readings for.',
      });
    }

    const createdReadings = [];
    const now = Date.now();

    for (const plant of plants) {
      // Generate a realistic telemetry point
      const baseSoil = 45 + Math.random() * 25;
      const baseTemp = 22 + Math.random() * 8;
      const baseHum = 50 + Math.random() * 20;
      const baseLight = 2000 + Math.random() * 5000;

      const reading = await SensorReading.create({
        plantId: plant._id.toString(),
        soilMoisture: Math.round(baseSoil * 10) / 10,
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: Math.round(baseHum * 10) / 10,
        lightIntensity: Math.round(baseLight),
        isSimulated: true,
        source: 'simulated',
        timestamp: new Date(now),
      });

      evaluateReadingAlerts(reading);
      createdReadings.push(reading);
    }

    res.status(201).json({
      status: 'success',
      notice: 'DEMO DATA: These readings are simulated.',
      count: createdReadings.length,
      data: createdReadings,
    });
  } catch (err) {
    next(err);
  }
}
