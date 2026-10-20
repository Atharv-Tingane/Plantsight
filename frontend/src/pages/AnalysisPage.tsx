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
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';
import { fileToDataUrl, formatDateTime, timeAgo } from '@/utils/format';
import type { AnalysisResult } from '@/types';

export function AnalysisPage() {
  const { plants, analyses, runAnalysis, isDemoData } = useData();
  const [searchParams] = useSearchParams();
  const [plantId, setPlantId] = useState(searchParams.get('plantId') ?? '');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Capture / upload panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <label htmlFor="analysis-plant" className="label">Select plant</label>
            <select
              id="analysis-plant"
              className="input"
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
            >
              {plants.length === 0 && <option value="">No plants available</option>}
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.species}
                </option>
              ))}
            </select>
            {plants.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                <Link to="/plants" className="text-brand-700 hover:underline">Add a plant</Link> first to run an analysis.
              </p>
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
              disabled={!image || !plantId || analyzing}
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
  const u = uncertaintyMeta[result.uncertainty];

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="badge bg-brand-50 text-brand-700">
          <Sparkles className="w-3 h-3" /> AI Analysis
        </span>
        <span className={`badge ${u.badge}`}>
          <u.icon className="w-3 h-3" /> {u.label}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{formatDateTime(result.createdAt)}</span>
      </div>

      <Section title="Observed symptoms" icon={<Info className="w-4 h-4" />}>
        <ul className="space-y-1.5">
          {result.symptoms.map((s, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Possible diseases" icon={<AlertTriangle className="w-4 h-4" />}>
        <div className="space-y-3">
          {result.possibleDiseases.map((d, i) => (
            <div key={i} className="p-3 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-800">{d.name}</p>
                <span className="text-xs font-semibold text-gray-700 tabular-nums">
                  {Math.round(d.probability * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
                <div className="h-full bg-brand-500" style={{ width: `${d.probability * 100}%` }} />
              </div>
              {d.alternativeCauses.length > 0 && (
                <p className="text-xs text-gray-500">
                  Alternative causes: {d.alternativeCauses.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Recommendations" icon={<CheckCircle2 className="w-4 h-4" />}>
        <ul className="space-y-1.5">
          {result.recommendations.map((r, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          AI results are supportive only and not a substitute for professional diagnosis. When uncertainty
          is high, consult a plant pathologist or local extension service.
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
