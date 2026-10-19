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

const router = Router();

router.route('/')
  .get(listPlants)
  .post(createPlant);

router.route('/:id')
  .get(getPlant)
  .put(updatePlant)
  .delete(deletePlant);

router.route('/:id/gallery')
  .get(getPlantGallery)
  .post(addPlantGalleryImage);

export default router;
