import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from './scripts/seed.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import plantRoutes from './routes/plantRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or ESP32)
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
app.use('/api/plants', plantRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to DB and Start Server
async function startServer() {
  const conn = await connectDB();
  if (conn) {
    // Auto-seed if database is completely empty
    await seedDatabase(false);
  }

  const server = app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  PlantSight Server running on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================\n`);
  });

  return server;
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

export default app;
