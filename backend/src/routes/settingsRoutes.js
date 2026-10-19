import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
} from '../controllers/settingsController.js';

const router = Router();

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.route('/preferences')
  .get(getPreferences)
  .put(updatePreferences);

export default router;
