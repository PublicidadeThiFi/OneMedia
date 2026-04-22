import { MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  ImageIcon,
  MapPinned,
  MapPin,
  Play,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  Availability,
  PublicMediaKitMediaItem,
  PublicMediaKitPoint,
  PublicMediaKitUnit,
  computeCatalogCardPriceSummary,
  getPublicMediaKitPointAddress,
  getPublicMediaKitPointMapUrl,
  getPublicMediaKitPointMediaGallery,
  hasPublicMediaKitSelectableUnits,
  isPublicMediaKitPointSelectable,
  normalizeAvailability,
} from '../../../lib/publicMediaKit';
import { formatBRL, resolveUploadsUrl } from '../../../lib/format';

type MenuCatalogCardProps = {
  point: PublicMediaKitPoint;
  isAgency: boolean;
  markupPercent: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (pointId: string) => void;
  onOpenFacePicker?: (pointId: string) => void;
};

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

function MediaFallback({ pointName }: { pointName: string }) {
  return (
    <div className="menu-card-media-fallback">
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-slate-700">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <ImageIcon className="h-7 w-7 text-slate-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">Mídia indisponível</div>
          <div className="mt-1 max-w-[16rem] text-xs leading-5 text-slate-600">
            As mídias públicas deste ponto ainda não foram disponibilizadas para visualização.
          </div>
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
      <div className="menu-card-map-surface flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-sm font-semibold text-slate-900">Mapa indisponível</div>
          <div className="mt-2 text-xs leading-5 text-slate-600">
            As coordenadas públicas deste ponto ainda não estão disponíveis para exibição no card.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-card-map-surface" onClick={(event) => event.stopPropagation()}>
      <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom className="h-full w-full" attributionControl={false}>
        <CatalogCardMapAutoFit isActive={isActive} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
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

function statusCssClass(value: Availability): string {
  if (value === 'Disponível') return 'menu-card-status--disponivel';
  if (value === 'Parcial') return 'menu-card-status--parcial';
  return 'menu-card-status--ocupado';
}

function CardMediaGallery({
  point,
  availability,
}: {
  point: PublicMediaKitPoint;
  availability: Availability;
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


  return (
    <>
      <div className="menu-card-flip-stage">
        <div className="menu-card-flip" style={{ transform: isMapFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className="menu-card-face">
            {activeMediaUrl ? (
              activeMedia?.kind === 'video' ? (
                <>
                  <video key={`${point.id}:${activeMedia.id ?? activeIndex}`} className="menu-card-media-asset" muted playsInline preload="metadata" onError={handleMediaFailure}>
                    <source src={activeMediaUrl} />
                  </video>
                  <button type="button" className="menu-card-video-overlay" onClick={handleVideoPreviewClick}>
                    <Play className="h-4 w-4" />
                    Clique para expandir
                  </button>
                </>
              ) : (
                <ImageWithFallback src={activeMediaUrl} alt={point.name} className="menu-card-media-asset" onError={handleMediaFailure} />
              )
            ) : (
              <MediaFallback pointName={point.name} />
            )}

            <div className="menu-card-media-overlay">
              <span className="menu-card-media-status">{availability}</span>

              {canNavigate ? (
                <>
                  <button type="button" aria-label="Mídia anterior" className="menu-card-carousel-btn menu-card-carousel-btn--prev" onClick={(event) => handleNavigationClick(event, -1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Próxima mídia" className="menu-card-carousel-btn menu-card-carousel-btn--next" onClick={(event) => handleNavigationClick(event, 1)}>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}

              <button
                type="button"
                aria-label={isMapFlipped ? `Voltar para a mídia de ${point.name}` : `Ver mapa de ${point.name}`}
                className="menu-card-map-toggle"
                onClick={handleFlipToggle}
                disabled={!hasMapCoordinates}
                style={!hasMapCoordinates ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              >
                <MapPinned className="h-5 w-5" />
              </button>

              {mediaGallery.length > 0 ? <div className="menu-card-media-counter">{activeIndex + 1} / {mediaGallery.length}</div> : null}
            </div>
          </div>

          <div className="menu-card-map-face">
            <CardMapFace point={point} isActive={isMapFlipped} />
            <button type="button" className="menu-card-map-toggle" onClick={handleFlipToggle}>
              <MapPinned className="h-5 w-5" />
            </button>
            <div className="menu-card-map-caption">
              <small>Prévia do mapa</small>
              <strong>{point.name}</strong>
              <span>Clique novamente no ícone para voltar à mídia do card.</span>
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

export function MenuCatalogCard({
  point,
  isAgency,
  markupPercent,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onOpenFacePicker,
}: MenuCatalogCardProps) {
  const availability = normalizeAvailability(point);
  const address = getPublicMediaKitPointAddress(point);
  const mapUrl = getPublicMediaKitPointMapUrl(point);
  const monthPrice = computeCatalogCardPriceSummary(point, 'month');
  const weekPrice = computeCatalogCardPriceSummary(point, 'week');
  const visibleMonthPrice = applyMarkup(monthPrice.startingFrom, markupPercent, isAgency);
  const visibleWeekPrice = applyMarkup(weekPrice.startingFrom, markupPercent, isAgency);
  const monthPriceLabel = monthPrice.isStartingFrom ? 'Mensal • A partir de:' : 'Valor mensal:';
  const weekPriceLabel = weekPrice.isStartingFrom ? 'Bi-semana • A partir de:' : 'Valor Bi-semana:';
  const unitsCount = Number(point.unitsCount ?? point.units?.length ?? 0);
  const occupiedUnitsCount = Number(point.occupiedUnitsCount ?? 0);
  const availableUnitsCount = Number(point.availableUnitsCount ?? Math.max(unitsCount - occupiedUnitsCount, 0));
  const primaryUnit = getPrimaryUnit(point);
  const dimensions = formatDimensions(primaryUnit);
  const orientation = formatOrientation(primaryUnit);
  const socialClasses = formatSocialClasses(point.socialClasses);
  const nextAvailabilityLabel = getNextAvailabilityLabel(point);
  const operationalSummary = buildOperationalSummary(availability, availableUnitsCount, occupiedUnitsCount, nextAvailabilityLabel);
  const categoryLabel = String(point.subcategory ?? '').trim() || 'OUTDOOR';
  const typeLabel = String(point.type ?? '').trim() || 'DOOH';
  const hasUnits = Array.isArray(point.units) && point.units.some((unit) => unit?.isActive !== false);
  const hasSelectableUnits = hasPublicMediaKitSelectableUnits(point);
  const isSelectable = isPublicMediaKitPointSelectable(point);

  const handleToggleSelection = () => {
    if (!isSelectable) return;

    if (hasUnits && typeof onOpenFacePicker === 'function') {
      onOpenFacePicker(point.id);
      return;
    }

    if (typeof onToggleSelection !== 'function') return;
    onToggleSelection(point.id);
  };

  return (
    <article className={`menu-card ${isSelectionMode ? (isSelected ? 'border-emerald-300 ring-2 ring-emerald-200' : isSelectable ? 'border-sky-200' : 'opacity-90') : ''}`}>
      <div className="menu-card-inner">
        <div className="menu-card-media">
          <CardMediaGallery
            point={point}
            availability={availability}
          />
        </div>

        <div className="menu-card-content">
          <div className="menu-card-titlebar">
            <h3 className="menu-card-title">{point.name}</h3>
          </div>

          <div className="menu-card-copy">
            <div className="menu-card-line"><strong>Categoria:</strong> {categoryLabel}</div>
            <div className="menu-card-line"><strong>Tipo:</strong> {typeLabel}</div>
            <div className="menu-card-line"><strong>Endereço:</strong> {address || 'Não informado'}</div>
            <div className="menu-card-line"><strong>Impacto Diário:</strong> {point.dailyImpressions ? formatInteger(point.dailyImpressions) : 'Não informado'}</div>
            <div className="menu-card-line"><strong>Classes sociais:</strong> {socialClasses || 'Não informado'}</div>
            <div className="menu-card-line"><strong>Dimensões do ponto:</strong> {dimensions || 'Não informado'}</div>
            <div className="menu-card-line"><strong>Orientação:</strong> {orientation || 'Não informado'}</div>
          </div>

          <div className="menu-card-pricing">
            <div className="menu-card-price-row"><strong>{monthPriceLabel}</strong> {visibleMonthPrice !== null ? formatBRL(visibleMonthPrice) : 'Sob consulta'}</div>
            <div className="menu-card-price-row"><strong>{weekPriceLabel}</strong> {visibleWeekPrice !== null ? formatBRL(visibleWeekPrice) : 'Sob consulta'}</div>
          </div>

          <div className="menu-card-bottom">
            <span className={`menu-card-status ${statusCssClass(availability)}`}>Status: {availability}</span>
            {mapUrl ? (
              <a href={mapUrl} target="_blank" rel="noreferrer noopener" className="menu-card-maplink">
                <MapPin className="h-3.5 w-3.5" />
                Ver no Google Maps
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          <div className="menu-card-meta">
            {unitsCount > 0 ? `${formatInteger(unitsCount)} telas/faces • ` : ''}
            {operationalSummary} • {formatInteger(occupiedUnitsCount)} ocupadas • {formatInteger(availableUnitsCount)} disponíveis
          </div>

          {isSelectionMode ? (
            <button
              className="menu-card-select-btn"
              style={isSelected
                ? { background: '#16a34a', color: '#fff' }
                : isSelectable
                  ? { background: '#030712', color: '#fff' }
                  : { background: '#e5e7eb', color: '#64748b', cursor: 'not-allowed' }}
              onClick={handleToggleSelection}
              disabled={!isSelectable}
            >
              {isSelected
                ? 'Remover seleção'
                : isSelectable
                  ? (hasUnits ? 'Selecionar faces' : 'Selecionar ponto')
                  : hasUnits && availability === 'Parcial' && !hasSelectableUnits
                    ? 'Faces indisponíveis no momento'
                    : 'Indisponível para seleção'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
