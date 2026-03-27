import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import apiClient from '../../lib/apiClient';
import { ProposalItem, ProposalItemDiscountApplyTo } from '../../types';

interface ProposalItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProposalItem | null;
  onSave: (item: ProposalItem) => void;
}

const OCCUPATION_MAX_DAYS = 365 * 10 + 30 * 24 + 31;

type OccupationMode = '15' | '30' | 'custom';

function formatPrice(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseLocalDate(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00`);
}

function normalizeLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.max(0, Math.floor(days)));
  return next;
}


function computeRentPerUnit(days: number, priceMonth: number, priceBiweekly: number) {
  const normalizedDays = Math.max(0, Math.floor(days));
  const month = Math.max(0, Number.isFinite(priceMonth) ? priceMonth : 0);
  const biweekly = Math.max(0, Number.isFinite(priceBiweekly) ? priceBiweekly : 0);

  if (normalizedDays <= 0) return 0;
  if (normalizedDays <= 15 && biweekly > 0) {
    return biweekly * Math.max(1, normalizedDays / 15);
  }
  if (month > 0) {
    return month * Math.max(1, normalizedDays / 30);
  }
  if (biweekly > 0) {
    return biweekly * Math.max(1, normalizedDays / 15);
  }
  return 0;
}

function formatShortDate(value: Date) {
  return normalizeLocalDay(value).toLocaleDateString('pt-BR');
}

function isDateWithinRange(date: Date, start: Date, end: Date) {
  const current = normalizeLocalDay(date).getTime();
  const from = normalizeLocalDay(start).getTime();
  const to = normalizeLocalDay(end).getTime();
  return current >= from && current <= to;
}

function isDayOccupied(date: Date, ranges: Array<{ startDate: string; endDate: string }>) {
  return ranges.some((range) => {
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return isDateWithinRange(date, start, end);
  });
}

function findFirstConflictDateInRange(
  start: Date,
  end: Date,
  ranges: Array<{ startDate: string; endDate: string }>,
) {
  const from = normalizeLocalDay(start);
  const to = normalizeLocalDay(end);

  for (const range of ranges) {
    const rangeStart = normalizeLocalDay(new Date(range.startDate));
    const rangeEnd = normalizeLocalDay(new Date(range.endDate));
    const overlaps = !(rangeEnd.getTime() < from.getTime() || rangeStart.getTime() > to.getTime());
    if (!overlaps) continue;
    return rangeStart.getTime() < from.getTime() ? from : rangeStart;
  }

  return null;
}

function findNextAvailableStartOnOrAfter(date: Date, ranges: Array<{ startDate: string; endDate: string }>) {
  const sorted = [...ranges]
    .map((range) => ({
      startDate: normalizeLocalDay(new Date(range.startDate)),
      endDate: normalizeLocalDay(new Date(range.endDate)),
    }))
    .filter((range) => !Number.isNaN(range.startDate.getTime()) && !Number.isNaN(range.endDate.getTime()))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  let candidate = normalizeLocalDay(date);

  for (const range of sorted) {
    if (range.endDate.getTime() < candidate.getTime()) continue;
    if (range.startDate.getTime() > candidate.getTime()) break;
    candidate = addDays(range.endDate, 1);
  }

  return candidate;
}

export function ProposalItemEditDialog({ open, onOpenChange, item, onSave }: ProposalItemEditDialogProps) {
  const isMedia = !!item?.mediaUnitId;

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [rentDiscountPercent, setRentDiscountPercent] = useState<number>(0);
  const [rentDiscountAmount, setRentDiscountAmount] = useState<number>(0);
  const [costDiscountPercent, setCostDiscountPercent] = useState<number>(0);
  const [costDiscountAmount, setCostDiscountAmount] = useState<number>(0);
  const [totalDiscountPercent, setTotalDiscountPercent] = useState<number>(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState<number>(0);
  const [isGift, setIsGift] = useState<boolean>(false);

  // Produto/serviço (legado)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Mídia (novo fluxo)
  const [occupationMode, setOccupationMode] = useState<OccupationMode>('30');
  const [occupationDays, setOccupationDays] = useState<number>(30);
  const [clientProvidesBanner, setClientProvidesBanner] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customCalendarMonth, setCustomCalendarMonth] = useState<Date>(new Date());
  const [reservationRanges, setReservationRanges] = useState<Array<{ startDate: string; endDate: string }>>([]);
  const [reservationRangesLoading, setReservationRangesLoading] = useState(false);
  const [reservationRangesError, setReservationRangesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;

    setDescription(item.description || '');
    setQuantity(Number(item.quantity) || 1);
    setDiscountPercent(Number(item.discountPercent) || 0);
    setDiscountAmount(Number(item.discountAmount) || 0);
    setRentDiscountPercent(Number((item as any).rentDiscountPercent) || 0);
    setRentDiscountAmount(Number((item as any).rentDiscountAmount) || 0);
    setCostDiscountPercent(Number((item as any).costDiscountPercent) || 0);
    setCostDiscountAmount(Number((item as any).costDiscountAmount) || 0);
    setTotalDiscountPercent(Number((item as any).totalDiscountPercent) || Number(item.discountPercent) || 0);
    setTotalDiscountAmount(Number((item as any).totalDiscountAmount) || Number(item.discountAmount) || 0);
    setIsGift(Boolean((item as any).isGift) || Number(item.totalPrice) <= 0);

    if (item.mediaUnitId) {
      const days = Number(item.occupationDays) || 30;
      setOccupationDays(days);
      setOccupationMode(days === 15 ? '15' : days === 30 ? '30' : 'custom');
      setClientProvidesBanner(!!item.clientProvidesBanner);
      const normalizedStartDate = item.startDate ? normalizeLocalDay(new Date(item.startDate as any)) : null;
      setCustomStartDate(normalizedStartDate);
      setCustomCalendarMonth(normalizedStartDate ?? new Date());
      setReservationRanges([]);
      setReservationRangesError(null);
      // unitPrice será recalculado via useMemo
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      setStartDate(item.startDate ? new Date(item.startDate as any) : undefined);
      setEndDate(item.endDate ? new Date(item.endDate as any) : undefined);
      setClientProvidesBanner(false);
      setOccupationMode('30');
      setOccupationDays(30);
      setUnitPrice(Number(item.unitPrice) || 0);
    }
  }, [open, item]);

  useEffect(() => {
    if (!open || !item?.mediaUnitId) return;

    let cancelled = false;
    setReservationRangesLoading(true);
    setReservationRangesError(null);

    (async () => {
      try {
        const response = await apiClient.get<any>('/reservations/occupancy', {
          params: { mediaUnitId: item.mediaUnitId },
        });

        if (cancelled) return;

        const payload = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
        const ranges = Array.isArray(payload)
          ? payload
              .map((entry: any) => ({ startDate: entry?.startDate, endDate: entry?.endDate }))
              .filter((entry: any) => entry.startDate && entry.endDate)
          : [];
        setReservationRanges(ranges);
      } catch {
        if (cancelled) return;
        setReservationRangesError('Não foi possível carregar o calendário de ocupação desta face.');
      } finally {
        if (!cancelled) setReservationRangesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, item?.mediaUnitId]);

  useEffect(() => {
    if (!open || !item?.mediaUnitId) return;
    if (occupationMode !== 'custom') return;

    const minimumStart = item.startDate
      ? normalizeLocalDay(new Date(item.startDate as any))
      : normalizeLocalDay(new Date());
    const baseStart = customStartDate ? normalizeLocalDay(customStartDate) : minimumStart;
    const nextCandidate = baseStart.getTime() < minimumStart.getTime() ? minimumStart : baseStart;

    if (!customStartDate || isDayOccupied(nextCandidate, reservationRanges) || nextCandidate.getTime() < minimumStart.getTime()) {
      const nextAvailableStart = findNextAvailableStartOnOrAfter(nextCandidate, reservationRanges);
      if (!customStartDate || nextAvailableStart.getTime() !== normalizeLocalDay(customStartDate).getTime()) {
        setCustomStartDate(nextAvailableStart);
        setCustomCalendarMonth(nextAvailableStart);
      }
    }
  }, [open, item?.mediaUnitId, item?.startDate, occupationMode, customStartDate, reservationRanges]);

  useEffect(() => {
    if (!open || !item?.mediaUnitId || occupationMode !== 'custom') return;

    const baseMonth = customStartDate
      ? normalizeLocalDay(customStartDate)
      : item.startDate
        ? normalizeLocalDay(new Date(item.startDate as any))
        : normalizeLocalDay(new Date());

    setCustomCalendarMonth(baseMonth);
  }, [open, item?.mediaUnitId, item?.startDate, occupationMode, customStartDate]);

  const pricing = useMemo(() => {
    if (!item || !item.mediaUnitId) {
      return { priceMonth: 0, priceBiweekly: 0, bannerCost: 0, otherCosts: 0, rentPerUnit: 0, upfrontPerUnit: 0, perUnitTotal: unitPrice };
    }

    const days = Number.isFinite(occupationDays) ? occupationDays : 0;
    const clamped = Math.min(Math.max(0, days), OCCUPATION_MAX_DAYS);
    const isValid = clamped > 0;

    const priceMonth = Number(item.priceMonthSnapshot) || 0;
    const priceBiweekly = Number(item.priceBiweeklySnapshot) || 0;

    const rentPerUnit = computeRentPerUnit(clamped, priceMonth, priceBiweekly);

    const bannerCost = Number(item.productionCostSnapshot) || 0;
    const otherCosts = Number(item.installationCostSnapshot) || 0;
    const upfrontPerUnit = otherCosts + (clientProvidesBanner ? 0 : bannerCost);

    const perUnitTotal = isValid ? (rentPerUnit + upfrontPerUnit) : 0;

    return { priceMonth, priceBiweekly, bannerCost, otherCosts, rentPerUnit, upfrontPerUnit, perUnitTotal };
  }, [item, occupationDays, clientProvidesBanner, unitPrice]);

  // Mantém unitPrice sincronizado no modo mídia
  useEffect(() => {
    if (!open) return;
    if (item?.mediaUnitId) setUnitPrice(pricing.perUnitTotal);
  }, [open, item?.mediaUnitId, pricing.perUnitTotal]);

  const qty = Math.max(1, Number(quantity) || 1);

  const pct = Number.isFinite(discountPercent) ? discountPercent : 0;
  const amt = Number.isFinite(discountAmount) ? discountAmount : 0;

  const rentTotal = isMedia ? qty * pricing.rentPerUnit : 0;
  const upfrontTotal = isMedia ? qty * pricing.upfrontPerUnit : 0;
  const baseTotal = isMedia ? rentTotal + upfrontTotal : qty * unitPrice;

  const applyReduction = (baseValue: number, pcent: number, amount: number) => {
    let next = baseValue;
    if (pcent > 0) next = next * (1 - pcent / 100);
    if (amount > 0) next = next - amount;
    if (!Number.isFinite(next)) next = 0;
    return Math.max(0, next);
  };

  const rentAfter = isMedia ? applyReduction(rentTotal, rentDiscountPercent, rentDiscountAmount) : rentTotal;
  const upfrontAfter = isMedia ? applyReduction(upfrontTotal, costDiscountPercent, costDiscountAmount) : upfrontTotal;
  const subtotalBeforeGeneral = isMedia ? (rentAfter + upfrontAfter) : baseTotal;
  const discountedTotal = isGift ? 0 : applyReduction(subtotalBeforeGeneral, totalDiscountPercent || pct, totalDiscountAmount || amt);
  const computedDiscountValue = Math.max(0, baseTotal - discountedTotal);

  const minimumCustomStartDate = item?.startDate
    ? normalizeLocalDay(new Date(item.startDate as any))
    : normalizeLocalDay(new Date());
  const resolvedCustomStartDate = occupationMode === 'custom'
    ? (customStartDate ? normalizeLocalDay(customStartDate) : null)
    : null;
  const resolvedCustomEndDate = resolvedCustomStartDate ? addDays(resolvedCustomStartDate, occupationDays) : null;
  const customRangeConflictDate = isMedia && occupationMode === 'custom' && resolvedCustomStartDate && resolvedCustomEndDate
    ? findFirstConflictDateInRange(resolvedCustomStartDate, resolvedCustomEndDate, reservationRanges)
    : null;
  const customSelectionError = !isMedia || occupationMode !== 'custom'
    ? null
    : !resolvedCustomStartDate
      ? 'Selecione a data inicial da ocupação.'
      : resolvedCustomStartDate.getTime() < minimumCustomStartDate.getTime()
        ? `A data inicial deve ser igual ou posterior a ${formatShortDate(minimumCustomStartDate)}.`
        : customRangeConflictDate
          ? `O período customizado cruza uma ocupação em ${formatShortDate(customRangeConflictDate)}. Ajuste o início ou a duração.`
          : null;
  const isOccupationValid = !isMedia || (
    occupationDays > 0 &&
    occupationDays <= OCCUPATION_MAX_DAYS &&
    (occupationMode !== 'custom' || !customSelectionError)
  );

  const handleSave = () => {
    if (!item) return;

    const normalizedDescription = isGift
      ? `${description.replace(/\s*\(Brinde\)\s*$/i, '').trim()} (Brinde)`
      : description.replace(/\s*\(Brinde\)\s*$/i, '').trim();

    const updated: ProposalItem = {
      ...item,
      description: normalizedDescription,
      quantity,
      unitPrice,
      discountPercent: totalDiscountPercent > 0 ? totalDiscountPercent : (pct > 0 ? pct : undefined),
      discountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : (amt > 0 ? amt : undefined),
      discountApplyTo: ProposalItemDiscountApplyTo.TOTAL,
      rentDiscountPercent: rentDiscountPercent > 0 ? rentDiscountPercent : undefined,
      rentDiscountAmount: rentDiscountAmount > 0 ? rentDiscountAmount : undefined,
      costDiscountPercent: costDiscountPercent > 0 ? costDiscountPercent : undefined,
      costDiscountAmount: costDiscountAmount > 0 ? costDiscountAmount : undefined,
      totalDiscountPercent: totalDiscountPercent > 0 ? totalDiscountPercent : undefined,
      totalDiscountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
      isGift,
      totalPrice: discountedTotal,
      updatedAt: new Date(),
    };

    if (item.mediaUnitId) {
      updated.occupationDays = occupationDays;
      updated.clientProvidesBanner = clientProvidesBanner;

      const baseStart = occupationMode === 'custom'
        ? resolvedCustomStartDate
        : item.startDate
          ? normalizeLocalDay(new Date(item.startDate as any))
          : null;

      updated.startDate = baseStart ? new Date(baseStart) : undefined;
      updated.endDate = baseStart ? addDays(baseStart, occupationDays) : undefined;
    } else {
      updated.startDate = startDate;
      updated.endDate = endDate;
    }

    onSave(updated);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {isMedia ? (
            <>
              <div className="space-y-2">
                <Label>Tempo de ocupação</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === '15' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('15');
                      setOccupationDays(15);
                      setCustomStartDate(null);
                    }}
                  >
                    15 dias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === '30' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('30');
                      setOccupationDays(30);
                      setCustomStartDate(null);
                    }}
                  >
                    30 dias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={occupationMode === 'custom' ? 'default' : 'outline'}
                    onClick={() => {
                      setOccupationMode('custom');
                      setOccupationDays((prev) => (prev >= 15 ? prev : 15));
                      const nextAvailableStart = findNextAvailableStartOnOrAfter(customStartDate ?? minimumCustomStartDate, reservationRanges);
                      setCustomStartDate(nextAvailableStart);
                      setCustomCalendarMonth(nextAvailableStart);
                    }}
                  >
                    Personalizado
                  </Button>
                </div>

                {occupationMode === 'custom' ? (
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="mb-1 block text-xs font-medium text-gray-600">Data inicial</Label>
                        <Input
                          type="date"
                          min={minimumCustomStartDate.toISOString().split('T')[0]}
                          value={resolvedCustomStartDate ? resolvedCustomStartDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (!rawValue) {
                              setCustomStartDate(null);
                              return;
                            }

                            const pickedDate = normalizeLocalDay(new Date(`${rawValue}T00:00:00`));
                            const safeStart = pickedDate.getTime() < minimumCustomStartDate.getTime()
                              ? minimumCustomStartDate
                              : pickedDate;

                            if (isDayOccupied(safeStart, reservationRanges)) {
                              const nextAvailableStart = findNextAvailableStartOnOrAfter(safeStart, reservationRanges);
                              setCustomStartDate(nextAvailableStart);
                              setCustomCalendarMonth(nextAvailableStart);
                              return;
                            }

                            setCustomStartDate(safeStart);
                            setCustomCalendarMonth(safeStart);
                          }}
                        />
                      </div>

                      <div>
                        <Label className="mb-1 block text-xs font-medium text-gray-600">Duração (dias)</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          max={OCCUPATION_MAX_DAYS}
                          value={occupationDays}
                          onChange={(e) => {
                            const nextValue = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                            setOccupationDays(nextValue);
                          }}
                        />
                        <p className="mt-1 text-[11px] text-gray-500">Informe a quantidade de dias. O calendário marca automaticamente o intervalo.</p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white">
                      <Calendar
                        mode="range"
                        month={customCalendarMonth}
                        onMonthChange={(date: Date) => setCustomCalendarMonth(normalizeLocalDay(date))}
                        className="w-full"
                        classNames={{
                          month: 'w-full space-y-4',
                          table: 'mx-auto w-full max-w-[340px] border-collapse space-y-1',
                          head_row: 'grid grid-cols-7',
                          row: 'mt-2 grid grid-cols-7',
                          cell: 'relative h-10 w-full p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md',
                          head_cell: 'flex h-10 w-full items-center justify-center rounded-md text-[0.8rem] font-normal text-muted-foreground',
                          day: 'h-10 w-10 p-0 font-normal aria-selected:opacity-100',
                        }}
                        selected={resolvedCustomStartDate ? { from: resolvedCustomStartDate, to: resolvedCustomEndDate ?? resolvedCustomStartDate } : undefined}
                        onDayClick={(date: Date) => {
                          const pickedDate = normalizeLocalDay(date);
                          const safeStart = pickedDate.getTime() < minimumCustomStartDate.getTime()
                            ? minimumCustomStartDate
                            : pickedDate;

                          if (isDayOccupied(safeStart, reservationRanges)) return;
                          setCustomStartDate(safeStart);
                          setCustomCalendarMonth(safeStart);
                        }}
                        disabled={(date: Date) => {
                          const localDate = normalizeLocalDay(date);
                          return localDate.getTime() < minimumCustomStartDate.getTime() || isDayOccupied(localDate, reservationRanges);
                        }}
                      />
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Datas ocupadas ficam bloqueadas no calendário.</div>
                      {resolvedCustomStartDate && resolvedCustomEndDate ? (
                        <div>
                          Período customizado: <span className="font-medium text-gray-800">{formatShortDate(resolvedCustomStartDate)} – {formatShortDate(resolvedCustomEndDate)}</span>
                        </div>
                      ) : null}
                      {reservationRangesLoading ? <div className="text-gray-500">Carregando calendário de ocupação...</div> : null}
                      {reservationRangesError ? <div className="text-red-600">{reservationRangesError}</div> : null}
                      {customSelectionError ? <div className="text-amber-700">{customSelectionError}</div> : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Total: {occupationDays} dias</p>
                )}

                {!isOccupationValid && (
                  <p className="text-xs text-red-600">
                    Selecione um tempo válido (mínimo de 1 dia).
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="clientProvidesBanner"
                  checked={clientProvidesBanner}
                  onCheckedChange={(v: boolean | 'indeterminate') => setClientProvidesBanner(v === true)}
                />
                <div>
                  <Label htmlFor="clientProvidesBanner">Cliente irá fornecer a lona</Label>
                  <p className="text-xs text-gray-500">
                    Se marcado, não contabiliza custo de produção (somente instalação/montagem).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço mensal</Label>
                  <Input value={formatPrice(pricing.priceMonth)} readOnly disabled />
                </div>
                <div>
                  <Label>Preço bi-semana</Label>
                  <Input value={formatPrice(pricing.priceBiweekly)} readOnly disabled />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Aluguel por unidade</span><span className="text-gray-900">{formatPrice(pricing.rentPerUnit)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Lona</span><span className="text-gray-900">{formatPrice(clientProvidesBanner ? 0 : pricing.bannerCost)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Demais custos (adesivo + vinil + instalação)</span><span className="text-gray-900">{formatPrice(pricing.otherCosts)}</span></div>
                <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2"><span className="text-gray-900">Total por unidade</span><span className="text-gray-900">{formatPrice(pricing.perUnitTotal)}</span></div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-amber-900">Adicionar como brinde</div>
                  <Checkbox checked={isGift} onCheckedChange={(v: boolean | 'indeterminate') => setIsGift(v === true)} />
                </div>
                <p className="mt-1 text-xs text-amber-800">O item permanece vinculado à proposta, mas com valor final R$ 0,00.</p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? parseLocalDate(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Data de fim</Label>
                <Input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(e.target.value ? parseLocalDate(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div>
              <Label>Preço Unitário</Label>
              <Input
                type={isMedia ? 'text' : 'number'}
                min={0}
                step="0.01"
                value={isMedia ? formatPrice(unitPrice) : unitPrice}
                onChange={(e) => {
                  if (isMedia) return;
                  setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                readOnly={isMedia}
                disabled={isMedia}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>

            <div>
              <Label>Preço Unitário</Label>
              <Input
                type={isMedia ? 'text' : 'number'}
                min={0}
                step="0.01"
                value={isMedia ? formatPrice(unitPrice) : unitPrice}
                onChange={(e) => {
                  if (isMedia) return;
                  setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                readOnly={isMedia}
                disabled={isMedia}
              />
            </div>
          </div>

          {isMedia ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border p-3 space-y-3">
                <div className="font-medium text-gray-900">Desconto no aluguel</div>
                <Input type="number" min="0" step="0.01" value={rentDiscountPercent || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setRentDiscountPercent(v); if (v > 0) setRentDiscountAmount(0); }} disabled={isGift || !!rentDiscountAmount} placeholder="%" />
                <Input type="number" min="0" step="0.01" value={rentDiscountAmount || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setRentDiscountAmount(v); if (v > 0) setRentDiscountPercent(0); }} disabled={isGift || !!rentDiscountPercent} placeholder="R$" />
              </div>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="font-medium text-gray-900">Desconto nos custos</div>
                <Input type="number" min="0" step="0.01" value={costDiscountPercent || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setCostDiscountPercent(v); if (v > 0) setCostDiscountAmount(0); }} disabled={isGift || !!costDiscountAmount} placeholder="%" />
                <Input type="number" min="0" step="0.01" value={costDiscountAmount || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setCostDiscountAmount(v); if (v > 0) setCostDiscountPercent(0); }} disabled={isGift || !!costDiscountPercent} placeholder="R$" />
              </div>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="font-medium text-gray-900">Desconto geral adicional</div>
                <Input type="number" min="0" step="0.01" value={totalDiscountPercent || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setTotalDiscountPercent(v); if (v > 0) setTotalDiscountAmount(0); }} disabled={isGift || !!totalDiscountAmount} placeholder="%" />
                <Input type="number" min="0" step="0.01" value={totalDiscountAmount || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setTotalDiscountAmount(v); if (v > 0) setTotalDiscountPercent(0); }} disabled={isGift || !!totalDiscountPercent} placeholder="R$" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desconto em %</Label>
                <Input type="number" min={0} step="0.01" value={discountPercent || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setDiscountPercent(v); if (v > 0) setDiscountAmount(0); }} disabled={!!discountAmount} />
              </div>
              <div>
                <Label>Desconto em R$</Label>
                <Input type="number" min={0} step="0.01" value={discountAmount || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setDiscountAmount(v); if (v > 0) setDiscountPercent(0); }} disabled={!!discountPercent} />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">{isMedia ? 'Você pode combinar desconto no aluguel, nos custos e ainda um desconto geral adicional.' : 'Preencha apenas um campo de desconto para o item.'}</p>

          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-center">
              <span className="text-indigo-900">Total do Item:</span>
              <span className="text-indigo-900 font-medium">{formatPrice(discountedTotal)}</span>
            </div>
            <p className="text-sm text-indigo-700 mt-1">
              {isGift ? 'Item marcado como brinde.' : `${quantity} x ${formatPrice(unitPrice)}`}
            </p>
            {computedDiscountValue > 0 && (
              <div className="mt-2 text-xs text-indigo-800">
                <div className="flex justify-between">
                  <span>Original:</span>
                  <span>{formatPrice(baseTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isMedia ? 'Reduções aplicadas:' : `Desconto${discountPercent > 0 ? ` (${discountPercent}%)` : ''}:`}</span>
                  <span>-{formatPrice(computedDiscountValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isMedia && !isOccupationValid}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
