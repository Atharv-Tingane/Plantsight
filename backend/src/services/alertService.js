import mongoose from 'mongoose';
import { Alert } from '../models/Alert.js';
import { Plant } from '../models/Plant.js';
import { Settings } from '../models/Settings.js';

/**
 * Checks sensor reading against configured thresholds,
 * generates alerts if necessary, and updates plant health status/score.
 *
 * @param {Object} reading - Sensor reading document
 */
export async function evaluateReadingAlerts(reading) {
  try {
    // If database connection is not active, skip evaluation
    if (mongoose.connection.readyState !== 1) return;

    const { plantId, soilMoisture, temperature, humidity, lightIntensity } = reading;

    // Find plant
    const plant = await Plant.findById(plantId).catch(() => null);
    if (!plant) return;

    // Load preferences
    const settingsDoc = await Settings.findOne({ key: 'default' });
    const prefs = settingsDoc?.preferences || {
      lowSoilMoistureThreshold: 30,
      highTemperatureThreshold: 32,
      lowHumidityThreshold: 40,
      lowLightThreshold: 800,
    };

    const newAlerts = [];
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 1. Soil moisture check
    if (soilMoisture < prefs.lowSoilMoistureThreshold) {
      const existing = await Alert.findOne({
        plantId,
        category: 'soil',
        acknowledged: false,
        createdAt: { $gte: thirtyMinutesAgo },
      });

      if (!existing) {
        newAlerts.push({
          plantId,
          plantName: plant.name,
          category: 'soil',
          severity: soilMoisture < prefs.lowSoilMoistureThreshold - 15 ? 'high' : 'medium',
          title: 'Low soil moisture',
          message: `Soil moisture dropped to ${soilMoisture}%. Consider watering ${plant.name} soon.`,
          acknowledged: false,
        });
      }
    }

    // 2. Temperature check
    if (temperature > prefs.highTemperatureThreshold) {
      const existing = await Alert.findOne({
        plantId,
        category: 'temperature',
        acknowledged: false,
        createdAt: { $gte: thirtyMinutesAgo },
      });

      if (!existing) {
        newAlerts.push({
          plantId,
          plantName: plant.name,
          category: 'temperature',
          severity: temperature > prefs.highTemperatureThreshold + 5 ? 'high' : 'medium',
          title: 'High temperature',
          message: `Ambient temperature reached ${temperature}°C. Consider moving ${plant.name} or providing shade.`,
          acknowledged: false,
        });
      }
    }

    // 3. Humidity check
    if (humidity < prefs.lowHumidityThreshold) {
      const existing = await Alert.findOne({
        plantId,
        category: 'humidity',
        acknowledged: false,
        createdAt: { $gte: thirtyMinutesAgo },
      });

      if (!existing) {
        newAlerts.push({
          plantId,
          plantName: plant.name,
          category: 'humidity',
          severity: 'low',
          title: 'Low humidity',
          message: `Humidity dropped to ${humidity}%. ${plant.name} prefers higher ambient humidity.`,
          acknowledged: false,
        });
      }
    }

    // 4. Light check
    if (lightIntensity < prefs.lowLightThreshold) {
      const existing = await Alert.findOne({
        plantId,
        category: 'light',
        acknowledged: false,
        createdAt: { $gte: thirtyMinutesAgo },
      });

      if (!existing) {
        newAlerts.push({
          plantId,
          plantName: plant.name,
          category: 'light',
          severity: 'low',
          title: 'Low light exposure',
          message: `Light intensity measured at ${lightIntensity} lux. Ensure adequate illumination.`,
          acknowledged: false,
        });
      }
    }

    if (newAlerts.length > 0) {
      await Alert.insertMany(newAlerts);
    }

    // Update plant health score and status
    let healthScore = 100;
    if (soilMoisture < prefs.lowSoilMoistureThreshold) healthScore -= 20;
    if (soilMoisture < prefs.lowSoilMoistureThreshold - 15) healthScore -= 25;
    if (temperature > prefs.highTemperatureThreshold) healthScore -= 15;
    if (temperature > prefs.highTemperatureThreshold + 5) healthScore -= 20;
    if (humidity < prefs.lowHumidityThreshold) healthScore -= 10;
    if (lightIntensity < prefs.lowLightThreshold) healthScore -= 10;

    healthScore = Math.max(10, Math.min(100, healthScore));

    let healthStatus = 'healthy';
    if (healthScore < 50) {
      healthStatus = 'critical';
    } else if (healthScore < 80) {
      healthStatus = 'warning';
    }

    plant.healthScore = healthScore;
    plant.healthStatus = healthStatus;
    await plant.save();
  } catch (err) {
    console.error('[AlertService] Error evaluating alerts:', err.message);
  }
}
