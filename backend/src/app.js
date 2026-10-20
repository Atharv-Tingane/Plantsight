import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import plantRoutes from './routes/plantRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, ESP32 microcontrollers)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Static serve for locally stored plant images
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Root & Health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to PlantSight API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API Resource routes
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
