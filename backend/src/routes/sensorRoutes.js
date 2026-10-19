import { Router } from 'express';
import {
  getLatestReadings,
  getSensorHistory,
  recordReading,
  simulateReadings,
} from '../controllers/sensorController.js';

const router = Router();

router.get('/latest', getLatestReadings);
router.get('/history', getSensorHistory);

// ESP32 telemetry ingestion (supports POST JSON or GET query params)
router.route('/reading')
  .post(recordReading)
  .get(recordReading);

router.post('/', recordReading);

// Simulation / Demo data generator
router.post('/simulate', simulateReadings);

export default router;
