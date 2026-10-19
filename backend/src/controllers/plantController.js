import { Plant } from '../models/Plant.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { SensorReading } from '../models/SensorReading.js';
import { Alert } from '../models/Alert.js';
import { Analysis } from '../models/Analysis.js';
import { uploadImage } from '../services/cloudinaryService.js';

// GET /plants
export async function listPlants(_req, res, next) {
  try {
    const plants = await Plant.find().sort({ createdAt: -1 });
    res.json(plants);
  } catch (err) {
    next(err);
  }
}

// GET /plants/:id
export async function getPlant(req, res, next) {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ status: 'error', message: 'Plant not found' });
    }
    res.json(plant);
  } catch (err) {
    next(err);
  }
}

// POST /plants
export async function createPlant(req, res, next) {
  try {
    const { name, species, location, imageUrl, notes } = req.body;

    if (!name || !species || !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, species, and location are required.',
      });
    }

    let finalImageUrl = imageUrl;
    // If base64 image provided, upload via service
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      finalImageUrl = await uploadImage(imageUrl, 'plantsight/plants');
    }

    const plant = await Plant.create({
      name: name.trim(),
      species: species.trim(),
      location: location.trim(),
      imageUrl: finalImageUrl || undefined,
      notes: notes ? notes.trim() : undefined,
      healthStatus: 'healthy',
      healthScore: 88,
    });

    res.status(201).json(plant);
  } catch (err) {
    next(err);
  }
}

// PUT /plants/:id
export async function updatePlant(req, res, next) {
  try {
    const { name, species, location, imageUrl, notes, healthStatus, healthScore } = req.body;

    let finalImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      finalImageUrl = await uploadImage(imageUrl, 'plantsight/plants');
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (species !== undefined) updates.species = species.trim();
    if (location !== undefined) updates.location = location.trim();
    if (finalImageUrl !== undefined) updates.imageUrl = finalImageUrl;
    if (notes !== undefined) updates.notes = notes;
    if (healthStatus !== undefined) updates.healthStatus = healthStatus;
    if (healthScore !== undefined) updates.healthScore = healthScore;

    const plant = await Plant.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!plant) {
      return res.status(404).json({ status: 'error', message: 'Plant not found' });
    }

    res.json(plant);
  } catch (err) {
    next(err);
  }
}

// DELETE /plants/:id
export async function deletePlant(req, res, next) {
  try {
    const plant = await Plant.findByIdAndDelete(req.params.id);
    if (!plant) {
      return res.status(404).json({ status: 'error', message: 'Plant not found' });
    }

    // Clean up associated readings, alerts, and gallery
    await Promise.allSettled([
      SensorReading.deleteMany({ plantId: req.params.id }),
      Alert.deleteMany({ plantId: req.params.id }),
      Analysis.deleteMany({ plantId: req.params.id }),
      GalleryImage.deleteMany({ plantId: req.params.id }),
    ]);

    res.json({ status: 'success', message: `Plant '${plant.name}' removed successfully.` });
  } catch (err) {
    next(err);
  }
}

// GET /plants/:id/gallery
export async function getPlantGallery(req, res, next) {
  try {
    const images = await GalleryImage.find({ plantId: req.params.id }).sort({ capturedAt: -1 });
    res.json(images);
  } catch (err) {
    next(err);
  }
}

// POST /plants/:id/gallery
export async function addPlantGalleryImage(req, res, next) {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ status: 'error', message: 'Image data or URL is required' });
    }

    const uploadedUrl = await uploadImage(image, 'plantsight/gallery');
    const galleryItem = await GalleryImage.create({
      plantId: req.params.id,
      url: uploadedUrl,
      capturedAt: new Date(),
    });

    res.status(201).json(galleryItem);
  } catch (err) {
    next(err);
  }
}
