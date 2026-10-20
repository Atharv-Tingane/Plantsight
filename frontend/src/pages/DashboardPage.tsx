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

  const realChartReadings = realReadings
    .filter((r) => r.plantId === plants[0]?.id)
    .slice(-24);
  const chartData = readingsToChartPoints(realChartReadings);

  // Aggregate latest readings across all plants for top cards
  const latestReal = realReadings.filter((r) => plants.some((p) => p.id === r.plantId));
  const latestSorted = [...latestReal].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  const latestOverall = latestSorted[0];
  const previous = latestSorted[1];

  const delta = (key: 'soilMoisture' | 'temperature' | 'humidity' | 'lightIntensity') =>
    latestOverall && previous ? Number((Number(latestOverall[key]) - Number(previous[key])).toFixed(1)) : undefined;

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
          label="Soil Moisture"
          value={hasRealSensorData && latestOverall?.soilMoisture !== undefined ? latestOverall.soilMoisture : '—'}
          unit={hasRealSensorData ? '%' : undefined}
          icon={Droplets}
          accent="blue"
          trend={hasRealSensorData ? delta('soilMoisture') : undefined}
          isDemo={false}
          sublabel={hasRealSensorData ? 'Average across plants' : 'No sensor data available'}
        />
        <SensorCard
          label="Temperature"
          value={hasRealSensorData && latestOverall?.temperature !== undefined ? latestOverall.temperature : '—'}
          unit={hasRealSensorData ? '°C' : undefined}
          icon={Thermometer}
          accent="warning"
          trend={hasRealSensorData ? delta('temperature') : undefined}
          isDemo={false}
          sublabel={hasRealSensorData ? 'Ambient' : 'No sensor data available'}
        />
        <SensorCard
          label="Humidity"
          value={hasRealSensorData && latestOverall?.humidity !== undefined ? latestOverall.humidity : '—'}
          unit={hasRealSensorData ? '%' : undefined}
          icon={Gauge}
          accent="accent"
          trend={hasRealSensorData ? delta('humidity') : undefined}
          isDemo={false}
          sublabel={hasRealSensorData ? 'Ambient' : 'No sensor data available'}
        />
        <SensorCard
          label="Light Intensity"
          value={hasRealSensorData && latestOverall?.lightIntensity !== undefined ? latestOverall.lightIntensity : '—'}
          unit={hasRealSensorData ? 'lux' : undefined}
          icon={Sun}
          accent="brand"
          trend={hasRealSensorData ? delta('lightIntensity') : undefined}
          isDemo={false}
          sublabel={hasRealSensorData ? 'Current' : 'No sensor data available'}
        />
      </div>

      {/* Charts + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {hasRealSensorData && chartData.length > 0 ? (
            <>
              <SensorChart
                title={`Sensor history · ${plants[0]?.name ?? ''}`}
                isDemo={false}
                data={chartData}
                xKey="label"
                height={260}
                series={[
                  { key: 'soilMoisture', label: 'Soil moisture (%)', color: '#0ea5e9' },
                  { key: 'humidity', label: 'Humidity (%)', color: '#5d8443' },
                ]}
              />
              <SensorChart
                title="Temperature trend"
                isDemo={false}
                data={chartData}
                xKey="label"
                height={220}
                unit="°"
                series={[{ key: 'temperature', label: 'Temperature (°C)', color: '#f59e0b' }]}
              />
            </>
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  Sensor History {plants[0] ? `· ${plants[0].name}` : ''}
                </h3>
              </div>
              <EmptyState
                icon={<Droplets className="w-6 h-6" />}
                title="No sensor data available"
                description="Live telemetry will appear here once an ESP32 microcontroller or sensor device records data to the backend API."
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
