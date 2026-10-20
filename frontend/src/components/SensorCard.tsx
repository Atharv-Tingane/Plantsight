import { LucideIcon } from 'lucide-react';
import { DemoBadge } from './DemoBadge';

interface SensorCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  accent?: 'brand' | 'warning' | 'danger' | 'blue' | 'accent';
  trend?: number; // delta vs previous
  isDemo?: boolean;
  sublabel?: string;
}

const accentMap = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'ring-brand-100' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-600', ring: 'ring-accent-100' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', ring: 'ring-warning-100' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', ring: 'ring-danger-100' },
  blue: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
};

export function SensorCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'brand',
  trend,
  isDemo,
  sublabel,
}: SensorCardProps) {
  const a = accentMap[accent];
  return (
    <div className="card p-5 flex flex-col gap-3 transition hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl ${a.bg} ${a.text} flex items-center justify-center ring-4 ${a.ring}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {isDemo && <DemoBadge />}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="mt-1 text-2xl font-display font-semibold text-gray-900 tabular-nums">
          {value}
          {unit && <span className="ml-1 text-base font-medium text-gray-400">{unit}</span>}
        </p>
        {(sublabel || trend !== undefined) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend !== undefined && (
              <span
                className={`font-medium ${
                  trend > 0 ? 'text-success-600' : trend < 0 ? 'text-danger-600' : 'text-gray-400'
                }`}
              >
                {trend > 0 ? '▲' : trend < 0 ? '▼' : '–'} {Math.abs(trend)}
              </span>
            )}
            {sublabel && <span className="text-gray-400">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
