import { useState, useMemo } from 'react';
import { Calendar, Filter, Droplets, Thermometer, Sun, Gauge } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SensorChart } from '@/components/SensorChart';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';
import { readingsToDateChartPoints } from '@/utils/chartData';
import type { SensorReading } from '@/types';

type RangeKey = '24h' | '7d' | '30d' | 'all';

const rangeMs: Record<RangeKey, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: Number.POSITIVE_INFINITY,
};

export function SensorHistoryPage() {
  const { plants, allReadings, loading, getReadingsForPlant } = useData();
  const [range, setRange] = useState<RangeKey>('7d');
  const [plantId, setPlantId] = useState<string>('all');

  const realReadings = useMemo(
    () => allReadings.filter((r) => !r.isSimulated && r.source !== 'simulated'),
    [allReadings]
  );

  if (loading && realReadings.length === 0) return <LoadingState label="Loading sensor history…" />;

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = now - rangeMs[range];
    const sourceList = plantId === 'all' ? realReadings : getReadingsForPlant(plantId);
    return sourceList.filter((r) => +new Date(r.timestamp) >= cutoff);
  }, [realReadings, plantId, range, getReadingsForPlant]);

  const chartData = readingsToDateChartPoints(filtered);
  const avg = (key: keyof SensorReading) =>
    filtered.length
      ? Math.round(
          (filtered.reduce((s, r) => s + Number(r[key]), 0) / filtered.length) * 10
        ) / 10
      : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sensor History"
        subtitle="Historical soil moisture, temperature, humidity, and light intensity readings."
        action={
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-4 h-4" />
            {filtered.length} readings
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <label htmlFor="plant-filter" className="text-sm text-gray-600">Plant</label>
          <select
            id="plant-filter"
            className="input py-2 max-w-xs"
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
          >
            <option value="all">All plants</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1" role="group" aria-label="Date range">
          {(['24h', '7d', '30d', 'all'] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                range === r ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              aria-pressed={range === r}
            >
              {r === '24h' ? '24h' : r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={<Droplets className="w-6 h-6" />}
            title="No sensor data available"
            description="No real sensor telemetry recorded yet. Connect an ESP32 sensor or POST to /api/sensors/reading."
          />
        </div>
      ) : (
        <>
          {/* Summary averages */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryTile label="Avg soil moisture" value={avg('soilMoisture')} unit="%" icon={Droplets} color="text-sky-600 bg-sky-50" />
            <SummaryTile label="Avg temperature" value={avg('temperature')} unit="°C" icon={Thermometer} color="text-orange-600 bg-orange-50" />
            <SummaryTile label="Avg humidity" value={avg('humidity')} unit="%" icon={Gauge} color="text-accent-600 bg-accent-50" />
            <SummaryTile label="Avg light" value={avg('lightIntensity')} unit="lux" icon={Sun} color="text-brand-600 bg-brand-50" />
          </div>

          <div className="space-y-6">
            <SensorChart
              title="Soil moisture history"
              isDemo={false}
              data={chartData}
              xKey="label"
              unit="%"
              series={[{ key: 'soilMoisture', label: 'Soil moisture (%)', color: '#0ea5e9' }]}
            />
            <SensorChart
              title="Temperature history"
              isDemo={false}
              data={chartData}
              xKey="label"
              unit="°"
              series={[{ key: 'temperature', label: 'Temperature (°C)', color: '#f59e0b' }]}
            />
            <SensorChart
              title="Humidity history"
              isDemo={false}
              data={chartData}
              xKey="label"
              unit="%"
              series={[{ key: 'humidity', label: 'Humidity (%)', color: '#5d8443' }]}
            />
            <SensorChart
              title="Light intensity history"
              isDemo={false}
              data={chartData}
              xKey="label"
              unit="lx"
              series={[{ key: 'lightIntensity', label: 'Light (lux)', color: '#22621e' }]}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  unit,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: typeof Droplets;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-display font-semibold text-gray-900 tabular-nums">
          {value !== null ? value : '—'}
          {value !== null && <span className="ml-1 text-sm font-medium text-gray-400">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
