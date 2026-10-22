// Shared domain types for PlantSight

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface Plant {
  id: string;
  name: string;
  species: string;
  location: string;
  imageUrl: string;
  healthStatus: HealthStatus;
  healthScore: number; // 0-100
  addedAt: string; // ISO date
  notes?: string;
}

export interface SensorReading {
  id: string;
  plantId: string;
  timestamp: string; // ISO
  soilMoisture: number; // %
  temperature: number; // °C
  humidity: number; // %
  lightIntensity: number; // lux
  isSimulated?: boolean;
  source?: 'esp32' | 'simulated' | 'api';
}

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface AlertItem {
  id: string;
  plantId: string;
  plantName: string;
  severity: AlertSeverity;
  category: 'soil' | 'temperature' | 'humidity' | 'light' | 'disease';
  title: string;
  message: string;
  createdAt: string; // ISO
  acknowledged: boolean;
}

export interface GalleryImage {
  id: string;
  plantId: string;
  url: string;
  capturedAt: string;
}

export interface AnalysisResult {
  id: string;
  plantId: string;
  plantName: string;
  imageUrl: string;
  createdAt: string;
  symptoms: string[];
  possibleDiseases: {
    name: string;
    probability: number; // 0-1
    alternativeCauses: string[];
  }[];
  recommendations: string[];
  uncertainty: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  sensorSnapshot?: {
    soilMoisture?: number;
    temperature?: number;
    humidity?: number;
    lightIntensity?: number;
    avgTemperature?: number;
    avgHumidity?: number;
    readingCount?: number;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  location?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  location?: string;
  preferences?: MonitoringPreferences;
  createdAt?: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message?: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  location?: string;
}

export interface MonitoringPreferences {
  lowSoilMoistureThreshold: number;
  highTemperatureThreshold: number;
  lowHumidityThreshold: number;
  lowLightThreshold: number;
  diseaseAlertsEnabled: boolean;
  emailNotifications: boolean;
  measurementUnit: 'metric' | 'imperial';
}
