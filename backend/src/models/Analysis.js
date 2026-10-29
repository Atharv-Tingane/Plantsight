import mongoose from 'mongoose';

const possibleDiseaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 1 },
    alternativeCauses: [{ type: String }],
  },
  { _id: false }
);

const possibleCauseSchema = new mongoose.Schema(
  {
    cause: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 1 },
    explanation: { type: String, default: '' },
    alternativeCauses: [{ type: String }],
  },
  { _id: false }
);

const plantIdentificationSchema = new mongoose.Schema(
  {
    commonName: { type: String, default: 'Unidentified Plant' },
    scientificName: { type: String, default: null },
    description: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    isIdentified: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const idealEnvironmentSchema = new mongoose.Schema(
  {
    temperature: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      description: { type: String, default: '' },
    },
    humidity: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      description: { type: String, default: '' },
    },
    sunlight: { type: String, default: '' },
    watering: { type: String, default: '' },
    soil: { type: String, default: '' },
    indoorOutdoor: { type: String, default: '' },
    speciesRequirements: { type: String, default: '' },
  },
  { _id: false }
);

const metricAssessmentSchema = new mongoose.Schema(
  {
    current: { type: Number, default: null },
    targetRange: { type: String, default: '' },
    status: { type: String, default: 'unknown' },
    isCalibrated: { type: Boolean, default: true },
    evaluation: { type: String, default: '' },
  },
  { _id: false }
);

const environmentalComparisonSchema = new mongoose.Schema(
  {
    hasSensorData: { type: Boolean, default: false },
    sensorStatus: { type: String, default: 'unavailable' },
    timestamp: { type: Date, default: null },
    temperatureAssessment: metricAssessmentSchema,
    humidityAssessment: metricAssessmentSchema,
    soilMoistureAssessment: metricAssessmentSchema,
    lightAssessment: metricAssessmentSchema,
    parametersSummary: [
      {
        parameter: { type: String },
        currentValue: { type: String },
        targetValue: { type: String },
        status: { type: String },
      },
    ],
    practicalRecommendations: [{ type: String }],
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
    // Enhanced Botanical & Environmental Fields
    plantIdentification: plantIdentificationSchema,
    healthStatus: {
      type: String,
      enum: ['healthy', 'warning', 'critical', 'unknown'],
      default: 'healthy',
    },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      default: 'low',
    },
    detailedDiagnosis: {
      type: String,
      default: '',
    },
    possibleCauses: [possibleCauseSchema],
    treatment: [{ type: String }],
    followUpCare: [{ type: String }],
    idealEnvironment: idealEnvironmentSchema,
    environmentalComparison: environmentalComparisonSchema,
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
