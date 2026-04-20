import {
  ArrowRight,
  ExternalLink,
  Layers3,
  MapPin,
  MonitorPlay,
  Ruler,
  Tag,
  Users,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import {
  Availability,
  PublicMediaKitPoint,
  PublicMediaKitUnit,
  computePointPriceSummary,
  getPublicMediaKitPointAddress,
  getPublicMediaKitPointMapUrl,
  getPublicMediaKitPointPrimaryImage,
  normalizeAvailability,
} from '../../../lib/publicMediaKit';
import { formatBRL } from '../../../lib/format';

type MenuCatalogCardProps = {
  point: PublicMediaKitPoint;
  isAgency: boolean;
  markupPercent: number;
  onOpenDetail: (pointId: string) => void;
};

function resolveAvailabilityTone(value: Availability): string {
  if (value === 'Disponível') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value === 'Parcial') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function applyMarkup(price: number | null, markupPercent: number, isAgency: boolean): number | null {
  if (!isAgency || price === null) return price;
  return Number((price * (1 + markupPercent / 100)).toFixed(2));
}

function getPrimaryUnit(point: PublicMediaKitPoint): PublicMediaKitUnit | null {
  if (!Array.isArray(point.units) || point.units.length === 0) return null;
  return point.units.find((unit) => unit && unit.isActive !== false) ?? point.units[0] ?? null;
}

function formatDimensionValue(value: number | null | undefined): string | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(numeric);
}

function formatDimensions(unit: PublicMediaKitUnit | null): string | null {
  if (!unit) return null;
  const width = formatDimensionValue(unit.widthM);
  const height = formatDimensionValue(unit.heightM);
  if (!width || !height) return null;
  return `${width}m x ${height}m`;
}

function formatOrientation(unit: PublicMediaKitUnit | null): string | null {
  const value = String(unit?.orientation ?? '').trim().toUpperCase();
  if (value === 'CONTRA_FLUXO') return 'Contra fluxo';
  if (value === 'FLUXO') return 'Fluxo';
  return null;
}

function formatSocialClasses(value: string[] | null | undefined): string | null {
  const items = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  return items.length > 0 ? items.join(', ') : null;
}

function formatInteger(value: number | null | undefined): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(numeric);
}

function formatDatePtBr(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('pt-BR');
  }
}

function getNextAvailabilityLabel(point: PublicMediaKitPoint): string | null {
  if (!Array.isArray(point.units) || point.units.length === 0) return null;

  const timestamps = point.units
    .map((unit) => (unit?.availableOn ? new Date(unit.availableOn).getTime() : NaN))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (timestamps.length === 0) return null;
  return formatDatePtBr(new Date(timestamps[0]).toISOString());
}

function buildOperationalSummary(
  availability: Availability,
  availableUnitsCount: number,
  occupiedUnitsCount: number,
  nextAvailabilityLabel: string | null,
): string {
  if (availability === 'Disponível') {
    return availableUnitsCount > 0 ? `${formatInteger(availableUnitsCount)} disponíveis agora` : 'Disponibilidade imediata';
  }

  if (availability === 'Parcial') {
    const free = `${formatInteger(availableUnitsCount)} disponíveis`;
    const busy = `${formatInteger(occupiedUnitsCount)} ocupadas`;
    return `${free} • ${busy}`;
  }

  if (nextAvailabilityLabel) {
    return `Próxima disponibilidade em ${nextAvailabilityLabel}`;
  }

  return 'Sem disponibilidade imediata';
}

export function MenuCatalogCard({ point, isAgency, markupPercent, onOpenDetail }: MenuCatalogCardProps) {
  const availability = normalizeAvailability(point);
  const address = getPublicMediaKitPointAddress(point);
  const imageUrl = getPublicMediaKitPointPrimaryImage(point);
  const mapUrl = getPublicMediaKitPointMapUrl(point);
  const monthPrice = computePointPriceSummary(point, 'month');
  const weekPrice = computePointPriceSummary(point, 'week');
  const visibleMonthPrice = applyMarkup(monthPrice.startingFrom, markupPercent, isAgency);
  const visibleWeekPrice = applyMarkup(weekPrice.startingFrom, markupPercent, isAgency);
  const unitsCount = Number(point.unitsCount ?? point.units?.length ?? 0);
  const occupiedUnitsCount = Number(point.occupiedUnitsCount ?? 0);
  const availableUnitsCount = Number(point.availableUnitsCount ?? Math.max(unitsCount - occupiedUnitsCount, 0));
  const primaryUnit = getPrimaryUnit(point);
  const dimensions = formatDimensions(primaryUnit);
  const orientation = formatOrientation(primaryUnit);
  const socialClasses = formatSocialClasses(point.socialClasses);
  const nextAvailabilityLabel = getNextAvailabilityLabel(point);
  const operationalSummary = buildOperationalSummary(availability, availableUnitsCount, occupiedUnitsCount, nextAvailabilityLabel);
  const categoryLabel = String(point.subcategory ?? '').trim() || 'Sem categoria';
  const typeLabel = String(point.type ?? '').trim() || 'Mídia';
  const environmentLabel = String(point.environment ?? '').trim() || null;

  return (
    <Card className="group overflow-hidden rounded-[30px] border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.10)]">
      <button type="button" className="block w-full text-left" onClick={() => onOpenDetail(point.id)}>
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          <ImageWithFallback
            src={imageUrl ?? undefined}
            alt={point.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.10)_0%,rgba(2,6,23,0.18)_35%,rgba(2,6,23,0.76)_100%)]" />

          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
            <Badge className={`rounded-full px-3 py-1.5 hover:bg-inherit ${resolveAvailabilityTone(availability)}`}>{availability}</Badge>
            <div className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm">
              Ver detalhes
            </div>
          </div>

          <div className="absolute inset-x-4 bottom-4 text-white">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              <span>{categoryLabel}</span>
              <span>•</span>
              <span>{typeLabel}</span>
              {environmentLabel ? (
                <>
                  <span>•</span>
                  <span>{environmentLabel}</span>
                </>
              ) : null}
            </div>
            <div className="mt-2 text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-[1.45rem]">{point.name}</div>
          </div>
        </div>
      </button>

      <CardContent className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Categoria</div>
              <div className="mt-1 font-medium text-slate-800">{categoryLabel}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tipo</div>
              <div className="mt-1 font-medium text-slate-800">{typeLabel}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm leading-6 text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{address || 'Endereço indisponível'}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Impacto diário</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">
              {point.dailyImpressions ? formatInteger(point.dailyImpressions) : '—'}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <Layers3 className="h-3.5 w-3.5" />
              Telas/Faces
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{unitsCount > 0 ? formatInteger(unitsCount) : '—'}</div>
            <div className="mt-1 text-xs text-slate-500">{formatInteger(occupiedUnitsCount)} ocupadas • {formatInteger(availableUnitsCount)} disponíveis</div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Status operacional</div>
            <div className="mt-2 text-sm font-semibold text-slate-950">{availability}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{operationalSummary}</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <Users className="h-3.5 w-3.5" />
              Classes sociais
            </div>
            <div className="mt-2 leading-6 text-slate-700">{socialClasses || 'Não informado'}</div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <Ruler className="h-3.5 w-3.5" />
              Dimensões / orientação
            </div>
            <div className="mt-2 leading-6 text-slate-700">
              {[dimensions, orientation].filter(Boolean).join(' • ') || 'Não informado'}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <Tag className="h-3.5 w-3.5" />
              Valor mensal
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{visibleMonthPrice !== null ? formatBRL(visibleMonthPrice) : 'Sob consulta'}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {monthPrice.isStartingFrom ? 'Leitura comercial a partir da menor face ativa.' : 'Base principal do ponto.'}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <MonitorPlay className="h-3.5 w-3.5" />
              Valor bi-semana
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{visibleWeekPrice !== null ? formatBRL(visibleWeekPrice) : 'Sob consulta'}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">Referência complementar para negociação do inventário.</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-900" onClick={() => onOpenDetail(point.id)}>
            Ver detalhes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {mapUrl ? (
            <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4">
              <a href={mapUrl} target="_blank" rel="noreferrer noopener">
                Ver no Google Maps
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
