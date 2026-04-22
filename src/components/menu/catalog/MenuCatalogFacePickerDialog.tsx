import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { CalendarRange, CheckCircle2, Clock3, Layers, MapPin, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '../../../lib/format';
import { addToCart, formatAddress } from '../../../lib/menuCart';
import {
  PublicMediaKitPoint,
  PublicMediaKitUnit,
  getPublicMediaKitUnitEffectivePrice,
  isPublicMediaKitUnitSelectable,
  normalizeUnitAvailability,
} from '../../../lib/publicMediaKit';

type MenuCatalogFacePickerDialogProps = {
  point: PublicMediaKitPoint | null;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  isAgency: boolean;
  markupPercent: number;
};

function applyMarkup(price: number | null | undefined, markupPercent: number, isAgency: boolean): number | null {
  const numeric = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(numeric)) return null;
  if (!isAgency) return numeric;
  return Number((numeric * (1 + markupPercent / 100)).toFixed(2));
}

function isUnitSelectable(unit: PublicMediaKitUnit | null | undefined): boolean {
  return isPublicMediaKitUnitSelectable(unit);
}

function formatAvailabilityDate(value?: string | null): string | null {
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

function getAvailabilityLabel(unit: PublicMediaKitUnit): string {
  const raw = normalizeUnitAvailability(unit);
  if (raw) return raw;
  return isUnitSelectable(unit) ? 'Disponível' : 'Indisponível';
}

function getAvailabilityTone(unit: PublicMediaKitUnit) {
  if (isUnitSelectable(unit)) {
    return {
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      panel: 'border-emerald-100 bg-emerald-50/90 text-emerald-800',
      dot: 'bg-emerald-500',
    };
  }

  if (normalizeUnitAvailability(unit) === 'Reservada') {
    return {
      chip: 'border-amber-200 bg-amber-50 text-amber-700',
      panel: 'border-amber-100 bg-amber-50/90 text-amber-900',
      dot: 'bg-amber-500',
    };
  }

  return {
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    panel: 'border-rose-100 bg-rose-50/90 text-rose-900',
    dot: 'bg-rose-500',
  };
}

function getUnitPriceHelperText(point: PublicMediaKitPoint, unit: PublicMediaKitUnit, kind: 'month' | 'week'): string {
  const unitPriceRaw = kind === 'month' ? unit.priceMonth : unit.priceWeek;
  const pointPriceRaw = kind === 'month' ? point.basePriceMonth : point.basePriceWeek;

  const unitPrice = typeof unitPriceRaw === 'number' ? unitPriceRaw : Number(unitPriceRaw);
  if (Number.isFinite(unitPrice)) {
    return 'Valor próprio da face.';
  }

  const pointPrice = typeof pointPriceRaw === 'number' ? pointPriceRaw : Number(pointPriceRaw);
  if (Number.isFinite(pointPrice)) {
    return 'Valor herdado do ponto.';
  }

  return 'Sob consulta.';
}

function formatDimension(unit: PublicMediaKitUnit): string {
  const width = Number(unit.widthM);
  const height = Number(unit.heightM);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return `${String(width).replace('.', ',')}m × ${String(height).replace('.', ',')}m`;
  }
  return 'Dimensões não informadas';
}

function formatOrientation(unit: PublicMediaKitUnit): string | null {
  const value = String(unit.orientation ?? '').trim().toUpperCase();
  if (value === 'CONTRA_FLUXO') return 'Contra fluxo';
  if (value === 'FLUXO') return 'Fluxo';
  return value || null;
}

function getUnitLabel(unit: PublicMediaKitUnit): string {
  const prefix = unit.unitType === 'SCREEN' ? 'Tela' : 'Face';
  const label = String(unit.label ?? '').trim();
  return label ? `${prefix} ${label}` : prefix;
}

function UnitPreview({ src, alt, compact = false }: { src?: string | null; alt: string; compact?: boolean }) {
  const className = compact
    ? 'menu-face-preview menu-face-preview--compact'
    : 'menu-face-preview menu-face-preview--point';

  if (!src) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
          Sem imagem disponível
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ImageWithFallback src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="menu-face-dialog-metric">
      <div className="menu-face-dialog-metric-label">{label}</div>
      <div className="menu-face-dialog-metric-value">{value}</div>
    </div>
  );
}

export function MenuCatalogFacePickerDialog({
  point,
  open,
  onOpenChange,
  isAgency,
  markupPercent,
}: MenuCatalogFacePickerDialogProps) {
  const units = useMemo(
    () => (Array.isArray(point?.units) ? point.units.filter((unit) => unit?.isActive !== false) : []),
    [point],
  );
  const selectableUnits = useMemo(() => units.filter((unit) => isUnitSelectable(unit)), [units]);
  const sortedUnits = useMemo(
    () => [...units].sort((left, right) => Number(isUnitSelectable(right)) - Number(isUnitSelectable(left))),
    [units],
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected({});
  }, [open, point?.id]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((key) => selected[key]), [selected]);
  const selectedCount = selectedIds.length;

  const handleToggleUnit = (unit: PublicMediaKitUnit) => {
    if (!isUnitSelectable(unit)) return;
    setSelected((current) => ({ ...current, [unit.id]: !current[unit.id] }));
  };

  const handleAddSelected = () => {
    if (!point) return;

    if (selectedIds.length === 0) {
      toast.info('Escolha pelo menos uma face/tela para continuar.');
      return;
    }

    let addedCount = 0;
    let duplicatedCount = 0;

    for (const unitId of selectedIds) {
      const unit = units.find((entry) => entry.id === unitId) ?? null;
      if (!isUnitSelectable(unit)) continue;
      const result = addToCart({ point, unit, duration: { years: 0, months: 1, days: 0 } });
      if (result.added) {
        addedCount += 1;
      } else {
        duplicatedCount += 1;
      }
    }

    if (addedCount > 0 && duplicatedCount > 0) {
      toast.success(`${addedCount} face${addedCount === 1 ? '' : 's'} adicionada${addedCount === 1 ? '' : 's'} ao carrinho.`, {
        description: `${duplicatedCount} já ${duplicatedCount === 1 ? 'estava' : 'estavam'} no carrinho e ${duplicatedCount === 1 ? 'foi ignorada' : 'foram ignoradas'}.`,
      });
      onOpenChange(false);
      return;
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} face${addedCount === 1 ? '' : 's'} adicionada${addedCount === 1 ? '' : 's'} ao carrinho.`);
      onOpenChange(false);
      return;
    }

    toast.info('As faces selecionadas já estão no carrinho.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="menu-face-dialog max-w-none gap-0 overflow-hidden border border-[rgba(17,24,39,0.10)] p-0"
        style={{ width: 'min(1120px, calc(100vw - 1rem))', maxHeight: 'calc(100dvh - 1rem)' }}
      >
        <DialogHeader className="menu-face-dialog-header">
          <div className="menu-face-dialog-badges">
            <Badge className="menu-face-dialog-badge menu-face-dialog-badge--primary">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Seleção de faces/telas
            </Badge>
            <Badge variant="secondary" className="menu-face-dialog-badge menu-face-dialog-badge--secondary">
              {selectedCount}/{selectableUnits.length || 0} selecionadas
            </Badge>
          </div>
          <DialogTitle className="menu-face-dialog-title">{point?.name ?? 'Selecionar faces/telas'}</DialogTitle>
          <DialogDescription className="menu-face-dialog-description">
            Escolha uma ou mais faces para adicionar ao carrinho sem sair do catálogo.
          </DialogDescription>
        </DialogHeader>

        {point ? (
          <div className="menu-face-dialog-scroll">
            <div className="menu-face-dialog-top">
              <section className="menu-face-dialog-panel menu-face-dialog-panel--point">
                <div className="menu-face-dialog-point-grid">
                  <UnitPreview src={point.mainImageUrl || point.images?.[0] || ''} alt={point.name} />

                  <div className="min-w-0">
                    <div className="menu-face-dialog-kicker">Ponto selecionado</div>
                    <div className="menu-face-dialog-point-title">{point.name}</div>
                    <div className="menu-face-dialog-point-address">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="menu-copy-wrap">{formatAddress(point) || 'Endereço não informado'}</span>
                    </div>

                    <div className="menu-face-dialog-metrics-grid">
                      <SummaryMetric label="Faces/telas" value={units.length} />
                      <SummaryMetric label="Disponíveis" value={selectableUnits.length} />
                      <SummaryMetric label="Selecionadas" value={selectedCount} />
                    </div>
                  </div>
                </div>
              </section>

              <aside className="menu-face-dialog-panel menu-face-dialog-panel--aside">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="menu-face-dialog-kicker">Resumo</div>
                    <div className="menu-face-dialog-aside-title">Escolha final</div>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 ${selectedCount > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                </div>

                <div className="menu-face-dialog-note">
                  <div className="text-sm font-semibold text-slate-900">Seleção atual</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selectedCount > 0
                      ? `${selectedCount} ${selectedCount === 1 ? 'face pronta' : 'faces prontas'} para seguir ao carrinho.`
                      : 'Selecione uma ou mais faces/telas para continuar.'}
                  </div>
                </div>

                <div className="menu-face-dialog-side-grid">
                  <div className="menu-face-dialog-note">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Período
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">Mensal e bi-semana</div>
                    <div className="mt-1 text-xs text-slate-500">As duas referências aparecem em cada face.</div>
                  </div>
                  <div className="menu-face-dialog-note">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      Disponibilidade
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">Leitura imediata</div>
                    <div className="mt-1 text-xs text-slate-500">Faces indisponíveis seguem bloqueadas.</div>
                  </div>
                </div>

                <Button className="menu-face-dialog-submit" onClick={handleAddSelected} disabled={selectedCount === 0}>
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar ao carrinho
                </Button>
              </aside>
            </div>

            {units.length > 0 ? (
              <div className="menu-face-dialog-units">
                {sortedUnits.map((unit) => {
                  const checked = !!selected[unit.id];
                  const isUnavailable = !isUnitSelectable(unit);
                  const tone = getAvailabilityTone(unit);
                  const availabilityDate = formatAvailabilityDate(unit.availableOn);
                  const monthPrice = applyMarkup(getPublicMediaKitUnitEffectivePrice(point, unit, 'month'), markupPercent, isAgency);
                  const weekPrice = applyMarkup(getPublicMediaKitUnitEffectivePrice(point, unit, 'week'), markupPercent, isAgency);
                  const monthPriceHelper = getUnitPriceHelperText(point, unit, 'month');
                  const weekPriceHelper = getUnitPriceHelperText(point, unit, 'week');
                  const orientation = formatOrientation(unit);

                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => handleToggleUnit(unit)}
                      className={`menu-face-unit-card ${
                        checked
                          ? 'menu-face-unit-card--selected'
                          : isUnavailable
                            ? 'menu-face-unit-card--disabled'
                            : 'menu-face-unit-card--default'
                      }`}
                      disabled={isUnavailable}
                    >
                      <div className="menu-face-unit-card-grid">
                        <UnitPreview src={unit.imageUrl || point.mainImageUrl || ''} alt={getUnitLabel(unit)} compact />

                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${checked ? 'border-white/15 bg-white/10 text-white hover:bg-white/10' : tone.chip}`}>
                                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${checked ? 'bg-emerald-300' : tone.dot}`} />
                                  {getAvailabilityLabel(unit)}
                                </Badge>
                                {checked ? (
                                  <Badge className="rounded-full border-0 bg-white text-slate-900 hover:bg-white">
                                    Selecionada
                                  </Badge>
                                ) : null}
                              </div>
                              <div className={`mt-3 text-base font-semibold ${checked ? 'text-white' : 'text-slate-950'}`}>{getUnitLabel(unit)}</div>
                              <div className={`mt-1 text-sm ${checked ? 'text-white/70' : 'text-slate-600'}`}>
                                {formatDimension(unit)}
                                {orientation ? ` • ${orientation}` : ''}
                              </div>
                            </div>
                            <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                disabled={isUnavailable}
                                onCheckedChange={(value) => setSelected((current) => ({ ...current, [unit.id]: Boolean(value) }))}
                                className="border-slate-300 bg-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                              />
                            </div>
                          </div>

                          <div className={`mt-3 rounded-2xl border px-3 py-2.5 ${checked ? 'border-white/10 bg-white/8 text-white' : tone.panel}`}>
                            <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/65' : ''}`}>Disponibilidade</div>
                            <div className="mt-1 text-sm leading-5">
                              {isUnavailable
                                ? availabilityDate
                                  ? `Livre para nova seleção em ${availabilityDate}.`
                                  : 'Esta unidade não está disponível para seleção imediata.'
                                : 'Pronta para compor a proposta agora.'}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className={`rounded-2xl border px-3 py-3 ${checked ? 'border-white/10 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                              <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/65' : 'text-slate-500'}`}>Mensal</div>
                              <div className="mt-2 text-base font-semibold">{formatBRL(monthPrice, 'Sob consulta')}</div>
                              <div className={`mt-1 text-xs ${checked ? 'text-white/70' : 'text-slate-500'}`}>{monthPriceHelper}</div>
                            </div>
                            <div className={`rounded-2xl border px-3 py-3 ${checked ? 'border-white/10 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                              <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/65' : 'text-slate-500'}`}>Bi-semana</div>
                              <div className="mt-2 text-base font-semibold">{formatBRL(weekPrice, 'Sob consulta')}</div>
                              <div className={`mt-1 text-xs ${checked ? 'text-white/70' : 'text-slate-500'}`}>{weekPriceHelper}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="menu-face-dialog-empty">
                <div className="text-sm font-semibold text-slate-900">Nenhuma face/tela encontrada</div>
                <div className="mt-1 text-sm text-slate-600">Este ponto não possui faces ativas para seleção dentro do catálogo neste momento.</div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
