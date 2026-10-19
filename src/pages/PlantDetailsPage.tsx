import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  Droplets,
  Thermometer,
  Sun,
  Gauge,
  MapPin,
  Calendar,
  ScanLine,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';
import { useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { galleryService } from '@/services/api';
import { SensorCard } from '@/components/SensorCard';
import { SensorChart } from '@/components/SensorChart';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState, ErrorState } from '@/components/States';
import { readingsToChartPoints } from '@/lib/chartData';
import { healthStatusMeta, formatDateTime, timeAgo } from '@/lib/format';
import { fileToDataUrl } from '@/lib/format';

export function PlantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plants, getReadingsForPlant, latestReadings, analyses, isDemoData, loading, deletePlant } = useData();
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plant = plants.find((p) => p.id === id);

  useEffect(() => {
    if (plant && !isDemoData) {
      galleryService
        .list(plant.id)
        .then((items) => setGallery(items.map((i) => i.url)))
        .catch(() => {});
    }
  }, [plant, isDemoData]);

  if (loading && plants.length === 0) return <LoadingState label="Loading plant…" />;

  if (!plant) {
    return (
      <div className="card">
        <ErrorState
          title="Plant not found"
          description="This plant may have been removed."
          action={
            <Link to="/plants" className="btn-primary">
              Back to My Plants
            </Link>
          }
        />
      </div>
    );
  }

  const readings = getReadingsForPlant(plant.id);
  const chartData = readingsToChartPoints(readings.slice(-48));
  const latest = latestReadings[plant.id];
  const plantAnalyses = analyses.filter((a) => a.plantId === plant.id);
  const meta = healthStatusMeta[plant.healthStatus];

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      if (!isDemoData && plant) {
        const item = await galleryService.upload(plant.id, url);
        setGallery((prev) => [item.url, ...prev]);
      } else {
        setGallery((prev) => [url, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!plant) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${plant.name}? This action cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deletePlant(plant.id);
      navigate('/plants');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plant');
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <PageHeader
        title={plant.name}
        subtitle={plant.species}
        action={
          <div className="flex items-center gap-2">
            <Link to={`/analysis?plantId=${plant.id}`} className="btn-primary">
              <ScanLine className="w-4 h-4" /> Run AI analysis
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-ghost text-danger-600 hover:bg-danger-50 hover:text-danger-700 transition"
              title="Delete plant"
            >
              <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }
      />

      {/* Hero card */}
      <div className="card overflow-hidden mb-6">
        <div className="grid md:grid-cols-3">
          <div className="relative h-56 md:h-full bg-brand-50">
            <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
            <span className={`badge absolute top-3 left-3 ${meta.badge} bg-white/90 backdrop-blur`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <div className="md:col-span-2 p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow icon={MapPin} label="Location" value={plant.location} />
              <InfoRow icon={Calendar} label="Added" value={formatDateTime(plant.addedAt)} />
              <InfoRow
                icon={AlertTriangle}
                label="Health score"
                value={plant.healthScore > 0 ? `${plant.healthScore}%` : 'Not assessed yet'}
              />
              <InfoRow icon={ScanLine} label="Analyses" value={`${plantAnalyses.length} recorded`} />
            </div>
            {plant.notes && (
              <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-600">
                {plant.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latest readings */}
      <h3 className="font-semibold text-gray-800 mb-3">Latest environmental readings</h3>
      {latest ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SensorCard label="Soil moisture" value={latest.soilMoisture} unit="%" icon={Droplets} accent="blue" isDemo={isDemoData || Boolean(latest.isSimulated)} />
          <SensorCard label="Temperature" value={latest.temperature} unit="°C" icon={Thermometer} accent="warning" isDemo={isDemoData || Boolean(latest.isSimulated)} />
          <SensorCard label="Humidity" value={latest.humidity} unit="%" icon={Gauge} accent="accent" isDemo={isDemoData || Boolean(latest.isSimulated)} />
          <SensorCard label="Light" value={latest.lightIntensity} unit="lux" icon={Sun} accent="brand" isDemo={isDemoData || Boolean(latest.isSimulated)} />
        </div>
      ) : (
        <div className="card mb-6">
          <EmptyState icon={<Droplets className="w-6 h-6" />} title="No sensor readings yet" description="Connect a sensor or your backend to stream readings." />
        </div>
      )}

      {/* Historical charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SensorChart
          title="Soil moisture & humidity history"
          isDemo={isDemoData || readings.some((r) => r.isSimulated)}
          data={chartData}
          xKey="label"
          height={220}
          series={[
            { key: 'soilMoisture', label: 'Soil (%)', color: '#0ea5e9' },
            { key: 'humidity', label: 'Humidity (%)', color: '#5d8443' },
          ]}
        />
        <SensorChart
          title="Temperature & light history"
          isDemo={isDemoData || readings.some((r) => r.isSimulated)}
          data={chartData}
          xKey="label"
          height={220}
          series={[
            { key: 'temperature', label: 'Temp (°C)', color: '#f59e0b' },
            { key: 'lightIntensity', label: 'Light (lux)', color: '#22621e' },
          ]}
        />
      </div>

      {/* Gallery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Image gallery</h3>
          <label className="btn-ghost cursor-pointer">
            <Plus className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Add image'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
        </div>
        {gallery.length === 0 ? (
          <div className="card">
            <EmptyState icon={<Plus className="w-6 h-6" />} title="No images uploaded yet" description="Add photos of this plant to build a visual timeline." />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                <img src={url} alt={`Plant ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previous analyses */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Previous AI analyses</h3>
        {plantAnalyses.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ScanLine className="w-6 h-6" />}
              title="No analyses yet"
              description="Run your first AI analysis on this plant."
              action={
                <Link to={`/analysis?plantId=${plant.id}`} className="btn-primary">
                  <ScanLine className="w-4 h-4" /> Analyze now
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {plantAnalyses.map((a) => (
              <div key={a.id} className="card p-5 flex flex-col sm:flex-row gap-4">
                <img src={a.imageUrl} alt={a.plantName} className="w-full sm:w-32 h-32 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{a.possibleDiseases[0]?.name ?? 'Analysis'}</p>
                    <span className="badge bg-brand-50 text-brand-700">
                      {Math.round(a.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {a.symptoms.slice(0, 2).join(' · ')}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {a.recommendations.slice(0, 2).map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
