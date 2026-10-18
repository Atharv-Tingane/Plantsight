interface DemoBadgeProps {
  className?: string;
}

export function DemoBadge({ className = '' }: DemoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
      title="This is demo data. Connect your backend to show live readings."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Demo data
    </span>
  );
}
