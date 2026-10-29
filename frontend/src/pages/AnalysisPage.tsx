import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ScanLine,
  Camera,
  Upload,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Leaf,
  Sprout,
  Plus,
  HeartPulse,
  Activity,
  Thermometer,
  Droplets,
  Sun,
  Compass,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState, ErrorState } from '@/components/States';
import { fileToDataUrl, formatDateTime, timeAgo } from '@/utils/format';
import type { AnalysisResult } from '@/types';

export function AnalysisPage() {
  const { plants, analyses, runAnalysis, loading, error: fetchError, refresh, isDemoData } = useData();
  const [searchParams] = useSearchParams();
  const [plantId, setPlantId] = useState(searchParams.get('plantId') ?? '');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Always refresh plants on mount to ensure newly added plants are immediately available
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!plantId && plants.length > 0) setPlantId(plants[0].id);
  }, [plants, plantId]);

  async function handleFile(file: File) {
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      setImage(url);
      setResult(null);
    } catch {
      setError('Could not read image. Try a different file.');
    }
  }

  async function handleAnalyze() {
    if (!image || !plantId || analyzing) return;
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await runAnalysis(plantId, image, plant.name);
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      if (msg.toLowerCase().includes('timeout')) {
        setError('The AI botanical analysis took longer than expected. Please try again with a clear, well-lit photo.');
      } else {
        setError(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Plant Analysis"
        subtitle="Capture or upload a photo to detect symptoms, possible diseases, and care recommendations."
      />

      {fetchError && plants.length === 0 && (
        <div className="card p-6 mb-6">
          <ErrorState
            title="Failed to load registered plants"
            description={fetchError}
            action={
              <button className="btn-primary" onClick={refresh}>
                Retry loading plants
              </button>
            }
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Capture / upload panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <label htmlFor="analysis-plant" className="label">Select plant</label>
            {plants.length === 0 ? (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                <Sprout className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No plants registered yet</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Please register a plant first before diagnosing it with AI.
                </p>
                <Link to="/plants" className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" /> Register a plant in My Plants
                </Link>
              </div>
            ) : (
              <>
                <select
                  id="analysis-plant"
                  className="input"
                  value={plantId}
                  onChange={(e) => setPlantId(e.target.value)}
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.species ? `(${p.species})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  {plants.length} plant{plants.length === 1 ? '' : 's'} loaded from MongoDB Atlas.
                </p>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Plant image</h3>
              {image && (
                <button onClick={reset} className="text-xs text-gray-500 hover:text-danger-600 inline-flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {!image ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                  <Leaf className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-600 font-medium">Add a photo of your plant</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">JPG or PNG. Use your camera or upload a file.</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <label className="btn-primary cursor-pointer">
                    <Camera className="w-4 h-4" /> Take photo
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                  <label className="btn-ghost cursor-pointer">
                    <Upload className="w-4 h-4" /> Upload
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={image} alt="Plant to analyze" className="w-full max-h-80 object-cover" />
              </div>
            )}

            {error && <p className="text-sm text-danger-600 mt-3">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={!image || !plantId || analyzing || plants.length === 0}
              className="btn-primary w-full mt-4"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Analyze image
                </>
              )}
            </button>
            {isDemoData && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Demo mode — analysis is simulated locally.
              </p>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {analyzing ? (
            <div className="card p-8">
              <LoadingState label="Analyzing image for symptoms…" />
            </div>
          ) : result ? (
            <AnalysisResultCard result={result} />
          ) : (
            <div className="card">
              <EmptyState
                icon={<ScanLine className="w-6 h-6" />}
                title="No analysis yet"
                description="Add a plant photo and run an analysis to see detected symptoms, possible diseases, and recommendations here."
              />
            </div>
          )}
        </div>
      </div>

      {/* Previous analyses */}
      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-3">Previous analyses</h3>
        {analyses.length === 0 ? (
          <div className="card">
            <EmptyState icon={<ScanLine className="w-6 h-6" />} title="No previous analyses" description="Your analysis history will appear here." />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((a) => (
              <Link
                key={a.id}
                to={`/plants/${a.plantId}`}
                className="card overflow-hidden hover:shadow-soft transition group"
              >
                <div className="h-32 bg-brand-50 overflow-hidden">
                  <img src={a.imageUrl} alt={a.plantName} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-800 truncate">{a.plantName}</p>
                    <span className="badge bg-brand-50 text-brand-700">{Math.round(a.confidence * 100)}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {a.possibleDiseases[0]?.name ?? 'Analysis'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2">{timeAgo(a.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const uncertaintyMeta = {
    low: { label: 'Low uncertainty', badge: 'bg-success-50 text-success-600', icon: CheckCircle2 },
    medium: { label: 'Moderate uncertainty', badge: 'bg-warning-50 text-warning-600', icon: AlertTriangle },
    high: { label: 'High uncertainty', badge: 'bg-danger-50 text-danger-600', icon: AlertTriangle },
  };
  const u = uncertaintyMeta[result.uncertainty || 'medium'];

  return (
    <div className="card p-5 animate-fade-in space-y-5">
      {/* Top Meta Bar */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 flex-wrap">
        <span className="badge bg-brand-50 text-brand-700">
          <Sparkles className="w-3 h-3" /> Botanical AI Analysis
        </span>
        <span className={`badge ${u.badge}`}>
          <u.icon className="w-3 h-3" /> {u.label}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{formatDateTime(result.createdAt)}</span>
      </div>

      {/* 1. Plant Identification */}
      <Section title="1. Plant Identification" icon={<Sprout className="w-4 h-4" />}>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h4 className="text-base font-bold text-gray-900">
                {result.plantIdentification?.commonName || result.plantName}
              </h4>
              {result.plantIdentification?.scientificName && (
                <p className="text-xs text-gray-500 italic mt-0.5">
                  {result.plantIdentification.scientificName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.plantIdentification?.isIdentified ? (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3 h-3" /> Identified
                </span>
              ) : (
                <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                  <HelpCircle className="w-3 h-3" /> Identification Uncertain
                </span>
              )}
              {result.plantIdentification?.confidence != null && (
                <span className="badge bg-brand-50 text-brand-700 text-xs">
                  {Math.round(result.plantIdentification.confidence * 100)}% match
                </span>
              )}
            </div>
          </div>
          {result.plantIdentification?.description && (
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {result.plantIdentification.description}
            </p>
          )}
          {result.plantIdentification?.notes && (
            <div className="mt-3 p-2.5 rounded-lg bg-white border border-gray-200/80 text-[11px] text-gray-600 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
              <span>{result.plantIdentification.notes}</span>
            </div>
          )}
        </div>
      </Section>

      {/* 2. Overall Health Status */}
      <Section title="2. Overall Health Status" icon={<HeartPulse className="w-4 h-4" />}>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Status</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                result.healthStatus === 'healthy' ? 'bg-emerald-500' :
                result.healthStatus === 'critical' ? 'bg-danger-500' :
                result.healthStatus === 'warning' ? 'bg-warning-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-semibold capitalize text-gray-850">
                {result.healthStatus || 'Healthy'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Severity</span>
            <span className={`badge ${
              result.severity === 'high' ? 'bg-danger-50 text-danger-700 border border-danger-200' :
              result.severity === 'moderate' ? 'bg-warning-50 text-warning-700 border border-warning-200' :
              'bg-success-50 text-success-700 border border-success-200'
            }`}>
              {result.severity ? `${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)} severity` : 'Low severity'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Confidence</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 tabular-nums">
                {Math.round(result.confidence * 100)}%
              </span>
              <span className={`badge text-[10px] ${u.badge}`}>{u.label}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Detailed Diagnosis */}
      <Section title="3. Detailed Diagnosis" icon={<Activity className="w-4 h-4" />}>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-750 leading-relaxed space-y-2">
          <p>
            {result.detailedDiagnosis ||
              (result.possibleDiseases[0]
                ? `Visual assessment indicates ${result.possibleDiseases[0].name.toLowerCase()} with an estimated probability of ${Math.round(result.possibleDiseases[0].probability * 100)}%. Observations are distinguished from diagnostic hypotheses.`
                : 'Foliage structure and coloration are consistent with healthy vegetative growth.')}
          </p>
          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-200/60 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>Visual markers are observed facts; causal pathogens or abiotic stressors are diagnostic hypotheses.</span>
          </div>
        </div>
      </Section>

      {/* 4. Observed Symptoms */}
      <Section title="4. Observed Symptoms" icon={<Info className="w-4 h-4" />}>
        {result.symptoms && result.symptoms.length > 0 ? (
          <ul className="space-y-1.5">
            {result.symptoms.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No abnormal foliar symptoms detected.</p>
        )}
      </Section>

      {/* 5. Possible Causes */}
      <Section title="5. Possible Causes" icon={<AlertTriangle className="w-4 h-4" />}>
        <div className="space-y-3">
          {(result.possibleCauses || result.possibleDiseases).map((item, i) => {
            const causeName = 'cause' in item ? item.cause : item.name;
            const prob = item.probability;
            const explanation = 'explanation' in item ? item.explanation : null;
            const altCauses = item.alternativeCauses || [];

            return (
              <div key={i} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-gray-900">{causeName}</p>
                  <span className="text-xs font-bold text-gray-700 tabular-nums bg-white px-2 py-0.5 rounded border border-gray-200">
                    {Math.round(prob * 100)}% probability
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
                  <div
                    className={`h-full ${
                      prob > 0.7 ? 'bg-danger-500' : prob > 0.4 ? 'bg-warning-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
                {explanation && (
                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                    {explanation}
                  </p>
                )}
                {altCauses.length > 0 && (
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-200/50">
                    <span className="font-medium text-gray-600">Alternative causes to evaluate:</span>
                    {altCauses.map((ac, idx) => (
                      <span key={idx} className="badge bg-white text-gray-600 border border-gray-200 text-[10px]">
                        {ac}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 6. Recommended Treatment */}
      <Section title="6. Recommended Treatment" icon={<CheckCircle2 className="w-4 h-4" />}>
        <div className="space-y-2">
          {(result.treatment || result.recommendations).map((t, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/80 text-sm text-gray-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Ideal Growing Environment */}
      <Section title="7. Ideal Growing Environment" icon={<Compass className="w-4 h-4" />}>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          {/* Temperature */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              <span>Temperature Range</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {result.idealEnvironment?.temperature?.min != null && result.idealEnvironment?.temperature?.max != null
                ? `${result.idealEnvironment.temperature.min}°C – ${result.idealEnvironment.temperature.max}°C`
                : '18°C – 28°C'}
            </p>
            {result.idealEnvironment?.temperature?.description && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {result.idealEnvironment.temperature.description}
              </p>
            )}
          </div>

          {/* Humidity */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>Preferred Humidity</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {result.idealEnvironment?.humidity?.min != null && result.idealEnvironment?.humidity?.max != null
                ? `${result.idealEnvironment.humidity.min}% – ${result.idealEnvironment.humidity.max}% RH`
                : '45% – 65% RH'}
            </p>
            {result.idealEnvironment?.humidity?.description && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {result.idealEnvironment.humidity.description}
              </p>
            )}
          </div>

          {/* Sunlight */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Sunlight Exposure</span>
            </div>
            <p className="text-xs text-gray-800 leading-snug">
              {result.idealEnvironment?.sunlight || 'Bright indirect to direct sunlight'}
            </p>
          </div>

          {/* Watering */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-500" />
              <span>Watering Needs</span>
            </div>
            <p className="text-xs text-gray-800 leading-snug">
              {result.idealEnvironment?.watering || 'Water when top 2–3 cm of soil is dry'}
            </p>
          </div>
        </div>

        {/* Soil & Location Notes */}
        {(result.idealEnvironment?.soil || result.idealEnvironment?.indoorOutdoor || result.idealEnvironment?.speciesRequirements) && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
            {result.idealEnvironment.soil && (
              <div>
                <span className="font-semibold text-gray-700">Soil & Drainage: </span>
                <span className="text-gray-600">{result.idealEnvironment.soil}</span>
              </div>
            )}
            {result.idealEnvironment.indoorOutdoor && (
              <div>
                <span className="font-semibold text-gray-700">Placement Suitability: </span>
                <span className="text-gray-600">{result.idealEnvironment.indoorOutdoor}</span>
              </div>
            )}
            {result.idealEnvironment.speciesRequirements && (
              <div>
                <span className="font-semibold text-gray-700">Species-Specific Notes: </span>
                <span className="text-gray-600">{result.idealEnvironment.speciesRequirements}</span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 8. Current Environment vs. Ideal Conditions */}
      <Section title="8. Current Environment vs. Ideal Conditions" icon={<Thermometer className="w-4 h-4" />}>
        {result.environmentalComparison?.hasSensorData ? (
          <div className="space-y-3">
            {/* Live Telemetry Status Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-brand-50 border border-emerald-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live ESP32 Microclimate Telemetry</span>
              </div>
              <span className="text-[11px] text-gray-500">
                {result.environmentalComparison.timestamp ? formatDateTime(result.environmentalComparison.timestamp) : 'Recent telemetry'}
              </span>
            </div>

            {/* Assessment Grid */}
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Temperature Assessment */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temperature
                  </span>
                  <span className={`badge text-[10px] ${
                    result.environmentalComparison.temperatureAssessment?.status === 'optimal'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {result.environmentalComparison.temperatureAssessment?.status === 'optimal' ? 'Optimal' : 'Needs attention'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-base font-bold text-gray-900">
                    {result.environmentalComparison.temperatureAssessment?.current != null
                      ? `${result.environmentalComparison.temperatureAssessment.current}°C`
                      : '—'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Target: {result.environmentalComparison.temperatureAssessment?.targetRange || '18°C – 28°C'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-normal">
                  {result.environmentalComparison.temperatureAssessment?.evaluation}
                </p>
              </div>

              {/* Humidity Assessment */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" /> Relative Humidity
                  </span>
                  <span className={`badge text-[10px] ${
                    result.environmentalComparison.humidityAssessment?.status === 'optimal'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {result.environmentalComparison.humidityAssessment?.status === 'optimal' ? 'Optimal' : 'Needs attention'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-base font-bold text-gray-900">
                    {result.environmentalComparison.humidityAssessment?.current != null
                      ? `${result.environmentalComparison.humidityAssessment.current}% RH`
                      : '—'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Target: {result.environmentalComparison.humidityAssessment?.targetRange || '45% – 65% RH'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-normal">
                  {result.environmentalComparison.humidityAssessment?.evaluation}
                </p>
              </div>

              {/* Soil Moisture Assessment */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Soil Moisture
                  </span>
                  <span className="badge bg-gray-100 text-gray-600 text-[10px]">
                    Uncalibrated Sensor
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-normal">
                  {result.environmentalComparison.soilMoistureAssessment?.evaluation ||
                    'Hardware probe value is uncalibrated. Check hydration manually by touch.'}
                </p>
              </div>

              {/* Light Intensity Assessment */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Ambient Light
                  </span>
                  <span className="badge bg-gray-100 text-gray-600 text-[10px]">
                    Qualitative ADC
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-normal">
                  {result.environmentalComparison.lightAssessment?.evaluation ||
                    'Ambient illumination provides qualitative daytime exposure context.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <Thermometer className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-gray-700">No Live Sensor Telemetry</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
              Live microclimate comparison will display once your ESP32 streams temperature and humidity readings for this plant.
            </p>
          </div>
        )}
      </Section>

      {/* 9. Personalized Recommendations */}
      <Section title="9. Personalized Recommendations" icon={<Sparkles className="w-4 h-4" />}>
        <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50/70 to-emerald-50/60 border border-brand-100/80 space-y-3">
          <div>
            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Practical Action Plan
            </h5>
            <ul className="space-y-1.5">
              {(result.environmentalComparison?.practicalRecommendations || result.recommendations).map((rec, i) => (
                <li key={i} className="text-xs text-gray-800 flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-600 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {result.followUpCare && result.followUpCare.length > 0 && (
            <div className="pt-2.5 border-t border-brand-100/80">
              <h5 className="text-[11px] font-bold text-gray-850 uppercase tracking-wider mb-1.5">
                Follow-Up Care & Monitoring
              </h5>
              <ul className="space-y-1">
                {result.followUpCare.map((f, i) => (
                  <li key={i} className="text-xs text-gray-650 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* Scientific Caution Callout */}
      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          AI botanical results are supportive diagnostic aids and not a substitute for laboratory pathogen assays.
          When symptoms persist or uncertainty is high, consult a certified plant pathologist or agricultural extension service.
        </span>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <span className="text-brand-600">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}
