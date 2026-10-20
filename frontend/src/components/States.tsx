import { ReactNode } from 'react';

interface StateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-600 flex items-center justify-center mb-4">
        !
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500 mt-3">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
      <div className="h-8 w-20 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-32 bg-gray-50 rounded" />
    </div>
  );
}
