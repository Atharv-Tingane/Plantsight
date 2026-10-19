import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
    },
    species: {
      type: String,
      required: [true, 'Species is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    healthStatus: {
      type: String,
      enum: ['healthy', 'warning', 'critical', 'unknown'],
      default: 'unknown',
    },
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Plant = mongoose.model('Plant', plantSchema);
