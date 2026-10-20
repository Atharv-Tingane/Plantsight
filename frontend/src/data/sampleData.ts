import type {
  Plant,
  SensorReading,
  AlertItem,
  AnalysisResult,
  GalleryImage,
  UserProfile,
  MonitoringPreferences,
} from '@/types';

// Demo data used before a live backend is connected.
// Clearly labeled throughout the UI as "demo data".

export const samplePlants: Plant[] = [
  {
    id: 'p-001',
    name: 'Basil',
    species: 'Ocimum basilicum',
    location: 'Kitchen windowsill',
    imageUrl:
      'https://images.pexels.com/photos/1004584/pexels-photo-1004584.jpeg?auto=compress&cs=tinysrgb&w=800',
    healthStatus: 'healthy',
    healthScore: 92,
    addedAt: '2026-09-01T09:12:00Z',
    notes: 'Potted herb, watered every other day.',
  },
  {
    id: 'p-002',
    name: 'Monstera',
    species: 'Monstera deliciosa',
    location: 'Living room corner',
    imageUrl:
      'https://images.pexels.com/photos/3094208/pexels-photo-3094208.jpeg?auto=compress&cs=tinysrgb&w=800',
    healthStatus: 'warning',
    healthScore: 71,
    addedAt: '2026-08-15T10:00:00Z',
    notes: 'Leaves yellowing slightly; monitor watering.',
  },
  {
    id: 'p-003',
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    location: 'Bedroom',
    imageUrl:
      'https://images.pexels.com/photos/2125247/pexels-photo-2125247.jpeg?auto=compress&cs=tinysrgb&w=800',
    healthStatus: 'healthy',
    healthScore: 88,
    addedAt: '2026-07-22T14:30:00Z',
  },
  {
    id: 'p-004',
    name: 'Tomato',
    species: 'Solanum lycopersicum',
    location: 'Balcony planter',
    imageUrl:
      'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=800',
    healthStatus: 'critical',
    healthScore: 38,
    addedAt: '2026-09-10T07:45:00Z',
    notes: 'Leaf curl and brown spots observed.',
  },
  {
    id: 'p-005',
    name: 'Aloe Vera',
    species: 'Aloe barbadensis',
    location: 'Study desk',
    imageUrl:
      'https://images.pexels.com/photos/4096385/pexels-photo-4096385.jpeg?auto=compress&cs=tinysrgb&w=800',
    healthStatus: 'healthy',
    healthScore: 95,
    addedAt: '2026-06-30T11:20:00Z',
  },
];

// Generate 24 hourly demo readings per plant
function generateReadings(): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date('2026-10-18T12:00:00Z');
  samplePlants.forEach((plant, pIdx) => {
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000);
      const base = {
        soil: 55 + Math.sin(i / 4 + pIdx) * 12,
        temp: 23 + Math.sin(i / 6 + pIdx) * 4,
        hum: 60 + Math.cos(i / 5 + pIdx) * 8,
        light: 4000 + Math.max(0, Math.sin((12 - i) / 4)) * 6000,
      };
      readings.push({
        id: `r-${plant.id}-${i}`,
        plantId: plant.id,
        timestamp: t.toISOString(),
        soilMoisture: Math.round(base.soil + (pIdx * 1.5)),
        temperature: Math.round((base.temp + (pIdx * 0.4)) * 10) / 10,
        humidity: Math.round(base.hum - pIdx),
        lightIntensity: Math.round(Math.max(0, base.light)),
      });
    }
  });
  return readings;
}

export const sampleSensorReadings: SensorReading[] = generateReadings();

export function latestReadingForPlant(plantId: string): SensorReading | undefined {
  const list = sampleSensorReadings
    .filter((r) => r.plantId === plantId)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  return list[0];
}

export const sampleAlerts: AlertItem[] = [
  {
    id: 'a-001',
    plantId: 'p-004',
    plantName: 'Tomato',
    severity: 'high',
    category: 'disease',
    title: 'Possible disease detected',
    message:
      'AI analysis flagged brown leaf spots with concentric rings. Possible early blight. Inspect plant and isolate if needed.',
    createdAt: '2026-10-18T08:30:00Z',
    acknowledged: false,
  },
  {
    id: 'a-002',
    plantId: 'p-002',
    plantName: 'Monstera',
    severity: 'medium',
    category: 'soil',
    title: 'Low soil moisture',
    message: 'Soil moisture dropped to 24%. Consider watering soon.',
    createdAt: '2026-10-18T07:05:00Z',
    acknowledged: false,
  },
  {
    id: 'a-003',
    plantId: 'p-004',
    plantName: 'Tomato',
    severity: 'medium',
    category: 'temperature',
    title: 'High temperature',
    message: 'Balcony temperature reached 33°C. Move plant or provide shade.',
    createdAt: '2026-10-17T15:20:00Z',
    acknowledged: true,
  },
  {
    id: 'a-004',
    plantId: 'p-001',
    plantName: 'Basil',
    severity: 'low',
    category: 'humidity',
    title: 'Low humidity',
    message: 'Humidity at 38%. Basil prefers 50-65%.',
    createdAt: '2026-10-17T09:00:00Z',
    acknowledged: true,
  },
  {
    id: 'a-005',
    plantId: 'p-003',
    plantName: 'Snake Plant',
    severity: 'low',
    category: 'light',
    title: 'Low light exposure',
    message: 'Light intensity below 800 lux for 6 hours.',
    createdAt: '2026-10-16T18:40:00Z',
    acknowledged: false,
  },
];

export const sampleAnalyses: AnalysisResult[] = [
  {
    id: 'an-001',
    plantId: 'p-004',
    plantName: 'Tomato',
    imageUrl:
      'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=800',
    createdAt: '2026-10-18T08:25:00Z',
    symptoms: [
      'Brown circular spots with concentric rings on lower leaves',
      'Yellowing around affected areas',
      'Slight leaf curl at edges',
    ],
    possibleDiseases: [
      {
        name: 'Early Blight (Alternaria solani)',
        probability: 0.78,
        alternativeCauses: ['Septoria leaf spot', 'Nutrient deficiency (magnesium)'],
      },
      {
        name: 'Septoria Leaf Spot',
        probability: 0.14,
        alternativeCauses: ['Fungal infection from overhead watering'],
      },
    ],
    recommendations: [
      'Remove and dispose of affected lower leaves',
      'Avoid overhead watering; water at the base',
      'Apply a copper-based fungicide if symptoms spread',
      'Improve air circulation around the plant',
    ],
    uncertainty: 'medium',
    confidence: 0.78,
  },
  {
    id: 'an-002',
    plantId: 'p-002',
    plantName: 'Monstera',
    imageUrl:
      'https://images.pexels.com/photos/3094208/pexels-photo-3094208.jpeg?auto=compress&cs=tinysrgb&w=800',
    createdAt: '2026-10-15T11:00:00Z',
    symptoms: ['Mild yellowing of older leaves', 'Slight drooping'],
    possibleDiseases: [
      {
        name: 'Overwatering stress',
        probability: 0.62,
        alternativeCauses: ['Natural aging of lower leaves', 'Low light'],
      },
    ],
    recommendations: [
      'Allow top 5cm of soil to dry before next watering',
      'Check drainage holes are not blocked',
    ],
    uncertainty: 'low',
    confidence: 0.62,
  },
];

export const sampleGallery: GalleryImage[] = [
  {
    id: 'g-001',
    plantId: 'p-002',
    url: 'https://images.pexels.com/photos/3094208/pexels-photo-3094208.jpeg?auto=compress&cs=tinysrgb&w=800',
    capturedAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 'g-002',
    plantId: 'p-002',
    url: 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?auto=compress&cs=tinysrgb&w=800',
    capturedAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'g-003',
    plantId: 'p-004',
    url: 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=800',
    capturedAt: '2026-10-18T08:25:00Z',
  },
  {
    id: 'g-004',
    plantId: 'p-001',
    url: 'https://images.pexels.com/photos/1004584/pexels-photo-1004584.jpeg?auto=compress&cs=tinysrgb&w=800',
    capturedAt: '2026-10-12T07:30:00Z',
  },
];

export const sampleProfile: UserProfile = {
  name: 'Aisha Rahman',
  email: 'aisha@plantsight.demo',
  location: 'Dhaka, Bangladesh',
  avatarUrl: 'https://i.pravatar.cc/150?img=47',
};

export const samplePreferences: MonitoringPreferences = {
  lowSoilMoistureThreshold: 30,
  highTemperatureThreshold: 32,
  lowHumidityThreshold: 40,
  lowLightThreshold: 800,
  diseaseAlertsEnabled: true,
  emailNotifications: true,
  measurementUnit: 'metric',
};
