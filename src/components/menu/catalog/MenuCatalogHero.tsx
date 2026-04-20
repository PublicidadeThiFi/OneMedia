import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { cn } from '../../../lib/utils';
import { PublicMediaKitHeroMetric } from '../../../lib/publicMediaKit';

function formatGeneratedAt(value: string | null): string {
  if (!value) return 'Última atualização indisponível';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Última atualização indisponível';
  return `Última atualização em ${date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} (horário de Brasília)`;
}

function resolveYear(value: string | null): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : String(new Date().getFullYear());
}

type MenuCatalogHeroProps = {
  companyName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  generatedAt: string | null;
  lastInventoryChangeAt: string | null;
  heroMetrics: PublicMediaKitHeroMetric[];
};

function MetricCard({ metric, className }: { metric: PublicMediaKitHeroMetric; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-sm',
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{metric.value}</div>
      {metric.helperText ? <div className="mt-1 text-xs leading-5 text-slate-500">{metric.helperText}</div> : null}
    </div>
  );
}

export function MenuCatalogHero({
  companyName,
  logoUrl,
  heroImageUrl,
  generatedAt,
  lastInventoryChangeAt,
  heroMetrics,
}: MenuCatalogHeroProps) {
  const displayUpdatedAt = lastInventoryChangeAt ?? generatedAt;
  const year = resolveYear(displayUpdatedAt ?? generatedAt);
  const metrics = heroMetrics.slice(0, 4);

  return (
    <section className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="px-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:text-left sm:text-sm sm:tracking-[0.18em]">
        Mídia Kit <span className="mx-2 text-slate-300">|</span> {companyName}
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-2 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[34px] sm:p-3">
        <div className="relative isolate overflow-hidden rounded-[24px] border border-white/70 bg-[#eaf2ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[30px]">
          <div className="absolute inset-0">
            {heroImageUrl ? (
              <ImageWithFallback
                src={heroImageUrl}
                alt={companyName}
                className="h-full w-full object-cover object-center brightness-[0.96] saturate-[0.92]"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.58),transparent_26%),radial-gradient(circle_at_left,rgba(96,165,250,0.22),transparent_28%),linear-gradient(135deg,#edf5ff_0%,#dcecff_45%,#f7fbff_100%)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.14)_40%,rgba(15,23,42,0.08)_78%,rgba(15,23,42,0.14)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.12)_100%)]" />
          </div>

          <div className="relative flex min-h-[230px] flex-col justify-between p-4 sm:min-h-[300px] sm:p-6 lg:min-h-[360px] lg:p-8 xl:min-h-[400px]">
            <div className="h-3 sm:h-4" />

            <div className="flex flex-1 items-center justify-center px-2 py-5 sm:px-4 sm:py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[26px] border border-white/80 bg-white/92 p-3 shadow-[0_22px_60px_rgba(15,23,42,0.12)] sm:h-[112px] sm:w-[112px] sm:rounded-[32px] sm:p-5 lg:h-[136px] lg:w-[136px]">
                  {logoUrl ? (
                    <ImageWithFallback src={logoUrl} alt={companyName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-3xl font-semibold text-slate-900">{companyName.slice(0, 1) || 'M'}</div>
                  )}
                </div>

                <div className="rounded-full border border-white/75 bg-white/78 px-4 py-1.5 text-[11px] font-medium text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:text-sm">
                  {companyName}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
              <div className="inline-flex w-full flex-col rounded-[22px] border border-white/75 bg-white/84 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:w-fit sm:px-5 sm:py-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Mídia</span>
                <span className="text-[28px] font-semibold tracking-[0.24em] text-slate-900 sm:text-[34px] lg:text-[38px]">KIT {year}</span>
              </div>

              <div className="w-full rounded-[22px] border border-white/75 bg-white/84 px-4 py-3 text-xs font-medium leading-5 text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:text-sm sm:leading-6 lg:max-w-[26rem] lg:text-right">
                {formatGeneratedAt(displayUpdatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
