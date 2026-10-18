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

  // Actions
  refresh: () => Promise<void>;
  addPlant: (plant: Omit<Plant, 'id' | 'addedAt' | 'healthStatus' | 'healthScore'>) => Promise<Plant>;
  acknowledgeAlert: (id: string) => Promise<void>;
  runAnalysis: (plantId: string, image: string, plantName: string) => Promise<AnalysisResult>;
  updateProfile: (p: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (p: Partial<MonitoringPreferences>) => Promise<void>;
  getReadingsForPlant: (plantId: string) => SensorReading[];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isDemoData, setIsDemoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [profile, setProfile] = useState<UserProfile>(sampleProfile);
  const [preferences, setPreferences] = useState<MonitoringPreferences>(samplePreferences);
  const [allReadings, setAllReadings] = useState<SensorReading[]>([]);

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
      // Try the live backend. If any core call fails, fall back to demo data
      // so the UI stays usable while the backend is wired up.
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
      // Graceful fallback to demo data
      loadDemo();
      setError(err instanceof Error ? err.message : null);
    } finally {
      setLoading(false);
    }
  }, [loadDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
            'Leaf discoloration observed on sample image',
            'Possible spot patterns on upper leaf surface',
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
            'Remove visibly affected leaves',
          ],
          uncertainty: 'medium',
          confidence: 0.61,
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
      if (!isDemoData) {
        try {
          const updated = await settingsService.updateProfile(p);
          setProfile(updated);
        } catch {
          // keep optimistic update
        }
      }
    },
    [isDemoData]
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
        .filter((r) => r.plantId === plantId)
        .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)),
    [allReadings]
  );

  const latestReadings = useMemo(() => {
    const map: Record<string, SensorReading | undefined> = {};
    plants.forEach((p) => {
      map[p.id] = isDemoData
        ? latestReadingForPlant(p.id)
        : allReadings
            .filter((r) => r.plantId === p.id)
            .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
    });
    return map;
  }, [plants, allReadings, isDemoData]);

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
