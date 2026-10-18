import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Check, Droplets, Thermometer, Sun, Leaf } from 'lucide-react';
import type { AlertItem } from '@/types';
import { severityMeta, timeAgo } from '@/lib/format';

const categoryIcon = {
  soil: Droplets,
  temperature: Thermometer,
  humidity: Sun,
  light: Sun,
  disease: Leaf,
};

interface AlertRowProps {
  alert: AlertItem;
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
  showPlant?: boolean;
}

export function AlertRow({ alert, onAcknowledge, compact, showPlant = true }: AlertRowProps) {
  const sev = severityMeta[alert.severity];
  const Icon = categoryIcon[alert.category] ?? AlertTriangle;

  return (
    <div
      className={`flex gap-3 p-4 rounded-xl border transition ${
        alert.acknowledged
          ? 'bg-gray-50/60 border-gray-100 opacity-70'
          : 'bg-white border-gray-100 hover:border-brand-200'
      }`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          alert.acknowledged ? 'bg-gray-100 text-gray-400' : sev.badge
        }`}
      >
        <Icon className={`w-4.5 h-4.5 ${alert.acknowledged ? '' : sev.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-gray-800">{alert.title}</p>
          <span className={`badge ${sev.badge}`}>{sev.label}</span>
          {alert.acknowledged && (
            <span className="badge bg-gray-100 text-gray-500">
              <Check className="w-3 h-3" /> Acknowledged
            </span>
          )}
        </div>
        {!compact && <p className="text-sm text-gray-500 mt-1">{alert.message}</p>}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
          {showPlant && (
            <Link
              to={`/plants/${alert.plantId}`}
              className="hover:text-brand-700 font-medium"
            >
              {alert.plantName}
            </Link>
          )}
          <span>{timeAgo(alert.createdAt)}</span>
        </div>
      </div>
      {!alert.acknowledged && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="shrink-0 self-start text-xs font-medium text-brand-700 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-brand-200"
          aria-label={`Acknowledge alert: ${alert.title}`}
        >
          Acknowledge
        </button>
      )}
    </div>
  );
}

export function AlertBellBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}
