import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Uploads an image (base64 data URL, remote URL, or local file buffer)
 * to Cloudinary if configured, or stores it locally.
 *
 * @param {string} imageInput - Base64 data URL, remote URL, or local file path
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<string>} The uploaded image URL
 */
export async function uploadImage(imageInput, folder = 'plantsight') {
  if (!imageInput) {
    throw new Error('No image provided for upload');
  }

  // If Cloudinary is configured, use it
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(imageInput, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (err) {
      console.error('[Cloudinary] Upload failed, falling back to local storage:', err.message);
    }
  }

  // Fallback: If imageInput is already a remote HTTP URL, return as-is
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    return imageInput;
  }

  // Fallback: If imageInput is a base64 data URL, write to backend/uploads
  if (typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
    try {
      const matches = imageInput.match(/^data:image\/([a-zA-Z0-9-+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const filename = `plant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));
        return `/uploads/${filename}`;
      }
    } catch (writeErr) {
      console.error('[UploadFallback] Failed to save local file, keeping data URL:', writeErr.message);
    }
    // Return data URL as last resort
    return imageInput;
  }

  return imageInput;
}
