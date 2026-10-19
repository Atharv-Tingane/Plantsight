import mongoose from 'mongoose';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

export function getHealth(_req, res) {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() &&
    !process.env.GEMINI_API_KEY.includes('your_')
  );

  res.json({
    status: 'ok',
    service: 'PlantSight Backend API',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: dbState === 1,
    },
    services: {
      geminiAi: hasGemini ? 'configured' : 'missing_api_key',
      cloudinary: isCloudinaryConfigured ? 'configured' : 'fallback_local',
    },
  });
}
