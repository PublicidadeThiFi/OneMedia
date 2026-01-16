import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { AlertItem } from './types';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-900">{title}</p>
      {description ? <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-8">
      <p className="text-sm text-gray-900">{title}</p>
      {description ? <p className="text-xs text-gray-500 mt-1">{description}</p> : null}
    </div>
  );
}

export function Sparkline({ points }: { points: number[] }) {
  if (!points || points.length === 0) return null;
  const w = 80;
  const h = 24;
  const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * w);
  const ys = points.map((p) => h - (p / 100) * h);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
    </svg>
  );
}

function Delta({ value }: { value: number }) {
  const sign = value > 0 ? '+' : '';
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500';
  return (
    <span className={`text-xs ${color}`}>
      {sign}
      {value}%
    </span>
  );
}

export function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
        active
          ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
          : 'bg-transparent text-gray-600 border-transparent hover:bg-white/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs whitespace-nowrap">
      <span className="text-gray-500">{label}:</span> {value}
    </div>
  );
}

export function SeverityDot({ severity }: { severity: AlertItem['severity'] }) {
  const cls = severity === 'HIGH' ? 'bg-red-500' : severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

export function WidgetCard({
  title,
  subtitle,
  actions,
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: { title: string; description?: string } | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <ErrorState title={error.title} description={error.description} />
        ) : empty ? (
          <EmptyState title={emptyTitle || 'Sem dados'} description={emptyDescription} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  helper,
  delta,
  spark,
  onClick,
  loading,
}: {
  label: string;
  value?: string;
  helper?: string;
  delta?: number;
  spark?: number[];
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-sm' : ''} onClick={onClick}>
      <CardContent className="pt-5">
        <p className="text-xs text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </div>
        ) : (
          <>
            <p className="text-gray-900 mt-1">{value || '—'}</p>
            {helper ? <p className="text-xs text-gray-500 mt-2">{helper}</p> : null}
            {typeof delta === 'number' && spark ? (
              <div className="mt-2 flex items-center justify-between">
                <Delta value={delta} />
                <Sparkline points={spark} />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
