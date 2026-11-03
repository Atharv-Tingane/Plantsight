import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Thermometer,
  Sun,
  Gauge,
  Sprout,
  ScanLine,
  ArrowRight,
  AlertTriangle,
  Activity,
  Camera,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SensorCard } from '@/components/SensorCard';
import { SensorChart } from '@/components/SensorChart';
import { PlantCard } from '@/components/PlantCard';
import { AlertRow } from '@/components/AlertRow';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState, ErrorState } from '@/components/States';
import { readingsToChartPoints } from '@/utils/chartData';
import { healthStatusMeta, timeAgo } from '@/utils/format';

export function DashboardPage() {
  const { plants, alerts, allReadings, latestReadings, loading, error, refresh, acknowledgeAlert } =
    useData();

  if (loading && plants.length === 0) {
    return <LoadingState label="Loading your plants…" />;
  }

  if (error && plants.length === 0) {
    return (
      <div className="card p-6 my-6">
        <ErrorState
          title="Could not connect to PlantSight backend"
          description={error}
          action={
            <button className="btn-primary" onClick={refresh}>
              Retry connection
            </button>
          }
        />
      </div>
    );
  }

  // Only use genuine sensor telemetry from hardware (exclude simulated/seed demo records)
  const realReadings = allReadings.filter((r) => !r.isSimulated && r.source !== 'simulated');
  const hasRealSensorData = realReadings.length > 0;

  // Real readings sorted newest first
  const realSorted = useMemo(
    () => [...realReadings].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
    [realReadings]
  );

  // Prioritize readings linked to user's registered plants; fall back to available real telemetry stream
  const userPlantReadings = useMemo(
    () => realSorted.filter((r) => plants.some((p) => p.id === r.plantId)),
    [realSorted, plants]
  );
  const activeReadings = userPlantReadings.length > 0 ? userPlantReadings : realSorted;

  // Multi-plant aggregation without double counting: get latest reading per plant
  const plantLatestList = useMemo(() => {
    return plants
      .map((p) => latestReadings[p.id] || realSorted.find((r) => r.plantId === p.id))
      .filter((r): r is import('@/types').SensorReading => Boolean(r));
  }, [plants, latestReadings, realSorted]);

  const {
    summarySoilMoisture,
    summaryTemperature,
    summaryHumidity,
    summaryLightIntensity,
    soilSublabel,
    tempSublabel,
    humSublabel,
    lightSublabel,
    deltaSoil,
    deltaTemp,
    deltaHum,
    deltaLight,
  } = useMemo(() => {
    if (plantLatestList.length > 1) {
      const count = plantLatestList.length;
      const avgSoil = Math.round(
        plantLatestList.reduce((sum, r) => sum + Number(r.soilMoisture), 0) / count
      );
      const avgTemp = Number(
        (plantLatestList.reduce((sum, r) => sum + Number(r.temperature), 0) / count).toFixed(1)
      );
      const avgHum = Number(
        (plantLatestList.reduce((sum, r) => sum + Number(r.humidity), 0) / count).toFixed(1)
      );
      const avgLight = Math.round(
        plantLatestList.reduce((sum, r) => sum + Number(r.lightIntensity), 0) / count
      );

      const aggregateSublabel = `Average across ${count} plants`;
      return {
        summarySoilMoisture: avgSoil,
        summaryTemperature: avgTemp,
        summaryHumidity: avgHum,
        summaryLightIntensity: avgLight,
        soilSublabel: aggregateSublabel,
        tempSublabel: aggregateSublabel,
        humSublabel: aggregateSublabel,
        lightSublabel: aggregateSublabel,
        deltaSoil: undefined,
        deltaTemp: undefined,
        deltaHum: undefined,
        deltaLight: undefined,
      };
    }

    if (plantLatestList.length === 1) {
      const single = plantLatestList[0];
      const p = plants.find((item) => item.id === single.plantId);
      const plantName = p ? p.name : 'Plant';

      const plantHistory = activeReadings.filter((r) => r.plantId === single.plantId);
      let dSoil: number | undefined;
      let dTemp: number | undefined;
      let dHum: number | undefined;
      let dLight: number | undefined;

      if (plantHistory.length > 1) {
        const prev = plantHistory[1];
        dSoil = Number((Number(single.soilMoisture) - Number(prev.soilMoisture)).toFixed(1));
        dTemp = Number((Number(single.temperature) - Number(prev.temperature)).toFixed(1));
        dHum = Number((Number(single.humidity) - Number(prev.humidity)).toFixed(1));
        dLight = Number((Number(single.lightIntensity) - Number(prev.lightIntensity)).toFixed(1));
      }

      return {
        summarySoilMoisture: single.soilMoisture,
        summaryTemperature: single.temperature,
        summaryHumidity: single.humidity,
        summaryLightIntensity: single.lightIntensity,
        soilSublabel: `${plantName} · latest reading`,
        tempSublabel: `${plantName} · ambient`,
        humSublabel: `${plantName} · ambient`,
        lightSublabel: `${plantName} · current`,
        deltaSoil: dSoil,
        deltaTemp: dTemp,
        deltaHum: dHum,
        deltaLight: dLight,
      };
    }

    if (realSorted.length > 0) {
      const unassigned = realSorted[0];
      let dSoil: number | undefined;
      let dTemp: number | undefined;
      let dHum: number | undefined;
      let dLight: number | undefined;

      if (realSorted.length > 1) {
        const prev = realSorted[1];
        dSoil = Number((Number(unassigned.soilMoisture) - Number(prev.soilMoisture)).toFixed(1));
        dTemp = Number((Number(unassigned.temperature) - Number(prev.temperature)).toFixed(1));
        dHum = Number((Number(unassigned.humidity) - Number(prev.humidity)).toFixed(1));
        dLight = Number((Number(unassigned.lightIntensity) - Number(prev.lightIntensity)).toFixed(1));
      }

      return {
        summarySoilMoisture: unassigned.soilMoisture,
        summaryTemperature: unassigned.temperature,
        summaryHumidity: unassigned.humidity,
        summaryLightIntensity: unassigned.lightIntensity,
        soilSublabel: 'Live garden telemetry',
        tempSublabel: 'Ambient',
        humSublabel: 'Ambient',
        lightSublabel: 'Current',
        deltaSoil: dSoil,
        deltaTemp: dTemp,
        deltaHum: dHum,
        deltaLight: dLight,
      };
    }

    return {
      summarySoilMoisture: '—',
      summaryTemperature: '—',
      summaryHumidity: '—',
      summaryLightIntensity: '—',
      soilSublabel: 'No sensor data available',
      tempSublabel: 'No sensor data available',
      humSublabel: 'No sensor data available',
      lightSublabel: 'No sensor data available',
      deltaSoil: undefined,
      deltaTemp: undefined,
      deltaHum: undefined,
      deltaLight: undefined,
    };
  }, [plantLatestList, plants, activeReadings, realSorted]);

  // Plant selector for sensor history chart
  const [selectedPlantId, setSelectedPlantId] = useState<string>('all');

  const chartSourceReadings = useMemo(() => {
    if (selectedPlantId === 'all') {
      return activeReadings.slice(0, 24);
    }
    return activeReadings.filter((r) => r.plantId === selectedPlantId).slice(0, 24);
  }, [selectedPlantId, activeReadings]);

  const chartData = useMemo(() => readingsToChartPoints(chartSourceReadings), [chartSourceReadings]);

  const chartTitle = useMemo(() => {
    if (selectedPlantId === 'all') {
      return plants.length > 1
        ? 'Sensor history · All plants'
        : plants[0]?.name
        ? `Sensor history · ${plants[0].name}`
        : 'Sensor history · Live Telemetry';
    }
    const plant = plants.find((p) => p.id === selectedPlantId);
    return plant ? `Sensor history · ${plant.name}` : 'Sensor history';
  }, [selectedPlantId, plants]);

  const plantSelector = plants.length > 0 ? (
    <div className="flex items-center gap-2">
      <label htmlFor="dashboard-plant-filter" className="text-xs text-gray-500 font-medium hidden sm:inline">
        Plant:
      </label>
      <select
        id="dashboard-plant-filter"
        value={selectedPlantId}
        onChange={(e) => setSelectedPlantId(e.target.value)}
        aria-label="Filter sensor history by plant"
        className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm"
      >
        <option value="all">All plants</option>
        {plants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  const unackAlerts = alerts.filter((a) => !a.acknowledged).slice(0, 4);
  const recentImages = plants.slice(0, 4);
  const healthCounts = plants.reduce(
    (acc, p) => {
      acc[p.healthStatus] = (acc[p.healthStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your registered plants and latest sensor readings."
        action={
          <Link to="/analysis" className="btn-primary">
            <ScanLine className="w-4 h-4" /> Analyze a plant
          </Link>
        }
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SensorCard
          label="Soil Moisture Reading"
          value={summarySoilMoisture}
          unit={undefined}
          icon={Droplets}
          accent="blue"
          trend={deltaSoil}
          isDemo={false}
          sublabel={soilSublabel}
        />
        <SensorCard
          label="Temperature"
          value={summaryTemperature}
          unit={summaryTemperature !== '—' ? '°C' : undefined}
          icon={Thermometer}
          accent="warning"
          trend={deltaTemp}
          isDemo={false}
          sublabel={tempSublabel}
        />
        <SensorCard
          label="Humidity"
          value={summaryHumidity}
          unit={summaryHumidity !== '—' ? '%' : undefined}
          icon={Gauge}
          accent="accent"
          trend={deltaHum}
          isDemo={false}
          sublabel={humSublabel}
        />
        <SensorCard
          label="Light Intensity"
          value={summaryLightIntensity}
          unit={summaryLightIntensity !== '—' ? 'lux' : undefined}
          icon={Sun}
          accent="brand"
          trend={deltaLight}
          isDemo={false}
          sublabel={lightSublabel}
        />
      </div>

      {/* Charts + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {hasRealSensorData && chartData.length > 0 ? (
            <>
              <SensorChart
                title={chartTitle}
                isDemo={false}
                data={chartData}
                xKey="label"
                height={260}
                action={plantSelector}
                series={[
                  { key: 'soilMoisture', label: 'Soil moisture reading', color: '#0ea5e9' },
                  { key: 'humidity', label: 'Humidity (%)', color: '#5d8443' },
                ]}
              />
              <SensorChart
                title="Temperature trend"
                isDemo={false}
                data={chartData}
                xKey="label"
                height={220}
                unit="°C"
                series={[{ key: 'temperature', label: 'Temperature (°C)', color: '#f59e0b' }]}
              />
            </>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{chartTitle}</h3>
                {plantSelector}
              </div>
              <EmptyState
                icon={<Droplets className="w-6 h-6" />}
                title="No sensor data available"
                description={
                  selectedPlantId === 'all'
                    ? 'Live telemetry will appear here once an ESP32 microcontroller or sensor device records data to the backend API.'
                    : `No sensor telemetry recorded yet for ${plants.find((p) => p.id === selectedPlantId)?.name || 'this plant'}.`
                }
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Plant health summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Plant health</h3>
              <Link to="/plants" className="text-xs text-brand-700 font-medium hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {(['healthy', 'warning', 'critical', 'unknown'] as const).map((status) => {
                const count = healthCounts[status] ?? 0;
                const meta = healthStatusMeta[status];
                const pct = plants.length ? (count / plants.length) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="font-semibold text-gray-800 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${meta.dot}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent alerts */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent alerts</h3>
              <Link to="/alerts" className="text-xs text-brand-700 font-medium hover:underline">
                All alerts
              </Link>
            </div>
            {unackAlerts.length === 0 ? (
              <EmptyState
                icon={<Activity className="w-6 h-6" />}
                title="No active alerts"
                description="All your plants are within normal ranges."
              />
            ) : (
              <div className="space-y-3">
                {unackAlerts.map((a) => (
                  <AlertRow key={a.id} alert={a} compact onAcknowledge={acknowledgeAlert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent plants + images */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Registered plants</h3>
            <Link to="/plants" className="text-xs text-brand-700 font-medium hover:underline inline-flex items-center gap-1">
              Manage plants <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {plants.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Sprout className="w-6 h-6" />}
                title="No plants yet"
                description="Add your first plant to start monitoring."
                action={
                  <Link to="/plants" className="btn-primary">
                    <Sprout className="w-4 h-4" /> Add a plant
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {plants.slice(0, 6).map((p) => (
                <PlantCard key={p.id} plant={p} reading={latestReadings[p.id]} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Recent images</h3>
            <Link to="/analysis" className="text-xs text-brand-700 font-medium hover:underline inline-flex items-center gap-1">
              <Camera className="w-3 h-3" /> Analyze
            </Link>
          </div>
          <div className="card p-3 grid grid-cols-2 gap-3">
            {recentImages.map((p) => (
              <Link
                key={p.id}
                to={`/plants/${p.id}`}
                className="relative group rounded-xl overflow-hidden aspect-square"
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-white/70">{timeAgo(p.addedAt)}</p>
                </div>
              </Link>
            ))}
          </div>

          {unackAlerts.length > 0 && (
            <div className="mt-4 card p-4 border-l-4 border-l-danger-500">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {unackAlerts.length} alert{unackAlerts.length > 1 ? 's' : ''} need attention
                  </p>
                  <Link
                    to="/alerts"
                    className="text-xs text-brand-700 font-medium hover:underline"
                  >
                    Review now
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
