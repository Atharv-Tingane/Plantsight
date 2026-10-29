import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { plantsService, sensorService, alertsService, analysisService, settingsService } from '@/services/api';
import { useAuth } from './AuthContext';
import {
  samplePlants,
  sampleSensorReadings,
  sampleAlerts,
  sampleAnalyses,
  sampleProfile,
  samplePreferences,
  latestReadingForPlant,
} from '@/data/sampleData';
import type {
  Plant,
  SensorReading,
  AlertItem,
  AnalysisResult,
  UserProfile,
  MonitoringPreferences,
} from '@/types';

interface DataContextValue {
  // Status
  isDemoData: boolean;
  loading: boolean;
  error: string | null;

  // Data
  plants: Plant[];
  alerts: AlertItem[];
  analyses: AnalysisResult[];
  profile: UserProfile;
  preferences: MonitoringPreferences;
  latestReadings: Record<string, SensorReading | undefined>;
  allReadings: SensorReading[];

  refresh: () => Promise<void>;
  addPlant: (plant: Omit<Plant, 'id' | 'addedAt' | 'healthStatus' | 'healthScore'>) => Promise<Plant>;
  updatePlant: (id: string, payload: Partial<Plant>) => Promise<Plant>;
  deletePlant: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  runAnalysis: (plantId: string, image: string, plantName: string) => Promise<AnalysisResult>;
  updateProfile: (p: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (p: Partial<MonitoringPreferences>) => Promise<void>;
  getReadingsForPlant: (plantId: string) => SensorReading[];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, updateUser } = useAuth();

  const [isDemoData, setIsDemoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [profile, setProfile] = useState<UserProfile>(sampleProfile);
  const [preferences, setPreferences] = useState<MonitoringPreferences>(samplePreferences);
  const [allReadings, setAllReadings] = useState<SensorReading[]>([]);

  // Synchronize profile state when authenticated user changes
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || sampleProfile.avatarUrl,
        location: user.location || '',
      });
      if (user.preferences) {
        setPreferences((prev) => ({ ...prev, ...user.preferences }));
      }
    }
  }, [user]);

  const loadDemo = useCallback(() => {
    setPlants(samplePlants);
    setAlerts(sampleAlerts);
    setAnalyses(sampleAnalyses);
    setProfile(sampleProfile);
    setPreferences(samplePreferences);
    setAllReadings(sampleSensorReadings);
    setIsDemoData(true);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantsRes, alertsRes, analysesRes, profileRes, prefsRes, readingsRes] =
        await Promise.all([
          plantsService.list(),
          alertsService.list(),
          analysisService.history(),
          settingsService.profile(),
          settingsService.preferences(),
          sensorService.history({}),
        ]);
      setPlants(plantsRes);
      setAlerts(alertsRes);
      setAnalyses(analysesRes);
      setProfile(profileRes);
      setPreferences(prefsRes);
      setAllReadings(readingsRes);
      setIsDemoData(false);
    } catch (err) {
      // Set clean error state rather than silently displaying demo data
      setError(err instanceof Error ? err.message : 'Failed to connect to PlantSight backend API');
      setIsDemoData(false);
      setPlants([]);
      setAlerts([]);
      setAnalyses([]);
      setAllReadings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setPlants([]);
      setAlerts([]);
      setAnalyses([]);
      setAllReadings([]);
      setLoading(false);
    }
  }, [isAuthenticated, refresh]);

  const addPlant = useCallback<DataContextValue['addPlant']>(
    async (payload) => {
      if (isDemoData) {
        const newPlant: Plant = {
          ...payload,
          id: `p-${Math.random().toString(36).slice(2, 8)}`,
          addedAt: new Date().toISOString(),
          healthStatus: 'unknown',
          healthScore: 0,
        };
        setPlants((prev) => [newPlant, ...prev]);
        return newPlant;
      }
      const created = await plantsService.create(payload);
      setPlants((prev) => [created, ...prev]);
      return created;
    },
    [isDemoData]
  );

  const updatePlant = useCallback<DataContextValue['updatePlant']>(
    async (id, payload) => {
      if (isDemoData) {
        let updated: Plant | undefined;
        setPlants((prev) =>
          prev.map((p) => {
            if (p.id === id) {
              updated = { ...p, ...payload };
              return updated;
            }
            return p;
          })
        );
        return updated!;
      }
      const updated = await plantsService.update(id, payload);
      setPlants((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [isDemoData]
  );

  const deletePlant = useCallback<DataContextValue['deletePlant']>(
    async (id) => {
      if (isDemoData) {
        setPlants((prev) => prev.filter((p) => p.id !== id));
        return;
      }
      await plantsService.remove(id);
      setPlants((prev) => prev.filter((p) => p.id !== id));
      setAllReadings((prev) => prev.filter((r) => r.plantId !== id));
      setAlerts((prev) => prev.filter((a) => a.plantId !== id));
      setAnalyses((prev) => prev.filter((an) => an.plantId !== id));
    },
    [isDemoData]
  );

  const acknowledgeAlert = useCallback<DataContextValue['acknowledgeAlert']>(
    async (id) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
      if (!isDemoData) {
        try {
          await alertsService.acknowledge(id);
        } catch {
          // ignore — optimistic update already applied
        }
      }
    },
    [isDemoData]
  );

  const runAnalysis = useCallback<DataContextValue['runAnalysis']>(
    async (_plantId, image, plantName) => {
      // Simulate analysis latency in demo mode.
      if (isDemoData) {
        await new Promise((r) => setTimeout(r, 1600));
        const result: AnalysisResult = {
          id: `an-${Math.random().toString(36).slice(2, 8)}`,
          plantId: _plantId,
          plantName,
          imageUrl: image,
          createdAt: new Date().toISOString(),
          symptoms: [
            'Localized leaf chlorosis and pale margins observed on mature foliage',
            'Slight downward curling along terminal leaf tips',
          ],
          possibleDiseases: [
            {
              name: 'Fungal leaf spot (demo)',
              probability: 0.61,
              alternativeCauses: ['Water stress', 'Natural aging'],
            },
          ],
          recommendations: [
            'Inspect plant closely under natural light (demo result)',
            'Remove visibly affected leaves to minimize fungal spread',
            'Water at base without wetting foliage',
          ],
          uncertainty: 'medium',
          confidence: 0.72,
          plantIdentification: {
            commonName: plantName || 'Cultivated Plant',
            scientificName: 'Botanical specimen',
            description: 'Domestic garden specimen examined under demo conditions.',
            confidence: 0.85,
            isIdentified: true,
            notes: 'Identified from botanical profile in demo mode.',
          },
          healthStatus: 'warning',
          severity: 'moderate',
          detailedDiagnosis: 'Foliar inspection indicates mild chlorophyll degradation along outer leaf margins, possibly caused by microclimate humidity shifts or early fungal leaf spot.',
          possibleCauses: [
            {
              cause: 'Early Fungal Leaf Spot (demo)',
              probability: 0.61,
              explanation: 'Elevated ambient moisture and stagnant microclimate create favorable conditions for spore germination.',
              alternativeCauses: ['Watering deficit', 'Natural leaf senescence'],
            },
          ],
          treatment: [
            'Prune visibly affected leaves using sanitized shears.',
            'Apply organic neem oil or mild bio-fungicide if spotting expands.',
          ],
          followUpCare: [
            'Check leaf undersides every 4–5 days.',
            'Ensure adequate spacing between adjacent plants for airflow.',
          ],
          idealEnvironment: {
            temperature: { min: 18, max: 28, description: '18°C – 28°C recommended growing range' },
            humidity: { min: 45, max: 65, description: '45% – 65% relative humidity' },
            sunlight: 'Bright indirect sunlight, 6–8 hours daily',
            watering: 'Water when top 2–3 cm of soil is dry to the touch',
            soil: 'Well-draining, nutrient-rich potting loam',
            indoorOutdoor: 'Suitable for indoor windowsill or sheltered outdoor patio',
            speciesRequirements: 'Protect from direct cold drafts and radiator vents.',
          },
          environmentalComparison: {
            hasSensorData: true,
            sensorStatus: 'live',
            timestamp: new Date().toISOString(),
            temperatureAssessment: {
              current: 24.5,
              targetRange: '18°C – 28°C',
              status: 'optimal',
              isCalibrated: true,
              evaluation: 'Current ambient temperature (24.5°C) is within the optimal range.',
            },
            humidityAssessment: {
              current: 58,
              targetRange: '45% – 65% RH',
              status: 'optimal',
              isCalibrated: true,
              evaluation: 'Current relative humidity (58%) is well-balanced.',
            },
            soilMoistureAssessment: {
              current: 0,
              targetRange: 'Evenly moist soil',
              status: 'uncalibrated',
              isCalibrated: false,
              evaluation: 'Hardware probe uncalibrated. Check hydration manually.',
            },
            lightAssessment: {
              current: 2400,
              targetRange: 'Bright indirect sunlight',
              status: 'qualitative',
              isCalibrated: false,
              evaluation: 'Raw ADC reading indicates adequate ambient daytime illumination.',
            },
            parametersSummary: [
              { parameter: 'Temperature', currentValue: '24.5°C', targetValue: '18°C – 28°C', status: 'optimal' },
              { parameter: 'Relative Humidity', currentValue: '58% RH', targetValue: '45% – 65% RH', status: 'optimal' },
              { parameter: 'Soil Moisture', currentValue: '0 (Uncalibrated)', targetValue: 'Evenly moist', status: 'uncalibrated' },
              { parameter: 'Ambient Light', currentValue: 'Raw ADC 2400/4095', targetValue: 'Bright indirect', status: 'info' },
            ],
            practicalRecommendations: [
              'Maintain current comfortable ambient temperature.',
              'Check soil moisture by hand before scheduling next watering.',
            ],
          },
        };
        setAnalyses((prev) => [result, ...prev]);
        return result;
      }
      const result = await analysisService.analyze({ plantId: _plantId, image });
      setAnalyses((prev) => [result, ...prev]);
      return result;
    },
    [isDemoData]
  );

  const updateProfile = useCallback<DataContextValue['updateProfile']>(
    async (p) => {
      setProfile((prev) => ({ ...prev, ...p }));
      updateUser(p);
      if (!isDemoData) {
        try {
          const updated = await settingsService.updateProfile(p);
          setProfile(updated);
          updateUser(updated);
        } catch {
          // keep optimistic update
        }
      }
    },
    [isDemoData, updateUser]
  );

  const updatePreferences = useCallback<DataContextValue['updatePreferences']>(
    async (p) => {
      setPreferences((prev) => ({ ...prev, ...p }));
      if (!isDemoData) {
        try {
          const updated = await settingsService.updatePreferences(p);
          setPreferences(updated);
        } catch {
          // keep optimistic update
        }
      }
    },
    [isDemoData]
  );

  const getReadingsForPlant = useCallback(
    (plantId: string) =>
      allReadings
        .filter((r) => r.plantId === plantId && !r.isSimulated && r.source !== 'simulated')
        .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)),
    [allReadings]
  );

  const latestReadings = useMemo(() => {
    const map: Record<string, SensorReading | undefined> = {};
    const realSorted = allReadings
      .filter((r) => !r.isSimulated && r.source !== 'simulated')
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

    plants.forEach((p) => {
      const directMatch = realSorted.find((r) => r.plantId === p.id);
      map[p.id] = directMatch || (plants.length === 1 ? realSorted[0] : undefined);
    });
    return map;
  }, [plants, allReadings]);

  const value: DataContextValue = {
    isDemoData,
    loading,
    error,
    plants,
    alerts,
    analyses,
    profile,
    preferences,
    latestReadings,
    allReadings,
    refresh,
    addPlant,
    updatePlant,
    deletePlant,
    acknowledgeAlert,
    runAnalysis,
    updateProfile,
    updatePreferences,
    getReadingsForPlant,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
