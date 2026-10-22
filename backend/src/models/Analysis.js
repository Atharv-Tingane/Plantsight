import mongoose from 'mongoose';

const possibleDiseaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 1 },
    alternativeCauses: [{ type: String }],
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    plantId: {
      type: String,
      required: true,
      index: true,
    },
    plantName: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    symptoms: [{ type: String }],
    possibleDiseases: [possibleDiseaseSchema],
    recommendations: [{ type: String }],
    uncertainty: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    sensorSnapshot: {
      soilMoisture: Number,
      temperature: Number,
      humidity: Number,
      lightIntensity: Number,
      avgTemperature: Number,
      avgHumidity: Number,
      readingCount: Number,
    },
    createdAt: {
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
        ret.createdAt = ret.createdAt instanceof Date ? ret.createdAt.toISOString() : ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.createdAt = ret.createdAt instanceof Date ? ret.createdAt.toISOString() : ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Analysis = mongoose.model('Analysis', analysisSchema);
