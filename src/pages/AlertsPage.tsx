import { useState, useMemo } from 'react';
import { Bell, CheckCircle2, Filter, AlertTriangle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { AlertRow } from '@/components/AlertRow';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';
import type { AlertSeverity, AlertItem } from '@/types';

type FilterKey = 'all' | 'unack' | 'low' | 'medium' | 'high';

export function AlertsPage() {
  const { alerts, acknowledgeAlert, loading } = useData();
  const [filter, setFilter] = useState<FilterKey>('all');

  if (loading && alerts.length === 0) return <LoadingState label="Loading alerts…" />;

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'unack') return !a.acknowledged;
      return a.severity === filter;
    });
  }, [alerts, filter]);

  const bySeverity: Record<AlertSeverity, number> = { low: 0, medium: 0, high: 0 };
  alerts.forEach((a) => { bySeverity[a.severity]++; });

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: alerts.length },
    { key: 'unack', label: 'Unacknowledged', count: unackCount },
    { key: 'high', label: 'High', count: bySeverity.high },
    { key: 'medium', label: 'Medium', count: bySeverity.medium },
    { key: 'low', label: 'Low', count: bySeverity.low },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Alerts"
        subtitle={`${unackCount} active alert${unackCount === 1 ? '' : 's'} need${unackCount === 1 ? 's' : ''} attention.`}
        action={
          unackCount > 0 ? (
            <span className="badge bg-danger-50 text-danger-600">
              <AlertTriangle className="w-3 h-3" /> {unackCount} active
            </span>
          ) : undefined
        }
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1" role="group" aria-label="Filter alerts">
          {filterOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => setFilter(o.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                filter === o.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              aria-pressed={filter === o.key}
            >
              {o.label}
              <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                {o.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          {alerts.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-6 h-6" />}
              title="No alerts yet"
              description="When sensor readings go out of range or a disease is detected, alerts will appear here."
            />
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="All caught up"
              description="No alerts match this filter."
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
            .map((a) => (
              <AlertRow key={a.id} alert={a as AlertItem} onAcknowledge={acknowledgeAlert} />
            ))}
        </div>
      )}
    </div>
  );
}
