import { apiClient } from './apiClient';
import type {
  Plant,
  SensorReading,
  AlertItem,
  AnalysisResult,
  GalleryImage,
  UserProfile,
  MonitoringPreferences,
} from '@/types';

// ---------------------------------------------------------------------------
// Plants
// ---------------------------------------------------------------------------
export const plantsService = {
  list: () => apiClient.get<Plant[]>('/plants').then((r) => r.data),
  get: (id: string) => apiClient.get<Plant>(`/plants/${id}`).then((r) => r.data),
  create: (payload: Omit<Plant, 'id' | 'addedAt' | 'healthStatus' | 'healthScore'>) =>
    apiClient.post<Plant>('/plants', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Plant>) =>
    apiClient.put<Plant>(`/plants/${id}`, payload).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/plants/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Sensor readings
// ---------------------------------------------------------------------------
export interface SensorQuery {
  plantId?: string;
  from?: string; // ISO date
  to?: string; // ISO date
}

export const sensorService = {
  latest: (plantId?: string) =>
    apiClient
      .get<SensorReading[]>('/sensors/latest', { params: { plantId } })
      .then((r) => r.data),
  history: (query: SensorQuery) =>
    apiClient
      .get<SensorReading[]>('/sensors/history', { params: query })
      .then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------
export const alertsService = {
  list: (unacknowledgedOnly = false) =>
    apiClient
      .get<AlertItem[]>('/alerts', { params: { unacknowledgedOnly } })
      .then((r) => r.data),
  acknowledge: (id: string) =>
    apiClient.post(`/alerts/${id}/acknowledge`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------
export interface AnalyzeImagePayload {
  plantId: string;
  image: string; // base64 data URL or remote URL
}

export const analysisService = {
  history: (plantId?: string) =>
    apiClient
      .get<AnalysisResult[]>('/analysis', { params: { plantId } })
      .then((r) => r.data),
  analyze: (payload: AnalyzeImagePayload) =>
    apiClient.post<AnalysisResult>('/analysis/analyze', payload).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export const galleryService = {
  list: (plantId: string) =>
    apiClient.get<GalleryImage[]>(`/plants/${plantId}/gallery`).then((r) => r.data),
  upload: (plantId: string, image: string) =>
    apiClient
      .post<GalleryImage>(`/plants/${plantId}/gallery`, { image })
      .then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export const settingsService = {
  profile: () => apiClient.get<UserProfile>('/settings/profile').then((r) => r.data),
  updateProfile: (payload: Partial<UserProfile>) =>
    apiClient.put<UserProfile>('/settings/profile', payload).then((r) => r.data),
  preferences: () =>
    apiClient.get<MonitoringPreferences>('/settings/preferences').then((r) => r.data),
  updatePreferences: (payload: Partial<MonitoringPreferences>) =>
    apiClient
      .put<MonitoringPreferences>('/settings/preferences', payload)
      .then((r) => r.data),
};
