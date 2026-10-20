import { useState } from 'react';
import { User, Sliders, Bell, Save, Check } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/States';
import type { MonitoringPreferences, UserProfile } from '@/types';

export function SettingsPage() {
  const { profile, preferences, updateProfile, updatePreferences, isDemoData, loading } = useData();
  const [profileForm, setProfileForm] = useState<UserProfile>(profile);
  const [prefForm, setPrefForm] = useState<MonitoringPreferences>(preferences);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);

  if (loading) return <LoadingState label="Loading settings…" />;

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile(profileForm);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function handlePrefsSave(e: React.FormEvent) {
    e.preventDefault();
    await updatePreferences(prefForm);
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2000);
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and plant monitoring preferences."
      />

      {isDemoData && (
        <div className="card p-3 mb-5 bg-amber-50/60 border-amber-200 text-xs text-amber-800">
          Settings are saved locally while in demo mode. Connecting your backend will persist them.
        </div>
      )}

      {/* Profile */}
      <form onSubmit={handleProfileSave} className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">User profile</h3>
            <p className="text-xs text-gray-500">Your account information.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <img
            src={profileForm.avatarUrl}
            alt={profileForm.name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-100"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">{profileForm.name}</p>
            <p className="text-xs text-gray-500">Avatar comes from your backend profile.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-name" className="label">Full name</label>
            <input
              id="settings-name"
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="label">Email</label>
            <input
              id="settings-email"
              type="email"
              className="input"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="settings-location" className="label">Location</label>
            <input
              id="settings-location"
              className="input"
              value={profileForm.location ?? ''}
              onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" className="btn-primary">
            {savedProfile ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save profile</>}
          </button>
        </div>
      </form>

      {/* Monitoring preferences */}
      <form onSubmit={handlePrefsSave} className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Monitoring thresholds</h3>
            <p className="text-xs text-gray-500">Alerts trigger when readings cross these values.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pref-soil" className="label">Low soil moisture alert (%)</label>
            <input
              id="pref-soil"
              type="number"
              min={0}
              max={100}
              className="input"
              value={prefForm.lowSoilMoistureThreshold}
              onChange={(e) => setPrefForm({ ...prefForm, lowSoilMoistureThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="pref-temp" className="label">High temperature alert (°C)</label>
            <input
              id="pref-temp"
              type="number"
              min={0}
              max={60}
              className="input"
              value={prefForm.highTemperatureThreshold}
              onChange={(e) => setPrefForm({ ...prefForm, highTemperatureThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="pref-hum" className="label">Low humidity alert (%)</label>
            <input
              id="pref-hum"
              type="number"
              min={0}
              max={100}
              className="input"
              value={prefForm.lowHumidityThreshold}
              onChange={(e) => setPrefForm({ ...prefForm, lowHumidityThreshold: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="pref-light" className="label">Low light alert (lux)</label>
            <input
              id="pref-light"
              type="number"
              min={0}
              className="input"
              value={prefForm.lowLightThreshold}
              onChange={(e) => setPrefForm({ ...prefForm, lowLightThreshold: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" className="btn-primary">
            {savedPrefs ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save preferences</>}
          </button>
        </div>
      </form>

      {/* Notifications */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <p className="text-xs text-gray-500">Choose how you want to be notified.</p>
          </div>
        </div>

        <ToggleRow
          label="Disease alerts"
          description="Get notified when AI analysis flags a possible disease."
          checked={prefForm.diseaseAlertsEnabled}
          onChange={(v) => setPrefForm({ ...prefForm, diseaseAlertsEnabled: v })}
        />
        <ToggleRow
          label="Email notifications"
          description="Receive a summary of alerts via email."
          checked={prefForm.emailNotifications}
          onChange={(v) => setPrefForm({ ...prefForm, emailNotifications: v })}
        />

        <div className="mt-5">
          <label htmlFor="pref-unit" className="label">Measurement unit</label>
          <select
            id="pref-unit"
            className="input max-w-xs"
            value={prefForm.measurementUnit}
            onChange={(e) => setPrefForm({ ...prefForm, measurementUnit: e.target.value as 'metric' | 'imperial' })}
          >
            <option value="metric">Metric (°C, cm)</option>
            <option value="imperial">Imperial (°F, in)</option>
          </select>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={handlePrefsSave} className="btn-primary">
            {savedPrefs ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save preferences</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}
