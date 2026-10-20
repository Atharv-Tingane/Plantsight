import type { HealthStatus, AlertSeverity } from '@/types';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

export const healthStatusMeta: Record<
  HealthStatus,
  { label: string; badge: string; dot: string; ring: string }
> = {
  healthy: {
    label: 'Healthy',
    badge: 'bg-success-50 text-success-600',
    dot: 'bg-success-500',
    ring: 'ring-success-500/20',
  },
  warning: {
    label: 'Needs Attention',
    badge: 'bg-warning-50 text-warning-600',
    dot: 'bg-warning-500',
    ring: 'ring-warning-500/20',
  },
  critical: {
    label: 'Critical',
    badge: 'bg-danger-50 text-danger-600',
    dot: 'bg-danger-500',
    ring: 'ring-danger-500/20',
  },
  unknown: {
    label: 'No Data',
    badge: 'bg-gray-100 text-gray-500',
    dot: 'bg-gray-400',
    ring: 'ring-gray-300/20',
  },
};

export const severityMeta: Record<
  AlertSeverity,
  { label: string; badge: string; icon: string }
> = {
  low: { label: 'Low', badge: 'bg-gray-100 text-gray-600', icon: 'text-gray-500' },
  medium: {
    label: 'Medium',
    badge: 'bg-warning-50 text-warning-600',
    icon: 'text-warning-500',
  },
  high: {
    label: 'High',
    badge: 'bg-danger-50 text-danger-600',
    icon: 'text-danger-500',
  },
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
