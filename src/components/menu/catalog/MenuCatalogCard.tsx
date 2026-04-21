import { MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ImageIcon,
  Layers3,
  MapPinned,
  MapPin,
  MonitorPlay,
  Play,
  Tag,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  Availability,
  PublicMediaKitMediaItem,
  PublicMediaKitPoint,
  PublicMediaKitUnit,
  computePointPriceSummary,
  getPublicMediaKitPointAddress,
  getPublicMediaKitPointMapUrl,
  getPublicMediaKitPointMediaGallery,
  normalizeAvailability,
} from '../../../lib/publicMediaKit';
import { formatBRL, resolveUploadsUrl } from '../../../lib/format';

type MenuCatalogCardProps = {
  point: PublicMediaKitPoint;
  isAgency: boolean;
  markupPercent: number;
  onOpenDetail: (pointId: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (pointId: string) => void;
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

function InfoLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-sm leading-6 text-slate-700">
      <span className="font-semibold text-slate-900">{label}: </span>
      <span>{value || 'Não informado'}</span>
    </div>
  );
}

function MediaFallback({ pointName }: { pointName: string }) {
  return (
    <div className="relative flex h-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_46%,#bfdbfe_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.1)_100%)]" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-slate-700">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <ImageIcon className="h-7 w-7 text-slate-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">Mídia indisponível</div>
          <div className="mt-1 max-w-[16rem] text-xs leading-5 text-slate-600">As mídias públicas deste ponto ainda não foram disponibilizadas para visualização.</div>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{pointName}</div>
      </div>
    </div>
  );
}

function hasValidPointCoordinates(point: Pick<PublicMediaKitPoint, 'latitude' | 'longitude'>): boolean {
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function CatalogCardMapAutoFit({ isActive }: { isActive: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!isActive) return undefined;

    const invalidate = () => map.invalidateSize();
    invalidate();
    const timeout = window.setTimeout(invalidate, 260);

    return () => window.clearTimeout(timeout);
  }, [isActive, map]);

  return null;
}

function CardMapFace({ point, isActive }: { point: PublicMediaKitPoint; isActive: boolean }) {
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="flex h-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full items-center justify-center bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#dbeafe_40%,#bfdbfe_100%)] px-6 text-center">
        <div>
          <div className="text-sm font-semibold text-slate-900">Mapa indisponível</div>
          <div className="mt-2 text-xs leading-5 text-slate-600">As coordenadas públicas deste ponto ainda não estão disponíveis para exibição no card.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full" onClick={(event) => event.stopPropagation()}>
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl={false}
      >
        <CatalogCardMapAutoFit isActive={isActive} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <CircleMarker
          center={[lat, lng]}
          radius={9}
          pathOptions={{ color: '#0f172a', weight: 2, fillColor: '#f97316', fillOpacity: 0.95 }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <div className="font-semibold text-slate-900">{point.name}</div>
              <div className="mt-1 text-xs text-slate-600">{getPublicMediaKitPointAddress(point) || 'Localização pública do ponto'}</div>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

function CardMediaGallery({ point, availability, categoryLabel, typeLabel, environmentLabel, onOpenDetail, isSelectionMode = false, isSelected = false, isSelectable = false, onToggleSelection }: {
  point: PublicMediaKitPoint;
  availability: Availability;
  categoryLabel: string;
  typeLabel: string;
  environmentLabel: string | null;
  onOpenDetail: (pointId: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  onToggleSelection?: (pointId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedKeys, setFailedKeys] = useState<string[]>([]);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isMapFlipped, setIsMapFlipped] = useState(false);

  const mediaGallery = useMemo(() => {
    const gallery = getPublicMediaKitPointMediaGallery(point).filter((item) => item?.url);
    if (failedKeys.length === 0) return gallery;
    const failed = new Set(failedKeys);
    return gallery.filter((item) => !failed.has(`${item.kind}:${item.url}`));
  }, [point, failedKeys]);

  const hasMapCoordinates = hasValidPointCoordinates(point);

  useEffect(() => {
    setFailedKeys([]);
    setActiveIndex(0);
    setIsVideoDialogOpen(false);
    setIsMapFlipped(false);
  }, [point.id]);

  useEffect(() => {
    if (mediaGallery.length === 0) {
      if (activeIndex !== 0) setActiveIndex(0);
      return;
    }
    if (activeIndex > mediaGallery.length - 1) {
      setActiveIndex(mediaGallery.length - 1);
    }
  }, [activeIndex, mediaGallery]);

  const activeMedia: PublicMediaKitMediaItem | null = mediaGallery[activeIndex] ?? null;
  const activeMediaUrl = resolveUploadsUrl(activeMedia?.url ?? null) ?? activeMedia?.url ?? null;
  const canNavigate = mediaGallery.length > 1;

  useEffect(() => {
    if (activeMedia?.kind !== 'video' && isVideoDialogOpen) {
      setIsVideoDialogOpen(false);
    }
  }, [activeMedia?.kind, isVideoDialogOpen]);

  const navigateGallery = (step: number) => {
    if (mediaGallery.length <= 1) return;
    setActiveIndex((current) => {
      const nextIndex = current + step;
      if (nextIndex < 0) return mediaGallery.length - 1;
      if (nextIndex >= mediaGallery.length) return 0;
      return nextIndex;
    });
  };

  const handleMediaFailure = () => {
    if (!activeMedia?.url) return;
    const failureKey = `${activeMedia.kind}:${activeMedia.url}`;
    setFailedKeys((current) => (current.includes(failureKey) ? current : [...current, failureKey]));
  };

  const handleNavigationClick = (event: MouseEvent<HTMLButtonElement>, step: number) => {
    event.stopPropagation();
    navigateGallery(step);
  };

  const handleVideoPreviewClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (activeMedia?.kind !== 'video' || !activeMediaUrl) return;
    setIsVideoDialogOpen(true);
  };

  const handleFlipToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasMapCoordinates) return;
    setIsMapFlipped((current) => !current);
  };

  const handlePrimaryMediaAction = () => {
    if (isSelectionMode) {
      if (isSelectable && typeof onToggleSelection === 'function') {
        onToggleSelection(point.id);
      }
      return;
    }

    onOpenDetail(point.id);
  };

  return (
    <>
      <div className="relative h-full min-h-[220px] w-full [perspective:1800px] sm:min-h-[240px] lg:min-h-[260px]">
        <div
          className="relative h-full min-h-[220px] w-full transition-transform duration-700 [transform-style:preserve-3d] sm:min-h-[240px] lg:min-h-[260px]"
          style={{ transform: isMapFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-none [backface-visibility:hidden]">
            <div className="relative block h-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full overflow-hidden bg-slate-100 text-left">
              <button
                type="button"
                aria-label={`Abrir detalhes de ${point.name}`}
                className="absolute inset-0 z-0"
                onClick={handlePrimaryMediaAction}
              />
              {activeMedia && activeMediaUrl ? (
                activeMedia.kind === 'video' ? (
                  <div className="relative h-full w-full bg-slate-950">
                    <button
                      type="button"
                      aria-label={`Expandir vídeo de ${point.name}`}
                      className="absolute inset-0 z-10 cursor-zoom-in"
                      onClick={handleVideoPreviewClick}
                    />
                    <video
                      key={activeMedia.id}
                      src={activeMediaUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      loop
                      autoPlay
                      preload="metadata"
                      onError={handleMediaFailure}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.12)_34%,rgba(2,6,23,0.6)_100%)]" />
                    <div className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                      Vídeo
                    </div>
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Clique para expandir
                    </div>
                    <div className="absolute inset-x-5 bottom-6 z-10 rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-center text-sm font-medium text-white backdrop-blur-sm">
                      Clique para expandir e visualizar o vídeo completo.
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageWithFallback
                      src={activeMediaUrl}
                      alt={point.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.12)_36%,rgba(15,23,42,0.52)_100%)]" />
                  </>
                )
              ) : (
                <MediaFallback pointName={point.name} />
              )}

              <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
                <Badge className={`rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-inherit ${resolveAvailabilityTone(availability)}`}>
                  {availability}
                </Badge>
              </div>

              {canNavigate ? (
                <>
                  <button
                    type="button"
                    aria-label="Ver mídia anterior"
                    className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full sm:left-4 sm:h-10 sm:w-10 border border-[#ffd8a8] bg-[#f97316] text-white shadow-[0_12px_24px_rgba(249,115,22,0.34)] transition hover:scale-[1.03] hover:bg-[#ea580c]"
                    onClick={(event) => handleNavigationClick(event, -1)}
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ver próxima mídia"
                    className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full sm:right-4 sm:h-10 sm:w-10 border border-[#ffd8a8] bg-[#f97316] text-white shadow-[0_12px_24px_rgba(249,115,22,0.34)] transition hover:scale-[1.03] hover:bg-[#ea580c]"
                    onClick={(event) => handleNavigationClick(event, 1)}
                  >
                    <ArrowRight className="h-4.5 w-4.5" />
                  </button>
                </>
              ) : null}

              {mediaGallery.length > 0 ? (
                <div className="absolute left-3 top-14 z-10 rounded-full sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-12 border border-white/25 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {activeIndex + 1}/{mediaGallery.length}
                </div>
              ) : null}

              {mediaGallery.length > 1 ? (
                <div className="absolute bottom-3 left-[3.6rem] z-10 flex max-w-[calc(100%-4.4rem)] sm:bottom-4 sm:left-[4.55rem] sm:max-w-[calc(100%-5.5rem)] items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 backdrop-blur-sm">
                  {mediaGallery.slice(0, 8).map((item, index) => (
                    <span
                      key={item.id}
                      className={`block h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45'}`}
                    />
                  ))}
                  {mediaGallery.length > 8 ? <span className="ml-1 text-[10px] font-semibold text-white/80">+{mediaGallery.length - 8}</span> : null}
                </div>
              ) : null}

              <button
                type="button"
                aria-label={isMapFlipped ? `Voltar para a mídia de ${point.name}` : `Ver mapa de ${point.name}`}
                disabled={!hasMapCoordinates}
                className={`absolute bottom-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full sm:bottom-4 sm:left-4 sm:h-11 sm:w-11 border border-white/35 backdrop-blur-sm transition ${hasMapCoordinates ? 'bg-white/90 text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.18)] hover:scale-[1.03]' : 'cursor-not-allowed bg-white/55 text-slate-400'}`}
                onClick={handleFlipToggle}
              >
                <MapPinned className="h-4.5 w-4.5" />
              </button>

              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center justify-end sm:inset-x-4 sm:bottom-4">
                <div className="rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                  {isSelectionMode ? (isSelectable ? (isSelected ? 'Selecionado' : 'Selecionar') : 'Indisponível') : 'Ver detalhes'}
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 overflow-hidden rounded-none bg-slate-100 [backface-visibility:hidden]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="relative h-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] w-full">
              <CardMapFace point={point} isActive={isMapFlipped} />
              <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-col items-start gap-2 sm:inset-x-4 sm:top-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <Badge className="rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:bg-white">
                  Localização do ponto
                </Badge>
                <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                  Arraste para explorar
                </div>
              </div>
              <button
                type="button"
                aria-label={`Voltar para a mídia de ${point.name}`}
                className="absolute bottom-3 left-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full sm:bottom-4 sm:left-4 sm:h-11 sm:w-11 border border-white/70 bg-white/95 text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.18)] transition hover:scale-[1.03]"
                onClick={handleFlipToggle}
              >
                <MapPinned className="h-4.5 w-4.5" />
              </button>
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-2xl sm:inset-x-4 sm:bottom-4 border border-white/65 bg-white/88 px-4 py-3 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Prévia do mapa</div>
                <div className="mt-1 text-sm font-semibold">{point.name}</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">Clique novamente no ícone para voltar à mídia do card.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="w-[calc(100vw-0.75rem)] max-w-5xl overflow-hidden border-slate-800 bg-slate-950 p-0 text-white shadow-[0_24px_80px_rgba(2,6,23,0.65)] sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="sr-only">
            <DialogTitle>{point.name}</DialogTitle>
            <DialogDescription>Visualização ampliada da mídia em vídeo selecionada no card do catálogo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            <div className="flex flex-col items-start gap-2 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">{point.name}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/65">
                  Vídeo {mediaGallery.length > 0 ? `${activeIndex + 1} de ${mediaGallery.length}` : null}
                </div>
              </div>
              <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Clique fora para fechar
              </div>
            </div>

            <div className="bg-black p-2 sm:p-3">
              {activeMediaUrl ? (
                <video
                  key={`${point.id}:${activeMedia?.id ?? activeIndex}:${isVideoDialogOpen ? 'open' : 'closed'}`}
                  src={activeMediaUrl}
                  className="max-h-[78dvh] w-full rounded-[20px] bg-black object-contain"
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MenuCatalogCard({ point, isAgency, markupPercent, onOpenDetail, isSelectionMode = false, isSelected = false, onToggleSelection }: MenuCatalogCardProps) {
  const availability = normalizeAvailability(point);
  const address = getPublicMediaKitPointAddress(point);
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
  const isSelectable = availability === 'Disponível';

  const handleToggleSelection = () => {
    if (!isSelectable || typeof onToggleSelection !== 'function') return;
    onToggleSelection(point.id);
  };

  return (
    <Card className={`group overflow-hidden rounded-[26px] border bg-[#dbe6f6] shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(59,130,246,0.12)] ${isSelectionMode ? (isSelected ? 'border-emerald-300 ring-2 ring-emerald-200' : isSelectable ? 'border-sky-200' : 'border-slate-200 opacity-90') : 'border-[#cad8ec]'}`}>
      <div className="grid gap-0 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <CardMediaGallery
          point={point}
          availability={availability}
          categoryLabel={categoryLabel}
          typeLabel={typeLabel}
          environmentLabel={environmentLabel}
          onOpenDetail={onOpenDetail}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          isSelectable={isSelectable}
          onToggleSelection={onToggleSelection}
        />

        <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[1.15rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[1.25rem]">
                  {point.name}
                </div>
              </div>

              {!isSelectionMode ? (
                <Button
                  className="h-10 rounded-full bg-slate-950 px-4 text-sm text-white hover:bg-slate-900 sm:shrink-0"
                  onClick={() => onOpenDetail(point.id)}
                >
                  Ver detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="space-y-1 text-[13px] leading-6 text-slate-800 sm:text-[14px]">
              <InfoLine label="Categoria" value={categoryLabel} />
              <InfoLine label="Tipo" value={typeLabel} />
              <InfoLine label="Endereço" value={address} />
              <InfoLine label="Impacto Diário" value={point.dailyImpressions ? formatInteger(point.dailyImpressions) : null} />
              <InfoLine label="Classes sociais" value={socialClasses} />
              <InfoLine label="Dimensões do ponto" value={dimensions} />
              <InfoLine label="Orientação" value={orientation} />
            </div>

            <div className="space-y-2 border-t border-slate-300/70 pt-3 text-[14px] text-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">Valor mensal:</span>
                <span className="font-medium">{visibleMonthPrice !== null ? formatBRL(visibleMonthPrice) : 'Sob consulta'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">Valor Bi-semana:</span>
                <span className="font-medium">{visibleWeekPrice !== null ? formatBRL(visibleWeekPrice) : 'Sob consulta'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-300/70 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`rounded-[10px] px-3 py-1.5 text-sm font-medium hover:bg-inherit ${resolveAvailabilityTone(availability)}`}>
                Status: {availability}
              </Badge>

              {mapUrl ? (
                <Button asChild variant="outline" className="h-10 rounded-[12px] border-slate-300 bg-white px-4 text-sm text-slate-900 hover:bg-slate-50">
                  <a href={mapUrl} target="_blank" rel="noreferrer noopener">
                    <MapPin className="mr-2 h-4 w-4" />
                    Ver no Google Maps
                  </a>
                </Button>
              ) : null}
            </div>

            <div className="text-xs leading-5 text-slate-600">
              {operationalSummary} • {formatInteger(occupiedUnitsCount)} ocupadas • {formatInteger(availableUnitsCount)} disponíveis
            </div>

            {isSelectionMode ? (
              <Button
                className={`h-10 rounded-full sm:w-fit sm:min-w-[210px] ${isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : isSelectable ? 'bg-slate-950 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-500 hover:bg-slate-200'}`}
                onClick={handleToggleSelection}
                disabled={!isSelectable}
              >
                {isSelected ? 'Remover seleção' : isSelectable ? 'Selecionar ponto' : 'Indisponível para seleção'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
