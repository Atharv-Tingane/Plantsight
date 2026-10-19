import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
    },
    profile: {
      name: { type: String, default: 'Aisha Rahman' },
      email: { type: String, default: 'aisha@plantsight.demo' },
      location: { type: String, default: 'Dhaka, Bangladesh' },
      avatarUrl: { type: String, default: 'https://i.pravatar.cc/150?img=47' },
    },
    preferences: {
      lowSoilMoistureThreshold: { type: Number, default: 30 },
      highTemperatureThreshold: { type: Number, default: 32 },
      lowHumidityThreshold: { type: Number, default: 40 },
      lowLightThreshold: { type: Number, default: 800 },
      diseaseAlertsEnabled: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      measurementUnit: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model('Settings', settingsSchema);
