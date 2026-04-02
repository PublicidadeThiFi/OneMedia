import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Info, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { AlertItem } from './types';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs leading-relaxed text-gray-500">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50/70 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description ? <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function StatusBanner({
  title,
  description,
  variant = 'info',
}: {
  title: string;
  description?: string;
  variant?: 'info' | 'warning' | 'error' | 'muted';
}) {
  const palette =
    variant === 'error'
      ? {
          wrapper: 'border-red-100 bg-red-50/70',
          iconWrap: 'bg-white text-red-500',
          icon: <AlertTriangle className="h-4 w-4" />,
        }
      : variant === 'warning'
        ? {
            wrapper: 'border-amber-100 bg-amber-50/80',
            iconWrap: 'bg-white text-amber-500',
            icon: <RefreshCw className="h-4 w-4" />,
          }
        : variant === 'muted'
          ? {
              wrapper: 'border-gray-200 bg-gray-50/80',
              iconWrap: 'bg-white text-gray-500',
              icon: <Inbox className="h-4 w-4" />,
            }
          : {
              wrapper: 'border-blue-100 bg-blue-50/80',
              iconWrap: 'bg-white text-blue-500',
              icon: <Info className="h-4 w-4" />,
            };

  return (
    <div className={`rounded-xl border px-4 py-4 ${palette.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${palette.iconWrap}`}>
          {palette.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description ? <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p> : null}
        </div>
      </div>
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
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 ${
        active
          ? 'border-gray-200 bg-white text-gray-900 shadow-sm'
          : 'border-transparent bg-transparent text-gray-600 hover:border-gray-200 hover:bg-white/80 hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

export function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm">
      <span className="text-gray-500">{label}:</span> {value}
    </div>
  );
}

export function SeverityDot({ severity }: { severity: AlertItem['severity'] }) {
  const cls = severity === 'HIGH' ? 'bg-red-500' : severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

export function WidgetCard({
  id,
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
  id?: string;
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
    <div id={id} className="print-avoid-break">
      <Card className="border-gray-200/90 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              {subtitle ? <p className="mt-1 text-xs leading-relaxed text-gray-500">{subtitle}</p> : null}
            </div>
            {actions ? (
              <div className="flex items-center gap-2" data-no-print>
                {actions}
              </div>
            ) : null}
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
    </div>
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
    <Card
      className={`border-gray-200/90 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{value || '—'}</p>
            {helper ? (
              <p
                className={`mt-2 text-xs leading-relaxed text-gray-500 ${helper.includes('BACKEND:') ? 'backend-hint' : ''}`.trim()}
              >
                {helper}
              </p>
            ) : null}
            {typeof delta === 'number' && spark ? (
              <div className="mt-3 flex items-center justify-between gap-3">
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
