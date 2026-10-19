import { Router } from 'express';
import {
  listAlerts,
  acknowledgeAlert,
  createAlert,
} from '../controllers/alertController.js';

const router = Router();

router.route('/')
  .get(listAlerts)
  .post(createAlert);

router.post('/:id/acknowledge', acknowledgeAlert);

export default router;
