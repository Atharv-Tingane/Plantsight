import mongoose from 'mongoose';

const galleryImageSchema = new mongoose.Schema(
  {
    plantId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.capturedAt = ret.capturedAt instanceof Date ? ret.capturedAt.toISOString() : ret.capturedAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.capturedAt = ret.capturedAt instanceof Date ? ret.capturedAt.toISOString() : ret.capturedAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);
