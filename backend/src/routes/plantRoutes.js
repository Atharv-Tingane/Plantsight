import { Router } from 'express';
import {
  listPlants,
  getPlant,
  createPlant,
  updatePlant,
  deletePlant,
  getPlantGallery,
  addPlantGalleryImage,
} from '../controllers/plantController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.route('/')
  .get(optionalAuth, listPlants)
  .post(protect, createPlant);

router.route('/:id')
  .get(optionalAuth, getPlant)
  .put(protect, updatePlant)
  .delete(protect, deletePlant);

router.route('/:id/gallery')
  .get(optionalAuth, getPlantGallery)
  .post(protect, addPlantGalleryImage);

export default router;
