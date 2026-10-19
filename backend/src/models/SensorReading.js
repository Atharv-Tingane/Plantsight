import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema(
  {
    plantId: {
      type: String,
      required: [true, 'plantId is required'],
      index: true,
    },
    soilMoisture: {
      type: Number,
      required: [true, 'soilMoisture is required'],
    },
    temperature: {
      type: Number,
      required: [true, 'temperature is required'],
    },
    humidity: {
      type: Number,
      required: [true, 'humidity is required'],
    },
    lightIntensity: {
      type: Number,
      required: [true, 'lightIntensity is required'],
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ['esp32', 'simulated', 'api'],
      default: 'esp32',
    },
    timestamp: {
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
        ret.timestamp = ret.timestamp instanceof Date ? ret.timestamp.toISOString() : ret.timestamp;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.timestamp = ret.timestamp instanceof Date ? ret.timestamp.toISOString() : ret.timestamp;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

sensorReadingSchema.index({ plantId: 1, timestamp: -1 });

export const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);
