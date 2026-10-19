import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Plant } from '../models/Plant.js';
import { SensorReading } from '../models/SensorReading.js';
import { Alert } from '../models/Alert.js';
import { Analysis } from '../models/Analysis.js';
import { Settings } from '../models/Settings.js';
import { GalleryImage } from '../models/GalleryImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function seedDatabase(force = false) {
  try {
    const plantCount = await Plant.countDocuments();
    if (plantCount > 0 && !force) {
      console.log(`[Database] Already contains ${plantCount} plants. Skipping auto-seed.`);
      return;
    }

    if (force) {
      console.log('[Seed] Force seeding: clearing existing data...');
      await Promise.all([
        Plant.deleteMany(),
        SensorReading.deleteMany(),
        Alert.deleteMany(),
        Analysis.deleteMany(),
        Settings.deleteMany(),
        GalleryImage.deleteMany(),
      ]);
    }

    console.log('[Seed] Seeding initial PlantSight database...');

    // 1. Seed Plants
    const plants = await Plant.create([
      {
        name: 'Basil',
        species: 'Ocimum basilicum',
        location: 'Kitchen windowsill',
        imageUrl: 'https://images.pexels.com/photos/1004584/pexels-photo-1004584.jpeg?auto=compress&cs=tinysrgb&w=800',
        healthStatus: 'healthy',
        healthScore: 92,
        notes: 'Potted herb, watered every other day.',
      },
      {
        name: 'Monstera',
        species: 'Monstera deliciosa',
        location: 'Living room corner',
        imageUrl: 'https://images.pexels.com/photos/3094208/pexels-photo-3094208.jpeg?auto=compress&cs=tinysrgb&w=800',
        healthStatus: 'warning',
        healthScore: 71,
        notes: 'Leaves yellowing slightly; monitor watering.',
      },
      {
        name: 'Snake Plant',
        species: 'Sansevieria trifasciata',
        location: 'Bedroom',
        imageUrl: 'https://images.pexels.com/photos/2125247/pexels-photo-2125247.jpeg?auto=compress&cs=tinysrgb&w=800',
        healthStatus: 'healthy',
        healthScore: 88,
      },
      {
        name: 'Tomato',
        species: 'Solanum lycopersicum',
        location: 'Balcony planter',
        imageUrl: 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=800',
        healthStatus: 'critical',
        healthScore: 38,
        notes: 'Leaf curl and brown spots observed.',
      },
      {
        name: 'Aloe Vera',
        species: 'Aloe barbadensis',
        location: 'Study desk',
        imageUrl: 'https://images.pexels.com/photos/4096385/pexels-photo-4096385.jpeg?auto=compress&cs=tinysrgb&w=800',
        healthStatus: 'healthy',
        healthScore: 95,
      },
    ]);

    // 2. Seed 24 hourly sensor readings per plant (labeled DEMO DATA / isSimulated: true)
    const readings = [];
    const now = Date.now();

    plants.forEach((plant, pIdx) => {
      const plantId = plant._id.toString();
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000);
        const base = {
          soil: 55 + Math.sin(i / 4 + pIdx) * 12,
          temp: 23 + Math.sin(i / 6 + pIdx) * 4,
          hum: 60 + Math.cos(i / 5 + pIdx) * 8,
          light: 4000 + Math.max(0, Math.sin((12 - i) / 4)) * 6000,
        };

        readings.push({
          plantId,
          timestamp,
          soilMoisture: Math.round(base.soil + pIdx * 1.5),
          temperature: Math.round((base.temp + pIdx * 0.4) * 10) / 10,
          humidity: Math.round(base.hum - pIdx),
          lightIntensity: Math.round(Math.max(0, base.light)),
          isSimulated: true,
          source: 'simulated',
        });
      }
    });

    await SensorReading.insertMany(readings);

    // 3. Seed Alerts
    const tomato = plants.find((p) => p.name === 'Tomato');
    const monstera = plants.find((p) => p.name === 'Monstera');
    const basil = plants.find((p) => p.name === 'Basil');
    const snake = plants.find((p) => p.name === 'Snake Plant');

    await Alert.create([
      {
        plantId: tomato ? tomato._id.toString() : plants[0]._id.toString(),
        plantName: 'Tomato',
        severity: 'high',
        category: 'disease',
        title: 'Possible disease detected',
        message: 'AI analysis flagged brown leaf spots with concentric rings. Possible early blight.',
        acknowledged: false,
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
      },
      {
        plantId: monstera ? monstera._id.toString() : plants[1]._id.toString(),
        plantName: 'Monstera',
        severity: 'medium',
        category: 'soil',
        title: 'Low soil moisture',
        message: 'Soil moisture dropped to 24%. Consider watering soon.',
        acknowledged: false,
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
      },
      {
        plantId: tomato ? tomato._id.toString() : plants[0]._id.toString(),
        plantName: 'Tomato',
        severity: 'medium',
        category: 'temperature',
        title: 'High temperature',
        message: 'Balcony temperature reached 33°C. Move plant or provide shade.',
        acknowledged: true,
        createdAt: new Date(now - 20 * 60 * 60 * 1000),
      },
      {
        plantId: basil ? basil._id.toString() : plants[2]._id.toString(),
        plantName: 'Basil',
        severity: 'low',
        category: 'humidity',
        title: 'Low humidity',
        message: 'Humidity at 38%. Basil prefers 50-65%.',
        acknowledged: true,
        createdAt: new Date(now - 24 * 60 * 60 * 1000),
      },
      {
        plantId: snake ? snake._id.toString() : plants[3]._id.toString(),
        plantName: 'Snake Plant',
        severity: 'low',
        category: 'light',
        title: 'Low light exposure',
        message: 'Light intensity below 800 lux for 6 hours.',
        acknowledged: false,
        createdAt: new Date(now - 36 * 60 * 60 * 1000),
      },
    ]);

    // 4. Seed Analyses
    if (tomato) {
      await Analysis.create({
        plantId: tomato._id.toString(),
        plantName: 'Tomato',
        imageUrl: tomato.imageUrl,
        createdAt: new Date(now - 4 * 60 * 60 * 1000),
        symptoms: [
          'Brown circular spots with concentric rings on lower leaves',
          'Yellowing around affected areas',
          'Slight leaf curl at edges',
        ],
        possibleDiseases: [
          {
            name: 'Early Blight (Alternaria solani)',
            probability: 0.78,
            alternativeCauses: ['Septoria leaf spot', 'Nutrient deficiency (magnesium)'],
          },
          {
            name: 'Septoria Leaf Spot',
            probability: 0.14,
            alternativeCauses: ['Fungal infection from overhead watering'],
          },
        ],
        recommendations: [
          'Remove and dispose of affected lower leaves',
          'Avoid overhead watering; water at the base',
          'Apply an organic copper fungicide if symptoms spread',
          'Improve air circulation around the plant',
        ],
        uncertainty: 'medium',
        confidence: 0.78,
      });
    }

    if (monstera) {
      await Analysis.create({
        plantId: monstera._id.toString(),
        plantName: 'Monstera',
        imageUrl: monstera.imageUrl,
        createdAt: new Date(now - 48 * 60 * 60 * 1000),
        symptoms: ['Mild yellowing of older leaves', 'Slight drooping'],
        possibleDiseases: [
          {
            name: 'Overwatering stress',
            probability: 0.62,
            alternativeCauses: ['Natural aging of lower leaves', 'Low light'],
          },
        ],
        recommendations: [
          'Allow top 5cm of soil to dry before next watering',
          'Check that drainage holes are not obstructed',
        ],
        uncertainty: 'low',
        confidence: 0.62,
      });
    }

    // 5. Seed Settings
    await Settings.create({
      key: 'default',
      profile: {
        name: 'Aisha Rahman',
        email: 'aisha@plantsight.demo',
        location: 'Dhaka, Bangladesh',
        avatarUrl: 'https://i.pravatar.cc/150?img=47',
      },
      preferences: {
        lowSoilMoistureThreshold: 30,
        highTemperatureThreshold: 32,
        lowHumidityThreshold: 40,
        lowLightThreshold: 800,
        diseaseAlertsEnabled: true,
        emailNotifications: true,
        measurementUnit: 'metric',
      },
    });

    console.log(`[Seed] Successfully seeded ${plants.length} plants, ${readings.length} sensor readings, alerts, and settings.`);
  } catch (err) {
    console.error('[Seed] Seeding failed:', err.message);
  }
}

// If run directly from command line (e.g. node src/scripts/seed.js)
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantsight';
  mongoose
    .connect(uri)
    .then(async () => {
      console.log('[Seed] Connected to MongoDB.');
      await seedDatabase(true);
      await mongoose.disconnect();
      console.log('[Seed] Disconnected from MongoDB. Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Database connection error:', err.message);
      process.exit(1);
    });
}
