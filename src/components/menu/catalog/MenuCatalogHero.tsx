import { Badge } from '../../ui/badge';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
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
  heroMetrics: PublicMediaKitHeroMetric[];
  flowLabel: string;
  locationLabel: string | null;
};

export function MenuCatalogHero({
  companyName,
  logoUrl,
  heroImageUrl,
  generatedAt,
  heroMetrics,
  flowLabel,
  locationLabel,
}: MenuCatalogHeroProps) {
  const year = resolveYear(generatedAt);

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <ImageWithFallback src={heroImageUrl} alt={companyName} className="h-full w-full object-cover opacity-45" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.35),transparent_30%),radial-gradient(circle_at_left,rgba(59,130,246,0.24),transparent_22%),linear-gradient(135deg,#020617_0%,#0f172a_42%,#111827_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(2,6,23,0.92)_15%,rgba(15,23,42,0.78)_48%,rgba(15,23,42,0.66)_100%)]" />
      </div>

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">
              {companyName}
            </Badge>
            <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/85 hover:bg-white/10">
              {flowLabel}
            </Badge>
            {locationLabel ? (
              <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/85 hover:bg-white/10">
                {locationLabel}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/80">
            {formatGeneratedAt(generatedAt)}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[26px] border border-white/10 bg-white/95 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
                {logoUrl ? (
                  <ImageWithFallback src={logoUrl} alt={companyName} className="h-full w-full object-contain" />
                ) : (
                  <div className="text-xl font-semibold text-slate-900">{companyName.slice(0, 1) || 'M'}</div>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/55">Mídia Kit</div>
                <div className="mt-1 text-base font-medium text-white/85">{companyName}</div>
              </div>
            </div>

            <div className="mt-7 text-4xl font-semibold tracking-[0.24em] text-white sm:text-5xl lg:text-6xl">MÍDIA</div>
            <div className="text-4xl font-semibold tracking-[0.24em] text-white sm:text-5xl lg:text-6xl">KIT {year}</div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-[15px]">
              Explore o inventário público em uma experiência única, com capa institucional, visão comercial dos pontos e acesso direto ao funil de detalhe,
              faces, carrinho e envio de proposta.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroMetrics.slice(0, 4).map((metric) => (
              <div
                key={metric.id}
                className="rounded-[24px] border border-white/12 bg-white/10 p-4 shadow-[0_18px_44px_rgba(2,6,23,0.18)] backdrop-blur-sm"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">{metric.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{metric.value}</div>
                {metric.helperText ? <div className="mt-1 text-xs leading-5 text-white/60">{metric.helperText}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
