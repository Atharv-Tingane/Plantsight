import { useState } from 'react';
import { Sprout, Plus, X, Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PlantCard } from '@/components/PlantCard';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';
import { fileToDataUrl } from '@/lib/format';
import type { Plant } from '@/types';

const plantSpeciesSuggestions = [
  'Ocimum basilicum',
  'Monstera deliciosa',
  'Sansevieria trifasciata',
  'Solanum lycopersicum',
  'Aloe barbadensis',
  'Ficus lyrata',
  'Epipremnum aureum',
  'Rosmarinus officinalis',
];

export function MyPlantsPage() {
  const { plants, latestReadings, addPlant, loading, isDemoData } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = plants.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.species.toLowerCase().includes(query.toLowerCase()) ||
      p.location.toLowerCase().includes(query.toLowerCase())
  );

  if (loading && plants.length === 0) return <LoadingState label="Loading plants…" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Plants"
        subtitle={`${plants.length} plant${plants.length === 1 ? '' : 's'} registered`}
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add plant
          </button>
        }
      />

      {plants.length > 0 && (
        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
            placeholder="Search by name, species, or location"
            aria-label="Search plants"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          {plants.length === 0 ? (
            <EmptyState
              icon={<Sprout className="w-6 h-6" />}
              title="No plants yet"
              description="Add your first plant to start tracking its health and sensor readings."
              action={
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Add your first plant
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No matches"
              description={`No plants match "${query}".`}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <PlantCard key={p.id} plant={p} reading={latestReadings[p.id]} />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddPlantModal
          onClose={() => setModalOpen(false)}
          submitting={submitting}
          onSubmit={async (data) => {
            setSubmitting(true);
            try {
              await addPlant(data);
              setModalOpen(false);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}

      {isDemoData && plants.length > 0 && (
        <p className="mt-6 text-xs text-gray-400">
          Showing demo plants. Connect your backend to load real data.
        </p>
      )}
    </div>
  );
}

interface AddPlantModalProps {
  onClose: () => void;
  onSubmit: (data: Pick<Plant, 'name' | 'species' | 'location' | 'imageUrl' | 'notes'>) => void;
  submitting: boolean;
}

function AddPlantModal({ onClose, onSubmit, submitting }: AddPlantModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?auto=compress&cs=tinysrgb&w=800'
  );
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      setImageUrl(url);
    } catch {
      setError('Could not read image file');
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !species.trim() || !location.trim()) {
      setError('Please fill in name, species, and location.');
      return;
    }
    onSubmit({ name: name.trim(), species: species.trim(), location: location.trim(), imageUrl, notes: notes.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Add a new plant</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Image picker */}
          <div>
            <label className="label">Plant photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="Plant preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Sprout className="w-6 h-6" />
                  </div>
                )}
              </div>
              <label className="btn-ghost cursor-pointer">
                <Plus className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
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

          <div>
            <label htmlFor="plant-name" className="label">Plant name *</label>
            <input
              id="plant-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kitchen Basil"
              required
            />
          </div>

          <div>
            <label htmlFor="plant-species" className="label">Species *</label>
            <input
              id="plant-species"
              className="input"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              list="species-suggestions"
              placeholder="e.g. Ocimum basilicum"
              required
            />
            <datalist id="species-suggestions">
              {plantSpeciesSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="plant-location" className="label">Location *</label>
            <input
              id="plant-location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kitchen windowsill"
              required
            />
          </div>

          <div>
            <label htmlFor="plant-notes" className="label">Notes (optional)</label>
            <textarea
              id="plant-notes"
              className="input min-h-[80px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Watering schedule, care notes, etc."
            />
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || uploading}>
            {submitting ? 'Saving…' : 'Save plant'}
          </button>
        </div>
      </form>
    </div>
  );
}
