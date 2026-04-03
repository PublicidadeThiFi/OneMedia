import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Gift, Image as ImageIcon, MapPin, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import apiClient from '../../lib/apiClient';
import { MediaPoint, MediaPointOwner, MediaType, MediaUnit, ProductionCosts, ProposalItem, ProposalItemDiscountApplyTo } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';

interface MediaSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: (items: ProposalItem[]) => void;
  initialMediaPointId?: string;
  allowedMediaPointIds?: string[];
  referenceStartDate?: Date | null;
  onReferenceStartDateChange?: (date: Date) => void;
  existingMediaUnitIds?: string[];
}

type AvailabilityStatus = 'checking' | 'available' | 'occupied' | 'unknown';
type AvailabilityInfo = { status: AvailabilityStatus; nextAvailableAt?: string | null; conflictCount?: number };

type MediaUnitWithPoint = MediaUnit & {
  pointId?: string;
  pointName?: string;
  pointType?: MediaType;
  pointAddress?: string;
  dimensions?: string;
  pointProductionCosts?: ProductionCosts | null;
};

type DraftSnapshot = {
  mediaUnitId: string;
  mediaPointId: string;
  mediaPointOwnerId?: string | null;
  description: string;
  startDate?: Date;
  endDate?: Date;
  occupationDays: number;
  clientProvidesBanner: boolean;
  priceMonthSnapshot: number;
  priceBiweeklySnapshot: number;
  productionCostSnapshot: number;
  installationCostSnapshot: number;
  rentTotalSnapshot: number;
  upfrontTotalSnapshot: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  discountApplyTo: ProposalItemDiscountApplyTo;
  rentDiscountPercent?: number;
  rentDiscountAmount?: number;
  costDiscountPercent?: number;
  costDiscountAmount?: number;
  totalDiscountPercent?: number;
  totalDiscountAmount?: number;
  isGift: boolean;
  nextAvailableAt?: Date | string | null;
  isValid: boolean;
  shouldAutoUseNextAvailable: boolean;
};

const OCCUPATION_MAX_DAYS = 365 * 10 + 30 * 24 + 31;

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

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAddress(point: MediaPoint) {
  return [point.addressStreet, point.addressNumber, point.addressDistrict, point.addressCity, point.addressState]
    .filter(Boolean)
    .join(', ');
}

function formatDimensions(unit: MediaUnit) {
  if (unit.widthM && unit.heightM) {
    return `${Number(unit.widthM)}m x ${Number(unit.heightM)}m`;
  }
  if (unit.resolutionWidthPx && unit.resolutionHeightPx) {
    return `${unit.resolutionWidthPx}x${unit.resolutionHeightPx}px`;
  }
  return undefined;
}

function formatShortDate(date: Date) {
  const iso = normalizeLocalDay(date).toISOString().slice(0, 10);
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function computeRentPerUnit(days: number, priceMonth: number, priceBiweekly: number) {
  const normalizedDays = Math.max(0, Math.floor(days));
  const month = Math.max(0, safeNumber(priceMonth));
  const biweekly = Math.max(0, safeNumber(priceBiweekly));

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

function isDateWithinRange(date: Date, start: Date, end: Date) {
  const current = normalizeLocalDay(date).getTime();
  const from = normalizeLocalDay(start).getTime();
  const to = normalizeLocalDay(end).getTime();
  return current >= from && current <= to;
}

function isDayOccupied(date: Date, ranges: Array<{ startDate: string; endDate: string }>) {
  return ranges.some((range) => {
    const rangeStart = new Date(range.startDate);
    const rangeEnd = new Date(range.endDate);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) return false;
    return isDateWithinRange(date, rangeStart, rangeEnd);
  });
}

function findFirstConflictDateInRange(start: Date, end: Date, ranges: Array<{ startDate: string; endDate: string }>) {
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

function buildInitialDraft(unit: MediaUnitWithPoint, point: MediaPoint, referenceStartDate?: Date | null, snapshot?: DraftSnapshot) {
  return {
    description: snapshot?.description?.replace(/ \(Brinde\)$/u, '') || `${point.name} - ${unit.label}`,
    quantity: snapshot?.quantity ?? 1,
    unitPrice: snapshot?.unitPrice ?? 0,
    discountPercent: snapshot?.discountPercent ?? 0,
    discountAmount: snapshot?.discountAmount ?? 0,
    rentDiscountPercent: snapshot?.rentDiscountPercent ?? 0,
    rentDiscountAmount: snapshot?.rentDiscountAmount ?? 0,
    costDiscountPercent: snapshot?.costDiscountPercent ?? 0,
    costDiscountAmount: snapshot?.costDiscountAmount ?? 0,
    totalDiscountPercent: snapshot?.totalDiscountPercent ?? 0,
    totalDiscountAmount: snapshot?.totalDiscountAmount ?? 0,
    isGift: snapshot?.isGift ?? false,
    mediaPointOwnerId: snapshot?.mediaPointOwnerId ?? '',
    occupationMode: snapshot ? ((snapshot.startDate && referenceStartDate && normalizeLocalDay(snapshot.startDate).getTime() !== normalizeLocalDay(referenceStartDate).getTime()) ? 'custom' : (snapshot.occupationDays === 15 ? '15' : snapshot.occupationDays === 30 ? '30' : 'custom')) : '30',
    occupationDays: snapshot?.occupationDays ?? 30,
    clientProvidesBanner: snapshot?.clientProvidesBanner ?? false,
    customStartDate: snapshot?.startDate ? normalizeLocalDay(new Date(snapshot.startDate)) : null as Date | null,
    useNextAvailableDate: snapshot?.shouldAutoUseNextAvailable ?? false,
    calendarMonth: snapshot?.startDate ? normalizeLocalDay(new Date(snapshot.startDate)) : normalizeLocalDay(referenceStartDate ?? new Date()),
  };
}

interface MediaUnitCardProps {
  unit: MediaUnitWithPoint;
  point: MediaPoint;
  selected: boolean;
  initialSnapshot?: DraftSnapshot;
  referenceStartDate?: Date | null;
  onSelectedChange: () => void;
  onDraftChange: (draft: DraftSnapshot | null) => void;
}

function MediaUnitCard({
  unit,
  point,
  selected,
  initialSnapshot,
  referenceStartDate,
  onSelectedChange,
  onDraftChange,
}: MediaUnitCardProps) {
  const { company } = useCompany();

  const initial = useMemo(() => buildInitialDraft(unit, point, referenceStartDate, initialSnapshot), [unit, point, referenceStartDate, initialSnapshot]);

  const [description, setDescription] = useState(initial.description);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice);
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent);
  const [discountAmount, setDiscountAmount] = useState(initial.discountAmount);
  const [rentDiscountPercent, setRentDiscountPercent] = useState(initial.rentDiscountPercent);
  const [rentDiscountAmount, setRentDiscountAmount] = useState(initial.rentDiscountAmount);
  const [costDiscountPercent, setCostDiscountPercent] = useState(initial.costDiscountPercent);
  const [costDiscountAmount, setCostDiscountAmount] = useState(initial.costDiscountAmount);
  const [totalDiscountPercent, setTotalDiscountPercent] = useState(initial.totalDiscountPercent);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(initial.totalDiscountAmount);
  const [isGift, setIsGift] = useState(initial.isGift);
  const [mediaPointOwnerId, setMediaPointOwnerId] = useState(initial.mediaPointOwnerId);
  const [occupationMode, setOccupationMode] = useState<'15' | '30' | 'custom'>(initial.occupationMode as '15' | '30' | 'custom');
  const [occupationDays, setOccupationDays] = useState(initial.occupationDays);
  const [clientProvidesBanner, setClientProvidesBanner] = useState(initial.clientProvidesBanner);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(initial.customStartDate);
  const [useNextAvailableDate, setUseNextAvailableDate] = useState(initial.useNextAvailableDate);
  const [calendarMonth, setCalendarMonth] = useState<Date>(initial.calendarMonth);

  const [owners, setOwners] = useState<MediaPointOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilityInfo>({ status: 'checking', nextAvailableAt: null, conflictCount: 0 });
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reservationRanges, setReservationRanges] = useState<Array<{ startDate: string; endDate: string }>>([]);
  const [reservationRangesLoading, setReservationRangesLoading] = useState(false);
  const [reservationRangesError, setReservationRangesError] = useState<string | null>(null);

  const wasSelectedRef = useRef(false);

  useEffect(() => {
    if (!selected) {
      wasSelectedRef.current = false;
      onDraftChange(null);
      return;
    }

    if (wasSelectedRef.current) return;
    wasSelectedRef.current = true;

    setDescription(initial.description);
    setQuantity(initial.quantity);
    setUnitPrice(initial.unitPrice);
    setDiscountPercent(initial.discountPercent);
    setDiscountAmount(initial.discountAmount);
    setRentDiscountPercent(initial.rentDiscountPercent);
    setRentDiscountAmount(initial.rentDiscountAmount);
    setCostDiscountPercent(initial.costDiscountPercent);
    setCostDiscountAmount(initial.costDiscountAmount);
    setTotalDiscountPercent(initial.totalDiscountPercent);
    setTotalDiscountAmount(initial.totalDiscountAmount);
    setIsGift(initial.isGift);
    setMediaPointOwnerId(initial.mediaPointOwnerId);
    setOccupationMode(initial.occupationMode as '15' | '30' | 'custom');
    setOccupationDays(initial.occupationDays);
    setClientProvidesBanner(initial.clientProvidesBanner);
    setCustomStartDate(initial.customStartDate);
    setUseNextAvailableDate(initial.useNextAvailableDate);
    setCalendarMonth(initial.calendarMonth);
  }, [selected, initial, onDraftChange]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setOwnersLoading(true);
    setOwnersError(null);

    apiClient.get<any>(`/media-points/${point.id}/owners`)
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        const parsed: MediaPointOwner[] = Array.isArray(data) ? data : [];
        setOwners(parsed);
        if (!mediaPointOwnerId) {
          const primary = parsed.find((owner: any) => owner?.ownerCompany?.isPrimary);
          if (primary) setMediaPointOwnerId(primary.id);
          else if (parsed.length === 1) setMediaPointOwnerId(parsed[0].id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOwners([]);
        setOwnersError('Erro ao carregar empresas vinculadas ao ponto.');
      })
      .finally(() => {
        if (!cancelled) setOwnersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, point.id]);

  const availabilityWindow = useMemo(() => {
    const resolvedCustomStart = occupationMode === 'custom' && customStartDate ? normalizeLocalDay(customStartDate) : null;
    const start = resolvedCustomStart ?? normalizeLocalDay(referenceStartDate ?? new Date());
    const end = addDays(start, occupationDays);
    return { start, end };
  }, [occupationMode, customStartDate, referenceStartDate, occupationDays]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setAvailability({ status: 'checking', nextAvailableAt: null, conflictCount: 0 });
    setAvailabilityError(null);

    apiClient.get<any>('/reservations/availability', {
      params: {
        mediaUnitId: unit.id,
        startDate: availabilityWindow.start.toISOString(),
        endDate: availabilityWindow.end.toISOString(),
      },
    })
      .then((res) => {
        if (cancelled) return;
        const payload = res.data ?? {};
        const available = Boolean(payload?.available);
        const conflicts = Array.isArray(payload?.conflicts) ? payload.conflicts : [];
        const nextAvailableAtRaw = payload?.nextAvailableAt ? new Date(payload.nextAvailableAt) : null;
        const nextAvailableAt = !available && nextAvailableAtRaw && !Number.isNaN(nextAvailableAtRaw.getTime())
          ? nextAvailableAtRaw.toISOString()
          : null;
        setAvailability({
          status: available ? 'available' : 'occupied',
          nextAvailableAt,
          conflictCount: conflicts.length,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability({ status: 'unknown', nextAvailableAt: null, conflictCount: 0 });
        setAvailabilityError('Não foi possível verificar a disponibilidade desta face.');
      });

    return () => {
      cancelled = true;
    };
  }, [selected, unit.id, availabilityWindow.start, availabilityWindow.end]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setReservationRangesLoading(true);
    setReservationRangesError(null);

    apiClient.get<any>('/reservations/occupancy', { params: { mediaUnitId: unit.id } })
      .then((res) => {
        if (cancelled) return;
        const payload = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const ranges = Array.isArray(payload)
          ? payload
              .map((item: any) => ({ startDate: item?.startDate, endDate: item?.endDate }))
              .filter((item: any) => item.startDate && item.endDate)
          : [];
        setReservationRanges(ranges);
      })
      .catch(() => {
        if (cancelled) return;
        setReservationRanges([]);
        setReservationRangesError('Não foi possível carregar o calendário de ocupação desta face.');
      })
      .finally(() => {
        if (!cancelled) setReservationRangesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, unit.id]);

  useEffect(() => {
    if (!selected) return;
    if (availability.status === 'occupied' && availability.nextAvailableAt) {
      setUseNextAvailableDate(true);
    } else if (availability.status === 'available') {
      setUseNextAvailableDate(false);
    }
  }, [selected, availability.status, availability.nextAvailableAt]);

  useEffect(() => {
    if (!selected || occupationMode !== 'custom') return;
    const minimumStart = normalizeLocalDay(referenceStartDate ?? new Date());
    const baseStart = customStartDate ? normalizeLocalDay(customStartDate) : minimumStart;
    const nextCandidate = baseStart.getTime() < minimumStart.getTime() ? minimumStart : baseStart;

    if (!customStartDate || isDayOccupied(nextCandidate, reservationRanges) || nextCandidate.getTime() < minimumStart.getTime()) {
      const nextAvailableStart = findNextAvailableStartOnOrAfter(nextCandidate, reservationRanges);
      if (!customStartDate || nextAvailableStart.getTime() !== normalizeLocalDay(customStartDate).getTime()) {
        setCustomStartDate(nextAvailableStart);
        setCalendarMonth(nextAvailableStart);
      }
    }
  }, [selected, occupationMode, referenceStartDate, customStartDate, reservationRanges]);

  useEffect(() => {
    if (!selected || occupationMode !== 'custom') return;
    setCalendarMonth(customStartDate ? normalizeLocalDay(customStartDate) : normalizeLocalDay(referenceStartDate ?? new Date()));
  }, [selected, occupationMode, customStartDate, referenceStartDate]);

  const pointPriceMonth = safeNumber(unit.priceMonth ?? point.basePriceMonth ?? 0);
  const pointPriceBiweekly = safeNumber(unit.priceWeek ?? point.basePriceWeek ?? 0);
  const pointProductionCosts = unit.pointProductionCosts ?? point.productionCosts ?? null;
  const bannerCost = safeNumber(pointProductionCosts?.lona ?? 0);
  const adhesiveCost = safeNumber((pointProductionCosts as any)?.adesivo ?? 0);
  const vinylCost = safeNumber((pointProductionCosts as any)?.vinil ?? 0);
  const installationCost = safeNumber(pointProductionCosts?.montagem ?? 0);

  const rentPerUnit = useMemo(
    () => computeRentPerUnit(occupationDays, pointPriceMonth, pointPriceBiweekly),
    [occupationDays, pointPriceMonth, pointPriceBiweekly],
  );

  const upfrontPerUnit = installationCost + adhesiveCost + vinylCost + (clientProvidesBanner ? 0 : bannerCost);
  const computedPerUnitTotal = rentPerUnit + upfrontPerUnit;

  useEffect(() => {
    if (!selected) return;
    setUnitPrice(computedPerUnitTotal);
  }, [selected, computedPerUnitTotal]);

  const discountCalc = useMemo(() => {
    const qty = Math.max(1, Number(quantity) || 1);
    const rawRentTotal = qty * rentPerUnit;
    const rawCostsTotal = qty * upfrontPerUnit;
    const rawBaseTotal = rawRentTotal + rawCostsTotal;

    const applyReduction = (baseValue: number, pct: number, amt: number) => {
      let next = baseValue;
      const safePct = safeNumber(pct);
      const safeAmt = safeNumber(amt);
      if (safePct > 0) next = next * (1 - safePct / 100);
      if (safeAmt > 0) next = next - safeAmt;
      if (!Number.isFinite(next)) next = 0;
      return Math.max(0, next);
    };

    const rentAfter = applyReduction(rawRentTotal, rentDiscountPercent, rentDiscountAmount);
    const costsAfter = applyReduction(rawCostsTotal, costDiscountPercent, costDiscountAmount);
    const subtotalBeforeGeneral = rentAfter + costsAfter;
    let totalAfter = applyReduction(subtotalBeforeGeneral, totalDiscountPercent || discountPercent, totalDiscountAmount || discountAmount);
    if (isGift) totalAfter = 0;

    const factor = subtotalBeforeGeneral > 0 ? totalAfter / subtotalBeforeGeneral : 0;
    return {
      rawBaseTotal,
      finalRent: isGift ? 0 : rentAfter * factor,
      finalCosts: isGift ? 0 : costsAfter * factor,
      totalPrice: Math.max(0, totalAfter),
      computedDiscountValue: Math.max(0, rawBaseTotal - Math.max(0, totalAfter)),
    };
  }, [quantity, rentPerUnit, upfrontPerUnit, rentDiscountPercent, rentDiscountAmount, costDiscountPercent, costDiscountAmount, totalDiscountPercent, totalDiscountAmount, discountPercent, discountAmount, isGift]);

  const selectedNextAvailableAt = availability.nextAvailableAt ? new Date(availability.nextAvailableAt) : null;
  const minimumCustomStartDate = normalizeLocalDay(referenceStartDate ?? new Date());
  const resolvedCustomStartDate = occupationMode === 'custom' ? (customStartDate ? normalizeLocalDay(customStartDate) : null) : null;
  const resolvedCustomEndDate = resolvedCustomStartDate ? addDays(resolvedCustomStartDate, occupationDays) : null;
  const customRangeConflictDate =
    occupationMode === 'custom' && resolvedCustomStartDate && resolvedCustomEndDate
      ? findFirstConflictDateInRange(resolvedCustomStartDate, resolvedCustomEndDate, reservationRanges)
      : null;

  const customSelectionError = occupationMode !== 'custom'
    ? null
    : !resolvedCustomStartDate
      ? 'Selecione a data inicial da ocupação.'
      : resolvedCustomStartDate.getTime() < minimumCustomStartDate.getTime()
        ? `A data inicial deve ser igual ou posterior a ${formatShortDate(minimumCustomStartDate)}.`
        : customRangeConflictDate
          ? `O período customizado cruza uma ocupação em ${formatShortDate(customRangeConflictDate)}.`
          : null;

  const isOccupationValid = occupationDays > 0 && occupationDays <= OCCUPATION_MAX_DAYS && (occupationMode !== 'custom' || !customSelectionError);
  const canAutoScheduleFromNextAvailable =
    occupationMode !== 'custom' &&
    !!selectedNextAvailableAt &&
    (!referenceStartDate || useNextAvailableDate || availability.status === 'occupied');
  const isSelectedUnitAvailable = occupationMode === 'custom'
    ? availability.status === 'available' && !customSelectionError
    : availability.status === 'available' || canAutoScheduleFromNextAvailable || (availability.status === 'unknown' && !!unit.id);

  const effectiveStartDate = useMemo(() => {
    if (occupationMode === 'custom') {
      return resolvedCustomStartDate ? new Date(resolvedCustomStartDate) : undefined;
    }
    if (canAutoScheduleFromNextAvailable && selectedNextAvailableAt) {
      return new Date(selectedNextAvailableAt);
    }
    return referenceStartDate ? new Date(referenceStartDate) : new Date(availabilityWindow.start);
  }, [occupationMode, resolvedCustomStartDate, canAutoScheduleFromNextAvailable, selectedNextAvailableAt, referenceStartDate, availabilityWindow.start]);

  const isValid =
    !!description &&
    quantity > 0 &&
    unitPrice >= 0 &&
    isOccupationValid &&
    isSelectedUnitAvailable &&
    owners.length > 0 &&
    !!mediaPointOwnerId &&
    !ownersLoading &&
    !ownersError &&
    !!effectiveStartDate;

  useEffect(() => {
    if (!selected) return;
    onDraftChange({
      mediaUnitId: unit.id,
      mediaPointId: point.id,
      mediaPointOwnerId: mediaPointOwnerId || null,
      description: isGift ? `${description} (Brinde)` : description,
      startDate: effectiveStartDate,
      endDate: effectiveStartDate ? addDays(effectiveStartDate, occupationDays) : undefined,
      occupationDays,
      clientProvidesBanner,
      priceMonthSnapshot: pointPriceMonth,
      priceBiweeklySnapshot: pointPriceBiweekly,
      productionCostSnapshot: bannerCost,
      installationCostSnapshot: adhesiveCost + vinylCost + installationCost,
      rentTotalSnapshot: discountCalc.finalRent,
      upfrontTotalSnapshot: discountCalc.finalCosts,
      quantity,
      unitPrice,
      totalPrice: discountCalc.totalPrice,
      discountPercent: totalDiscountPercent > 0 ? totalDiscountPercent : (discountPercent > 0 ? discountPercent : undefined),
      discountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : (discountAmount > 0 ? discountAmount : undefined),
      discountApplyTo: ProposalItemDiscountApplyTo.TOTAL,
      rentDiscountPercent: rentDiscountPercent > 0 ? rentDiscountPercent : undefined,
      rentDiscountAmount: rentDiscountAmount > 0 ? rentDiscountAmount : undefined,
      costDiscountPercent: costDiscountPercent > 0 ? costDiscountPercent : undefined,
      costDiscountAmount: costDiscountAmount > 0 ? costDiscountAmount : undefined,
      totalDiscountPercent: totalDiscountPercent > 0 ? totalDiscountPercent : undefined,
      totalDiscountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
      isGift,
      nextAvailableAt: availability.nextAvailableAt ?? null,
      isValid,
      shouldAutoUseNextAvailable: canAutoScheduleFromNextAvailable,
    });
  }, [
    selected,
    unit.id,
    point.id,
    mediaPointOwnerId,
    description,
    effectiveStartDate,
    occupationDays,
    clientProvidesBanner,
    pointPriceMonth,
    pointPriceBiweekly,
    bannerCost,
    adhesiveCost,
    vinylCost,
    installationCost,
    discountCalc.finalRent,
    discountCalc.finalCosts,
    quantity,
    unitPrice,
    discountCalc.totalPrice,
    totalDiscountPercent,
    discountPercent,
    totalDiscountAmount,
    discountAmount,
    rentDiscountPercent,
    rentDiscountAmount,
    costDiscountPercent,
    costDiscountAmount,
    isGift,
    availability.nextAvailableAt,
    isValid,
    canAutoScheduleFromNextAvailable,
  ]);

  return (
    <div className={`rounded-xl border transition-all ${selected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white'}`}>
      <button type="button" className="w-full p-4 text-left" onClick={onSelectedChange}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-xl p-2 ${point.type === 'DOOH' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">{unit.label}</h3>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">{point.type}</span>
                {unit.unitType ? <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">{unit.unitType}</span> : null}
                {selected ? <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] text-white">Selecionado</span> : null}
              </div>
              <div className="mt-1 text-sm text-gray-900">{point.name}</div>
              <p className="mt-1 text-sm text-gray-500">{unit.pointAddress || formatAddress(point)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {unit.dimensions ? <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-gray-700">{unit.dimensions}</span> : null}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${!selected ? 'border-gray-200 bg-gray-50 text-gray-600' : availability.status === 'available' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : availability.status === 'occupied' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  {!selected ? 'Selecione para configurar' : availability.status === 'checking' ? 'Verificando disponibilidade…' : availability.status === 'available' ? 'Disponível' : availability.status === 'occupied' ? 'Ocupada' : 'Disponibilidade pendente'}
                </span>
              </div>
              <div className="mt-3 text-base font-medium text-indigo-600">{formatPrice(pointPriceMonth)}/mês</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={() => onSelectedChange()}
            />
            {selected ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
      </button>

      {selected ? (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {availabilityError ? <div className="text-xs text-red-600">{availabilityError}</div> : null}
          {reservationRangesError ? <div className="text-xs text-red-600">{reservationRangesError}</div> : null}
          {ownersError ? <div className="text-xs text-red-600">{ownersError}</div> : null}

          {availability.status === 'occupied' && availability.nextAvailableAt ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 space-y-1">
              <div>Esta face está ocupada no período analisado.</div>
              <label className="flex items-center gap-2">
                <Checkbox checked={true} disabled />
                <span>Definir automaticamente a data de início para {formatShortDate(new Date(availability.nextAvailableAt))}.</span>
              </label>
              <div className="text-xs">Esta opção é obrigatória enquanto a face estiver ocupada no período analisado.</div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-600">Empresa vinculada *</label>
              <Select value={mediaPointOwnerId} onValueChange={setMediaPointOwnerId} disabled={ownersLoading || !owners.length}>
                <SelectTrigger>
                  <SelectValue placeholder={ownersLoading ? 'Carregando...' : owners.length ? 'Selecione a empresa vinculada' : 'Nenhuma empresa vinculada'} />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => {
                    const label = owner.ownerCompany?.name || owner.ownerName;
                    const sub = owner.ownerCompany?.document || owner.ownerDocument;
                    return (
                      <SelectItem key={owner.id} value={owner.id}>
                        {label}{sub ? ` • ${sub}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">A empresa selecionada será usada como referência do item (e no PDF na próxima etapa).</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-600">Descrição *</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-600">Tempo de ocupação *</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={occupationMode === '15' ? 'default' : 'outline'} onClick={() => { setOccupationMode('15'); setOccupationDays(15); }}>
                  15 dias
                </Button>
                <Button type="button" size="sm" variant={occupationMode === '30' ? 'default' : 'outline'} onClick={() => { setOccupationMode('30'); setOccupationDays(30); }}>
                  30 dias
                </Button>
                <Button type="button" size="sm" variant={occupationMode === 'custom' ? 'default' : 'outline'} onClick={() => setOccupationMode('custom')}>
                  Personalizado
                </Button>
              </div>
              {occupationMode === 'custom' ? (
                <div className="mt-2 rounded-lg border p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">Data inicial</label>
                      <Input
                        type="date"
                        value={customStartDate ? normalizeLocalDay(customStartDate).toISOString().slice(0, 10) : ''}
                        min={normalizeLocalDay(referenceStartDate ?? new Date()).toISOString().slice(0, 10)}
                        onChange={(e) => {
                          if (!e.target.value) {
                            setCustomStartDate(null);
                            return;
                          }
                          const nextDate = parseLocalDate(e.target.value);
                          setCustomStartDate(nextDate);
                          setCalendarMonth(nextDate);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">Duração (dias)</label>
                      <Input
                        type="number"
                        min="1"
                        max={String(OCCUPATION_MAX_DAYS)}
                        value={occupationDays}
                        onChange={(e) => setOccupationDays(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      />
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={customStartDate ?? undefined}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    onSelect={(date: Date | undefined) => {
                      if (!date) return;
                      const nextDate = normalizeLocalDay(date);
                      const minDate = normalizeLocalDay(referenceStartDate ?? new Date());
                      if (nextDate.getTime() < minDate.getTime()) return;
                      if (isDayOccupied(nextDate, reservationRanges)) {
                        const nextFreeDate = findNextAvailableStartOnOrAfter(nextDate, reservationRanges);
                        setCustomStartDate(nextFreeDate);
                        setCalendarMonth(nextFreeDate);
                        return;
                      }
                      setCustomStartDate(nextDate);
                    }}
                    disabled={(date: Date) => {
                      const nextDate = normalizeLocalDay(date);
                      const minDate = normalizeLocalDay(referenceStartDate ?? new Date());
                      return nextDate.getTime() < minDate.getTime() || isDayOccupied(nextDate, reservationRanges);
                    }}
                    className="rounded-md border w-full"
                  />
                  {reservationRangesLoading ? <div className="text-xs text-gray-500">Carregando calendário de ocupação…</div> : null}
                  {customSelectionError ? <div className="text-xs text-red-600">{customSelectionError}</div> : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Gift className="h-4 w-4" />
                Adicionar como brinde
              </div>
              <Checkbox checked={isGift} onCheckedChange={(value: boolean | 'indeterminate') => setIsGift(value === true)} />
            </div>

            <div className="flex items-start gap-2 md:col-span-2">
              <Checkbox checked={clientProvidesBanner} onCheckedChange={(value: boolean | 'indeterminate') => setClientProvidesBanner(value === true)} />
              <div>
                <div className="text-sm text-gray-700">Cliente irá fornecer a lona</div>
                <div className="text-xs text-gray-500">Se marcado, não contabiliza custo de produção.</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-600">Preço mensal</label>
              <Input value={formatPrice(pointPriceMonth)} readOnly disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Preço bi-semana</label>
              <Input value={formatPrice(pointPriceBiweekly)} readOnly disabled />
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 md:col-span-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Aluguel por unidade</span><span>{formatPrice(rentPerUnit)}</span></div>
              <div className="flex justify-between"><span>Custos (produção/instalação)</span><span>{formatPrice(upfrontPerUnit)}</span></div>
              <div className="flex justify-between font-medium border-t pt-1"><span>Total por unidade</span><span>{formatPrice(computedPerUnitTotal)}</span></div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-600">Quantidade *</label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Preço por unidade (calculado)</label>
              <Input value={formatPrice(unitPrice)} readOnly disabled />
            </div>

            <div className="grid gap-4 md:grid-cols-3 md:col-span-2">
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
                <Input type="number" min="0" step="0.01" value={totalDiscountPercent || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setTotalDiscountPercent(v); setDiscountPercent(v); if (v > 0) { setTotalDiscountAmount(0); setDiscountAmount(0); } }} disabled={isGift || !!totalDiscountAmount} placeholder="%" />
                <Input type="number" min="0" step="0.01" value={totalDiscountAmount || 0} onChange={(e) => { const v = Math.max(0, parseFloat(e.target.value) || 0); setTotalDiscountAmount(v); setDiscountAmount(v); if (v > 0) { setTotalDiscountPercent(0); setDiscountPercent(0); } }} disabled={isGift || !!totalDiscountPercent} placeholder="R$" />
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 md:col-span-2">
              <div className="flex justify-between items-center">
                <span className="text-indigo-900">Total do Item:</span>
                <span className="text-indigo-900 font-medium">{formatPrice(discountCalc.totalPrice)}</span>
              </div>
              <p className="text-sm text-indigo-700 mt-1">{isGift ? 'Item marcado como brinde.' : `${quantity} x ${formatPrice(unitPrice)}`}</p>
              {discountCalc.computedDiscountValue > 0 ? (
                <div className="mt-2 text-xs text-indigo-800">
                  <div className="flex justify-between"><span>Original:</span><span>{formatPrice(discountCalc.rawBaseTotal)}</span></div>
                  <div className="flex justify-between"><span>Desconto total aplicado:</span><span>-{formatPrice(discountCalc.computedDiscountValue)}</span></div>
                </div>
              ) : null}
            </div>

            {!isValid ? <div className="text-xs text-red-600 md:col-span-2">Complete os dados obrigatórios e selecione uma unidade disponível para adicionar este item.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MediaSelectionDrawer({
  open,
  onOpenChange,
  onAddItems,
  initialMediaPointId,
  allowedMediaPointIds,
  referenceStartDate,
  onReferenceStartDateChange,
  existingMediaUnitIds = [],
}: MediaSelectionDrawerProps) {
  const { company } = useCompany();
  const allowedKey = useMemo(() => (allowedMediaPointIds ?? []).join('|'), [allowedMediaPointIds]);
  const allowedSet = useMemo(() => new Set((allowedMediaPointIds ?? []).filter(Boolean)), [allowedKey]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [mediaPoints, setMediaPoints] = useState<MediaPoint[]>([]);
  const [mediaUnits, setMediaUnits] = useState<MediaUnitWithPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftSnapshot>>({});
  const prefillDoneRef = useRef(false);

  const handleClose = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedIds([]);
    setDrafts({});
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      prefillDoneRef.current = false;
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedIds([]);
        setDrafts({});

        const all: MediaPoint[] = [];
        let page = 1;
        const pageSize = 50;

        while (true) {
          const pointsRes = await apiClient.get<any>('/media-points', { params: { page, pageSize } });
          const payload = pointsRes.data;
          const batch: MediaPoint[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
          const total: number | undefined = Array.isArray(payload) ? undefined : payload?.total;

          all.push(...batch);
          if (Array.isArray(payload)) break;
          if (!batch.length) break;
          if (typeof total === 'number' && all.length >= total) break;
          page += 1;
        }

        if (cancelled) return;

        const filteredPoints = allowedSet.size ? all.filter((point: any) => allowedSet.has(point.id)) : all;
        setMediaPoints(filteredPoints);

        const existingSet = new Set((existingMediaUnitIds ?? []).map(String));
        const flattened: MediaUnitWithPoint[] = filteredPoints.flatMap((point: any) => {
          const rawUnits = Array.isArray(point?.units) ? point.units : Array.isArray(point?.mediaUnits) ? point.mediaUnits : [];
          return rawUnits
            .filter((unit: any) => !existingSet.has(String(unit.id)))
            .map((unit: any) => ({
              ...unit,
              pointId: point.id,
              pointName: point.name,
              pointType: point.type,
              pointAddress: formatAddress(point),
              dimensions: formatDimensions(unit),
              mediaPointId: point.id,
              pointProductionCosts: point.productionCosts ?? null,
            }));
        });

        setMediaUnits(flattened);
      } catch {
        if (cancelled) return;
        setError('Erro ao carregar mídias do inventário.');
        setMediaPoints([]);
        setMediaUnits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, allowedKey, existingMediaUnitIds.join('|')]);

  const mediaPointById = useMemo(() => {
    const map = new Map<string, MediaPoint>();
    mediaPoints.forEach((point: any) => map.set(point.id, point));
    return map;
  }, [mediaPoints]);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mediaUnits.filter((unit) => {
      const point = unit.mediaPointId ? mediaPointById.get(unit.mediaPointId) : undefined;
      if (!point) return false;
      if (typeFilter !== 'all' && point.type !== typeFilter) return false;
      if (!q) return true;
      return [unit.label, unit.pointName, unit.pointAddress, unit.dimensions, point.name, formatAddress(point)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [mediaUnits, mediaPointById, typeFilter, searchQuery]);

  const filteredPointsCount = useMemo(() => {
    return new Set(filteredUnits.map((unit) => unit.mediaPointId).filter(Boolean)).size;
  }, [filteredUnits]);

  const mediaTypes = useMemo(() => {
    const types = new Set(mediaPoints.map((point: any) => point.type));
    return Array.from(types) as MediaType[];
  }, [mediaPoints]);

  useEffect(() => {
    if (!open || prefillDoneRef.current) return;
    if (!initialMediaPointId) return;
    const firstUnit = filteredUnits.find((unit) => unit.mediaPointId === initialMediaPointId);
    if (!firstUnit) return;
    prefillDoneRef.current = true;
    setSelectedIds([firstUnit.id]);
  }, [open, initialMediaPointId, filteredUnits]);

  const toggleSelect = (unitId: string) => {
    setSelectedIds((prev) => prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]);
  };

  const updateDraft = (unitId: string, draft: DraftSnapshot | null) => {
    setDrafts((prev) => {
      if (!draft) {
        const next = { ...prev };
        delete next[unitId];
        return next;
      }
      return { ...prev, [unitId]: draft };
    });
  };

  const canConfirm = selectedIds.length > 0 && selectedIds.every((id) => drafts[id]?.isValid);

  const handleConfirm = () => {
    const now = new Date();
    const items: ProposalItem[] = selectedIds
      .map((unitId) => {
        const unit = mediaUnits.find((item) => item.id === unitId);
        const draft = drafts[unitId];
        if (!unit || !draft || !draft.isValid) return null;
        return {
          id: `item${Date.now()}${Math.random()}`,
          companyId: company?.id || (unit as any).companyId || '',
          proposalId: '',
          mediaUnitId: unit.id,
          productId: undefined,
          mediaPointOwnerId: draft.mediaPointOwnerId || null,
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
          occupationDays: draft.occupationDays,
          clientProvidesBanner: draft.clientProvidesBanner,
          priceMonthSnapshot: draft.priceMonthSnapshot,
          priceBiweeklySnapshot: draft.priceBiweeklySnapshot,
          productionCostSnapshot: draft.productionCostSnapshot,
          installationCostSnapshot: draft.installationCostSnapshot,
          rentTotalSnapshot: draft.rentTotalSnapshot,
          upfrontTotalSnapshot: draft.upfrontTotalSnapshot,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          discountPercent: draft.discountPercent,
          discountAmount: draft.discountAmount,
          discountApplyTo: ProposalItemDiscountApplyTo.TOTAL,
          rentDiscountPercent: draft.rentDiscountPercent,
          rentDiscountAmount: draft.rentDiscountAmount,
          costDiscountPercent: draft.costDiscountPercent,
          costDiscountAmount: draft.costDiscountAmount,
          totalDiscountPercent: draft.totalDiscountPercent,
          totalDiscountAmount: draft.totalDiscountAmount,
          isGift: draft.isGift,
          nextAvailableAt: draft.nextAvailableAt ?? null,
          totalPrice: draft.totalPrice,
          createdAt: now,
          updatedAt: now,
        } as ProposalItem;
      })
      .filter(Boolean) as ProposalItem[];

    if (!items.length) return;

    const dates = items.map((item) => item.startDate).filter(Boolean) as Date[];
    if (dates.length) {
      const earliest = new Date(Math.min(...dates.map((date) => new Date(date).getTime())));
      onReferenceStartDateChange?.(earliest);
    }

    onAddItems(items);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) return handleClose();
        onOpenChange(true);
      }}
    >
      <DialogContent
        className="overflow-hidden p-0 gap-0 flex flex-col"
        style={{
          width: 'min(1120px, calc(100vw - 2rem))',
          maxWidth: 'min(1120px, calc(100vw - 2rem))',
          height: 'min(82vh, 820px)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle>Selecionar Mídia do Inventário</DialogTitle>
        </DialogHeader>

        {loading ? <div className="p-6 text-gray-600">Carregando mídias...</div> : null}
        {!loading && error ? <div className="p-6 text-red-600">{error}</div> : null}

        {!loading && !error ? (
          <>
            <div className="px-6 py-4 border-b bg-gray-50/60 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')}>
                    Todos
                  </Button>
                  {mediaTypes.map((type) => (
                    <Button key={type} type="button" variant={typeFilter === type ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(type)}>
                      {type}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" placeholder="Buscar mídia, ponto ou endereço" />
                </div>
              </div>

              <div className="text-sm text-gray-500">
                {filteredPointsCount} ponto(s) • {filteredUnits.length} mídia(s) disponível(is) para adicionar
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredUnits.length ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredUnits.map((unit) => {
                    const point = unit.mediaPointId ? mediaPointById.get(unit.mediaPointId) : undefined;
                    if (!point) return null;
                    return (
                      <MediaUnitCard
                        key={unit.id}
                        unit={unit}
                        point={point}
                        selected={selectedIds.includes(unit.id)}
                        initialSnapshot={drafts[unit.id]}
                        referenceStartDate={referenceStartDate}
                        onSelectedChange={() => toggleSelect(unit.id)}
                        onDraftChange={(draft) => updateDraft(unit.id, draft)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-full min-h-[320px] rounded-xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center">
                  <div className="text-center px-6">
                    <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-gray-600">Nenhuma mídia encontrada com os filtros aplicados.</p>
                    <p className="mt-1 text-sm text-gray-400">Ajuste a busca ou o tipo para encontrar outros pontos e faces.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">{selectedIds.length} item(ns) selecionado(s)</div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleConfirm} disabled={!canConfirm}>Adicionar selecionados</Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
