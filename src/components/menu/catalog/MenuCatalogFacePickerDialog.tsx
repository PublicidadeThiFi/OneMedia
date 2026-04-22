import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { CalendarRange, CheckCircle2, Clock3, Layers, MapPin, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { formatBRL } from '../../../lib/format';
import { addToCart, formatAddress } from '../../../lib/menuCart';
import { PublicMediaKitPoint, PublicMediaKitUnit, getPublicMediaKitUnitEffectivePrice, isPublicMediaKitUnitSelectable, normalizeUnitAvailability } from '../../../lib/publicMediaKit';

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
      panel: 'border-emerald-100 bg-emerald-50/80 text-emerald-800',
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
    return 'Valor próprio desta face/tela.';
  }

  const pointPrice = typeof pointPriceRaw === 'number' ? pointPriceRaw : Number(pointPriceRaw);
  if (Number.isFinite(pointPrice)) {
    return 'Valor herdado do ponto.';
  }

  return 'Valor não informado para este período.';
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

function UnitPreview({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)]">
        <div className="absolute inset-x-0 top-0 h-20 bg-white/50 blur-2xl" />
        <div className="relative flex h-full items-center justify-center px-5 text-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sem imagem</div>
            <div className="mt-2 text-sm text-slate-600">A visualização desta face aparecerá aqui.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)]">
      <div className="absolute inset-x-0 top-0 h-20 bg-white/50 blur-2xl" />
      <ImageWithFallback src={src} alt={alt} className="relative h-full w-full object-contain p-3" />
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
    if (!open) {
      setSelected({});
      return;
    }
    setSelected({});
  }, [open, point?.id]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((key) => selected[key]), [selected]);
  const selectedCount = selectedIds.length;
  const selectionProgress = selectableUnits.length > 0 ? Math.min(100, Math.round((selectedCount / selectableUnits.length) * 100)) : 0;

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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl overflow-hidden rounded-[28px] border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(2,6,23,0.18)] sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700 hover:bg-indigo-50">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Seleção de faces/telas
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
              {selectedCount}/{selectableUnits.length || 0} selecionadas
            </Badge>
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {point?.name ?? 'Selecionar faces/telas'}
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Escolha qual face ou quais faces deseja adicionar ao carrinho. Cada card mostra disponibilidade, imagem e valores da unidade.
          </DialogDescription>
        </DialogHeader>

        {point ? (
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="p-5 sm:p-6">
                  <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                    <UnitPreview src={point.mainImageUrl || point.images?.[0] || ''} alt={point.name} />

                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ponto selecionado</div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {formatAddress(point) || 'Endereço não informado'}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Faces/telas</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{units.length}</div>
                          <div className="mt-1 text-xs text-slate-500">Unidades cadastradas neste ponto.</div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Disponíveis</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{selectableUnits.length}</div>
                          <div className="mt-1 text-xs text-slate-500">Prontas para seleção imediata.</div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Seleção atual</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{selectedCount}</div>
                          <div className="mt-1 text-xs text-slate-500">Itens marcados para entrar no carrinho.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo da seleção</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">Monte sua escolha final</div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                      {selectedCount}/{selectableUnits.length || 0}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Seleção atual</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {selectedCount > 0
                            ? `${selectedCount} unidade(s) pronta(s) para seguir ao carrinho.`
                            : 'Selecione uma ou mais faces/telas para continuar.'}
                        </div>
                      </div>
                      <CheckCircle2 className={`h-5 w-5 ${selectedCount > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${selectionProgress}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <CalendarRange className="h-3.5 w-3.5" />
                        Período
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-900">Mensal ou bi-semana</div>
                      <div className="mt-1 text-xs text-slate-500">Os dois ciclos já aparecem em cada face para comparação.</div>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        Disponibilidade
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-900">Leitura imediata</div>
                      <div className="mt-1 text-xs text-slate-500">Disponível agora ou data da próxima liberação.</div>
                    </div>
                  </div>

                  <Button className="mt-5 h-11 w-full gap-2 rounded-2xl" onClick={handleAddSelected} disabled={selectedCount === 0}>
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar selecionadas ao carrinho
                  </Button>
                  <div className="mt-3 text-xs text-slate-500">As faces indisponíveis permanecem bloqueadas para seleção neste momento.</div>
                </CardContent>
              </Card>
            </div>

            {units.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                    <Card
                      key={unit.id}
                      onClick={() => handleToggleUnit(unit)}
                      className={`group overflow-hidden rounded-[28px] border transition-all duration-200 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${
                        checked
                          ? 'cursor-pointer border-slate-900 bg-slate-900 text-white shadow-[0_22px_46px_rgba(15,23,42,0.18)]'
                          : isUnavailable
                            ? 'cursor-not-allowed border-slate-200 bg-white/90'
                            : 'cursor-pointer border-slate-200 bg-white/95 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_22px_44px_rgba(15,23,42,0.10)]'
                      }`}
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${checked ? 'border-white/15 bg-white/10 text-white hover:bg-white/10' : tone.chip}`}>
                                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${checked ? 'bg-emerald-300' : tone.dot}`} />
                                {getAvailabilityLabel(unit)}
                              </Badge>
                              {checked ? (
                                <Badge className="rounded-full border-0 bg-white text-slate-900 hover:bg-white">
                                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  Selecionada
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={`menu-copy-wrap text-lg font-semibold ${checked ? 'text-white' : 'text-slate-950'}`}>
                                  {getUnitLabel(unit)}
                                </div>
                                <div className={`mt-1 text-sm ${checked ? 'text-white/72' : 'text-slate-600'}`}>
                                  {formatDimension(unit)}
                                  {orientation ? ` • ${orientation}` : ''}
                                </div>
                              </div>
                              <div onClick={(event) => event.stopPropagation()}>
                                <Checkbox
                                  checked={checked}
                                  disabled={isUnavailable}
                                  onCheckedChange={(value) => setSelected((current) => ({ ...current, [unit.id]: Boolean(value) }))}
                                  className="border-slate-300 bg-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <UnitPreview src={unit.imageUrl || point.mainImageUrl || ''} alt={getUnitLabel(unit)} />
                        </div>

                        <div className={`mt-4 rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : tone.panel}`}>
                          <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : ''}`}>Disponibilidade</div>
                          <div className="mt-2 text-sm font-medium">
                            {isUnavailable
                              ? availabilityDate
                                ? `Livre para nova seleção em ${availabilityDate}.`
                                : 'Esta unidade não está disponível para seleção imediata.'
                              : 'Pronta para compor a proposta agora.'}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className={`rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                            <div className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : 'text-slate-500'}`}>
                              <CalendarRange className="h-3.5 w-3.5" />
                              Mensal
                            </div>
                            <div className="mt-3 text-lg font-semibold leading-none">{formatBRL(monthPrice, 'Sob consulta')}</div>
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>{monthPriceHelper}</div>
                          </div>

                          <div className={`rounded-[22px] border p-4 ${checked ? 'border-white/12 bg-white/8 text-white' : 'border-slate-200 bg-slate-50/90 text-slate-900'}`}>
                            <div className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'text-white/60' : 'text-slate-500'}`}>
                              <CalendarRange className="h-3.5 w-3.5" />
                              Bi-semana
                            </div>
                            <div className="mt-3 text-lg font-semibold leading-none">{formatBRL(weekPrice, 'Sob consulta')}</div>
                            <div className={`mt-2 text-xs ${checked ? 'text-white/68' : 'text-slate-500'}`}>{weekPriceHelper}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="mt-6 rounded-[28px] border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <CardContent className="p-6">
                  <div className="text-sm font-semibold text-slate-900">Nenhuma face/tela encontrada</div>
                  <div className="mt-1 text-sm text-slate-600">Este ponto não possui faces ativas para seleção dentro do catálogo neste momento.</div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
