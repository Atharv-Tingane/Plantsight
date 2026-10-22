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
