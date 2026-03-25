import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, MapPin, Search, Gift } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../lib/apiClient';
import { MediaPoint, MediaPointOwner, MediaType, MediaUnit, ProductionCosts, ProposalItem, ProposalItemDiscountApplyTo } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';

interface MediaSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: ProposalItem) => void;
  /**
   * Se informado, o drawer já abre com este ponto selecionado.
   * Usado quando o usuário veio do Mídia Map.
   */
  initialMediaPointId?: string;
  /**
   * Se informado, restringe a lista de pontos disponíveis (ex: seleção por área do Mídia Map).
   */
  allowedMediaPointIds?: string[];
  /**
   * Data de início de referência da campanha (passo 1). Usada para checar ocupação (reservas) do período.
   * Se não for informada, usamos a data atual apenas para não permitir seleção sem verificação.
   */
  referenceStartDate?: Date | null;
  onReferenceStartDateChange?: (date: Date) => void;
}

type AvailabilityStatus = 'checking' | 'available' | 'occupied' | 'unknown';
type AvailabilityInfo = { status: AvailabilityStatus; nextAvailableAt?: string | null; conflictCount?: number };

type MediaUnitWithPoint = MediaUnit & {
  pointId?: string;
  pointName?: string;
  pointType?: MediaType;
  pointAddress?: string;
  dimensions?: string;
  productionCosts?: ProductionCosts | null;
};

export function MediaSelectionDrawer({
  open,
  onOpenChange,
  onAddItem,
  initialMediaPointId,
  allowedMediaPointIds,
  referenceStartDate,
  onReferenceStartDateChange,
}: MediaSelectionDrawerProps) {
  const { company } = useCompany();
  // companyId é usado apenas para preencher o item local. A API usa o companyId do token.

  const allowedKey = useMemo(() => (allowedMediaPointIds ?? []).join('|'), [allowedMediaPointIds]);
  const allowedSet = useMemo(() => new Set((allowedMediaPointIds ?? []).filter(Boolean)), [allowedKey]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [mediaPoints, setMediaPoints] = useState<MediaPoint[]>([]);
  const [mediaUnits, setMediaUnits] = useState<MediaUnitWithPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleção
  const [selectedMediaPointId, setSelectedMediaPointId] = useState<string | null>(null);
  const [selectedMediaUnit, setSelectedMediaUnit] = useState<MediaUnitWithPoint | null>(null);

  // Preseleção quando vindo do Mídia Map
  const prefillDoneRef = useRef(false);

  const [mediaPointOwners, setMediaPointOwners] = useState<MediaPointOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [selectedMediaPointOwnerId, setSelectedMediaPointOwnerId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [rentDiscountPercent, setRentDiscountPercent] = useState(0);
  const [rentDiscountAmount, setRentDiscountAmount] = useState(0);
  const [costDiscountPercent, setCostDiscountPercent] = useState(0);
  const [costDiscountAmount, setCostDiscountAmount] = useState(0);
  const [totalDiscountPercent, setTotalDiscountPercent] = useState(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [isGift, setIsGift] = useState(false);

  // Novo fluxo: tempo de ocupacao (multiplo de 15, max 360)
  const OCCUPATION_MAX_DAYS = 360;
  const [occupationMode, setOccupationMode] = useState<'15' | '30' | 'custom'>('30');
  const [occupationDays, setOccupationDays] = useState<number>(30);
  const [clientProvidesBanner, setClientProvidesBanner] = useState<boolean>(false);

  // Disponibilidade (ocupação por reservas existentes)
  const [availabilityByUnitId, setAvailabilityByUnitId] = useState<Record<string, AvailabilityInfo>>({});
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [useNextAvailableDate, setUseNextAvailableDate] = useState(false);

  const normalizeLocalDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + Math.max(0, Math.floor(days)));
    return x;
  };

  const availabilityWindow = useMemo(() => {
    // Se não vier a data de início, usamos hoje — e bloqueamos seleção até checar
    const start = normalizeLocalDay(referenceStartDate ?? new Date());
    const end = addDays(start, occupationDays);
    return { start, end };
  }, [referenceStartDate, occupationDays]);

  const getOccupationBreakdown = (days: number) => {
    const d = Math.max(0, Math.floor(days));
    const months = Math.floor(d / 30);
    const rem = d % 30;
    const biweeks = rem === 15 ? 1 : 0;
    return { months, biweeks };
  };

  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const mediaPointById = useMemo(() => {
    const m = new Map<string, MediaPoint>();
    for (const p of mediaPoints) {
      m.set((p as any).id, p);
    }
    return m;
  }, [mediaPoints]);

  const computedPricing = useMemo(() => {
    const point = selectedMediaUnit ? mediaPointById.get((selectedMediaUnit as any).mediaPointId) : undefined;
    const priceMonth = safeNumber(selectedMediaUnit?.priceMonth ?? point?.basePriceMonth ?? 0);
    const priceBiweekly = safeNumber((selectedMediaUnit as any)?.priceWeek ?? point?.basePriceWeek ?? 0);
    const bannerCost = safeNumber(selectedMediaUnit?.productionCosts?.lona ?? 0);
    const adhesiveCost = safeNumber((selectedMediaUnit?.productionCosts as any)?.adesivo ?? 0);
    const vinylCost = safeNumber((selectedMediaUnit?.productionCosts as any)?.vinil ?? 0);
    const installationCost = safeNumber(selectedMediaUnit?.productionCosts?.montagem ?? 0);

    const { months, biweeks } = getOccupationBreakdown(occupationDays);
    const rentPerUnit = months * priceMonth + biweeks * priceBiweekly;
    const upfrontPerUnit = installationCost + adhesiveCost + vinylCost + (clientProvidesBanner ? 0 : bannerCost);
    const perUnitTotal = rentPerUnit + upfrontPerUnit;

    return {
      priceMonth,
      priceBiweekly,
      months,
      biweeks,
      bannerCost,
      adhesiveCost,
      vinylCost,
      installationCost,
      rentPerUnit,
      upfrontPerUnit,
      perUnitTotal,
    };
  }, [selectedMediaUnit, occupationDays, clientProvidesBanner]);

  const discountCalc = useMemo(() => {
    const qty = Math.max(1, Number(quantity) || 1);

    const rawRentTotal = qty * computedPricing.rentPerUnit;
    const rawCostsTotal = qty * computedPricing.upfrontPerUnit;
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

    let rentAfter = applyReduction(rawRentTotal, rentDiscountPercent, rentDiscountAmount);
    let costsAfter = applyReduction(rawCostsTotal, costDiscountPercent, costDiscountAmount);

    const subtotalBeforeGeneral = rentAfter + costsAfter;
    let totalAfter = applyReduction(subtotalBeforeGeneral, totalDiscountPercent || discountPercent, totalDiscountAmount || discountAmount);
    if (isGift) totalAfter = 0;

    const factor = subtotalBeforeGeneral > 0 ? totalAfter / subtotalBeforeGeneral : 0;
    const finalRent = isGift ? 0 : rentAfter * factor;
    const finalCosts = isGift ? 0 : costsAfter * factor;
    const totalPrice = Math.max(0, finalRent + finalCosts);
    const computedDiscountValue = Math.max(0, rawBaseTotal - totalPrice);

    return {
      qty,
      rawRentTotal,
      rawCostsTotal,
      rawBaseTotal,
      finalRent,
      finalCosts,
      totalPrice,
      computedDiscountValue,
    };
  }, [quantity, computedPricing.rentPerUnit, computedPricing.upfrontPerUnit, rentDiscountPercent, rentDiscountAmount, costDiscountPercent, costDiscountAmount, totalDiscountPercent, totalDiscountAmount, discountPercent, discountAmount, isGift]);

  const { rawBaseTotal: baseTotal, totalPrice, computedDiscountValue } = discountCalc;

  useEffect(() => {
    if (!selectedMediaUnit) {
      setUnitPrice(0);
      return;
    }
    setUnitPrice(computedPricing.perUnitTotal);
  }, [selectedMediaUnit, computedPricing.perUnitTotal]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatAddress = (p: MediaPoint) => {
    const parts = [p.addressStreet, p.addressNumber, p.addressDistrict, p.addressCity, p.addressState].filter(Boolean);
    return parts.join(', ');
  };

  const formatDimensions = (u: MediaUnit) => {
    // OOH: metros
    if (u.widthM && u.heightM) {
      const w = Number(u.widthM);
      const h = Number(u.heightM);
      return `${w}m x ${h}m`;
    }

    // DOOH: resolução
    if (u.resolutionWidthPx && u.resolutionHeightPx) {
      return `${u.resolutionWidthPx}x${u.resolutionHeightPx}px`;
    }

    return undefined;
  };

  const formatShortDate = (d: Date) => {
    const iso = new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
    const [y, m, day] = iso.split('-');
    return `${day}/${m}/${y}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Reset de seleção a cada abertura
        setSelectedMediaPointId(null);
        setSelectedMediaUnit(null);
        setMediaPointOwners([]);
        setOwnersError(null);
        setSelectedMediaPointOwnerId('');

        // 1) Carrega TODOS os pontos (paginado)
        const all: MediaPoint[] = [];
        let page = 1;
        const pageSize = 50;

        while (true) {
          // companyId vem do token (JwtAuthGuard). NÃO envie companyId via query.
          const pointsRes = await apiClient.get<any>('/media-points', {
            params: { page, pageSize },
          });

          const payload = pointsRes.data;
          const batch: MediaPoint[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
          const total: number | undefined = Array.isArray(payload) ? undefined : payload?.total;

          all.push(...batch);

          // Se não houver paginação no backend (array), para na primeira.
          if (Array.isArray(payload)) break;

          if (!batch.length) break;
          if (typeof total === 'number' && all.length >= total) break;

          page += 1;
        }

        const filteredAll = allowedSet.size ? all.filter((p: any) => allowedSet.has((p as any).id)) : all;
        setMediaPoints(filteredAll);

        // 2) Flatten das unidades.
        // Backend costuma retornar `units`, mas alguns endpoints antigos podem retornar `mediaUnits`.
        const flattened: MediaUnitWithPoint[] = filteredAll.flatMap((p: any) => {
          const rawUnits = Array.isArray(p?.units)
            ? p.units
            : Array.isArray(p?.mediaUnits)
              ? p.mediaUnits
              : [];

          return rawUnits.map((u: any) => ({
            ...u,
            pointId: p.id,
            pointName: p.name,
            pointType: p.type,
            pointAddress: formatAddress(p),
            dimensions: formatDimensions(u),
            mediaPointId: p.id,
            productionCosts: (p as any).productionCosts ?? null,
          }));
        });

        setMediaUnits(flattened);
      } catch (e) {
        setError('Erro ao carregar mídias do inventário.');
        setMediaPoints([]);
        setMediaUnits([]);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      prefillDoneRef.current = false;
      // reset selecao
      setSelectedMediaPointId(null);
      setSelectedMediaUnit(null);
      setAvailabilityByUnitId({});
      setAvailabilityError(null);
      setSelectedMediaPointOwnerId('');
      setDescription('');
      setQuantity(1);
      setDiscountPercent(0);
      setDiscountAmount(0);
      setRentDiscountPercent(0);
      setRentDiscountAmount(0);
      setCostDiscountPercent(0);
      setCostDiscountAmount(0);
      setTotalDiscountPercent(0);
      setTotalDiscountAmount(0);
      setUseNextAvailableDate(false);
      setIsGift(false);
      setOccupationMode('30');
      setOccupationDays(30);
      setClientProvidesBanner(false);
      load();
    } else {
      prefillDoneRef.current = false;
    }
  }, [open, allowedKey]);

  const unitsByPointId = useMemo(() => {
    const map = new Map<string, MediaUnitWithPoint[]>();

    for (const u of mediaUnits) {
      const pointId = (u as any).mediaPointId as string | undefined;
      if (!pointId) continue;
      const curr = map.get(pointId) ?? [];
      curr.push(u);
      map.set(pointId, curr);
    }

    return map;
  }, [mediaUnits]);

  const filteredMediaPoints = useMemo(() => {
    let filtered = mediaPoints;

    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => (p as any).type === typeFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => {
        const name = String((p as any).name ?? '').toLowerCase();
        const addr = formatAddress(p).toLowerCase();
        const units = unitsByPointId.get((p as any).id) ?? [];
        const unitMatch = units.some((u) => String((u as any).label ?? '').toLowerCase().includes(q));
        return name.includes(q) || addr.includes(q) || unitMatch;
      });
    }

    return filtered;
  }, [mediaPoints, typeFilter, searchQuery, unitsByPointId]);

  const filteredUnitsCount = useMemo(() => {
    return filteredMediaPoints.reduce((sum, p: any) => sum + (unitsByPointId.get(p.id)?.length ?? 0), 0);
  }, [filteredMediaPoints, unitsByPointId]);

  const selectedPoint = useMemo(() => {
    if (!selectedMediaPointId) return null;
    return mediaPoints.find((p: any) => p.id === selectedMediaPointId) ?? null;
  }, [mediaPoints, selectedMediaPointId]);

  const selectedPointUnits = useMemo(() => {
    if (!selectedMediaPointId) return [];
    return unitsByPointId.get(selectedMediaPointId) ?? [];
  }, [unitsByPointId, selectedMediaPointId]);

  // Checa ocupação das faces (unidades) do ponto selecionado no período considerado.
  useEffect(() => {
    if (!open) return;
    if (!selectedMediaPointId) {
      setAvailabilityByUnitId({});
      setAvailabilityError(null);
      return;
    }

    const units = selectedPointUnits;
    if (!units.length) {
      setAvailabilityByUnitId({});
      setAvailabilityError(null);
      return;
    }

    let cancelled = false;
    const startDate = availabilityWindow.start.toISOString();
    const endDate = availabilityWindow.end.toISOString();

    // Marca todas como "verificando" antes do request.
    setAvailabilityByUnitId((prev) => {
      const next: Record<string, AvailabilityInfo> = { ...prev };
      for (const u of units) next[u.id] = { status: 'checking', nextAvailableAt: null, conflictCount: 0 };
      return next;
    });
    setAvailabilityError(null);

    (async () => {
      const results = await Promise.allSettled(
        units.map((u) =>
          apiClient.get<any>('/reservations/availability', {
            params: {
              mediaUnitId: u.id,
              startDate,
              endDate,
            },
          })
        )
      );

      if (cancelled) return;

      const next: Record<string, AvailabilityInfo> = {};
      let hadError = false;

      results.forEach((r, idx) => {
        const unitId = units[idx]?.id;
        if (!unitId) return;
        if (r.status === 'fulfilled') {
          const payload = (r.value as any)?.data ?? {};
          const available = Boolean(payload?.available);
          const conflicts = Array.isArray(payload?.conflicts) ? payload.conflicts : [];
          const nextAvailableAt = !available && conflicts.length
            ? conflicts
                .map((c: any) => c?.endDate ? new Date(c.endDate) : null)
                .filter((d: any) => d && !Number.isNaN(d.getTime()))
                .sort((a: any, b: any) => b.getTime() - a.getTime())[0]
            : null;
          next[unitId] = {
            status: available ? 'available' : 'occupied',
            nextAvailableAt: nextAvailableAt ? new Date(nextAvailableAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
            conflictCount: conflicts.length,
          };
        } else {
          next[unitId] = { status: 'unknown', nextAvailableAt: null, conflictCount: 0 };
          hadError = true;
        }
      });

      setAvailabilityByUnitId(next);
      if (hadError) {
        setAvailabilityError('Não foi possível verificar a disponibilidade de uma ou mais faces.');
      }
    })().catch(() => {
      if (cancelled) return;
      const next: Record<string, AvailabilityInfo> = {};
      for (const u of units) next[u.id] = { status: 'unknown', nextAvailableAt: null, conflictCount: 0 };
      setAvailabilityByUnitId(next);
      setAvailabilityError('Não foi possível verificar a disponibilidade das faces.');
    });

    return () => {
      cancelled = true;
    };
  }, [open, selectedMediaPointId, selectedPointUnits, availabilityWindow.start, availabilityWindow.end]);

  // Se a unidade selecionada ficar ocupada/indisponível, troca automaticamente para a primeira disponível.
  useEffect(() => {
    if (!open) return;
    if (!selectedMediaPointId) return;
    if (!selectedPointUnits.length) return;

    // ainda não verificou nada
    if (!Object.keys(availabilityByUnitId).length) return;

    const pickFirstAvailable = () => {
      const nextUnit = selectedPointUnits.find((u) => availabilityByUnitId[u.id]?.status === 'available');
      if (nextUnit) handleSelectMediaUnit(nextUnit);
      else setSelectedMediaUnit(null);
    };

    if (!selectedMediaUnit) {
      pickFirstAvailable();
      return;
    }

    const st = availabilityByUnitId[selectedMediaUnit.id]?.status;
    if (st === 'occupied' || st === 'unknown') {
      pickFirstAvailable();
    }
  }, [open, selectedMediaPointId, selectedPointUnits, availabilityByUnitId, selectedMediaUnit]);

  const handleSelectMediaUnit = (media: MediaUnitWithPoint) => {
    setSelectedMediaUnit(media);
    setDescription(`${media.pointName || 'Ponto'} - ${media.label}`);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setRentDiscountPercent(0);
    setRentDiscountAmount(0);
    setCostDiscountPercent(0);
    setCostDiscountAmount(0);
    setTotalDiscountPercent(0);
    setTotalDiscountAmount(0);
    setUseNextAvailableDate(false);
    setIsGift(false);
    setQuantity(1);
    setOccupationMode('30');
    setOccupationDays(30);
    setClientProvidesBanner(false);
  };

  const loadOwnersForPoint = async (mediaPointId: string) => {
    try {
      setOwnersLoading(true);
      setOwnersError(null);
      setMediaPointOwners([]);
      setSelectedMediaPointOwnerId('');

      const res = await apiClient.get<any>(`/media-points/${mediaPointId}/owners`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const owners: MediaPointOwner[] = Array.isArray(data) ? data : [];

      setMediaPointOwners(owners);

      // Preferir OwnerCompany primário quando existir
      const primary = owners.find((o: any) => o?.ownerCompany?.isPrimary);
      if (primary) {
        setSelectedMediaPointOwnerId(primary.id);
      } else if (owners.length === 1) {
        setSelectedMediaPointOwnerId(owners[0].id);
      }
    } catch (e) {
      setOwnersError('Erro ao carregar empresas vinculadas ao ponto.');
      setMediaPointOwners([]);
      setSelectedMediaPointOwnerId('');
    } finally {
      setOwnersLoading(false);
    }
  };

  const handleSelectPoint = (point: MediaPoint) => {
    setSelectedMediaPointId((point as any).id);

    void loadOwnersForPoint((point as any).id);

    const units = unitsByPointId.get((point as any).id) ?? [];
    if (units.length > 0) {
      handleSelectMediaUnit(units[0]);
      return;
    }

    // Ponto sem unidades: mostra detalhes, mas não permite confirmar.
    setSelectedMediaUnit(null);
    setDescription(`${(point as any).name || 'Ponto'}`);
    setUnitPrice(0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setRentDiscountPercent(0);
    setRentDiscountAmount(0);
    setCostDiscountPercent(0);
    setCostDiscountAmount(0);
    setTotalDiscountPercent(0);
    setTotalDiscountAmount(0);
    setUseNextAvailableDate(false);
    setIsGift(false);
    setQuantity(1);
    setOccupationMode('30');
    setOccupationDays(30);
    setClientProvidesBanner(false);
  };

  // Se veio do Mídia Map, seleciona automaticamente o ponto (ou o 1º da lista restrita).
  useEffect(() => {
    if (!open) return;
    // aguarda carregar
    if (!mediaPoints.length) return;

    if (prefillDoneRef.current) return;

    let targetId: string | undefined = initialMediaPointId;
    if (targetId && allowedSet.size && !allowedSet.has(targetId)) {
      targetId = undefined;
    }
    if (!targetId && (allowedMediaPointIds ?? []).length) {
      targetId = (allowedMediaPointIds ?? [])[0];
    }
    if (!targetId) return;

    prefillDoneRef.current = true;
    if (selectedMediaPointId === targetId) return;

    const p = mediaPoints.find((x: any) => x.id === targetId);
    if (!p) return;

    handleSelectPoint(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMediaPointId, allowedKey, mediaPoints.length, selectedMediaPointId]);

  const handleConfirm = () => {
    if (!selectedMediaUnit) return;

    const days = occupationDays;
    const effectiveStartDate = useNextAvailableDate && selectedNextAvailableAt ? new Date(selectedNextAvailableAt) : (referenceStartDate ? new Date(referenceStartDate) : undefined);
    const rentTotalSnapshot = discountCalc.finalRent;
    const upfrontTotalSnapshot = discountCalc.finalCosts;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company?.id || (selectedMediaUnit as any).companyId || '',
      proposalId: '',
      mediaUnitId: selectedMediaUnit.id,
      productId: undefined,
      mediaPointOwnerId: selectedMediaUnit.id ? (selectedMediaPointOwnerId || null) : null,
      description: isGift ? `${description} (Brinde)` : description,
      startDate: effectiveStartDate,
      endDate: effectiveStartDate ? new Date(effectiveStartDate.getTime() + days * 24 * 60 * 60 * 1000) : undefined,
      occupationDays: days,
      clientProvidesBanner,
      priceMonthSnapshot: computedPricing.priceMonth,
      priceBiweeklySnapshot: computedPricing.priceBiweekly,
      productionCostSnapshot: computedPricing.bannerCost,
      installationCostSnapshot: computedPricing.adhesiveCost + computedPricing.vinylCost + computedPricing.installationCost,
      rentTotalSnapshot,
      upfrontTotalSnapshot,
      quantity,
      unitPrice,
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
      nextAvailableAt: selectedAvailability?.nextAvailableAt ?? null,
      totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (useNextAvailableDate && selectedNextAvailableAt) {
      onReferenceStartDateChange?.(new Date(selectedNextAvailableAt));
    }

    onAddItem(item);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedMediaPointId(null);
    setSelectedMediaUnit(null);
    setAvailabilityByUnitId({});
    setAvailabilityError(null);
    setMediaPointOwners([]);
    setOwnersError(null);
    setSelectedMediaPointOwnerId('');
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setRentDiscountPercent(0);
    setRentDiscountAmount(0);
    setCostDiscountPercent(0);
    setCostDiscountAmount(0);
    setTotalDiscountPercent(0);
    setTotalDiscountAmount(0);
    setUseNextAvailableDate(false);
    setIsGift(false);
    setOccupationMode('30');
    setOccupationDays(30);
    setClientProvidesBanner(false);
    onOpenChange(false);
  };

  const hasOwners = mediaPointOwners.length > 0;
  const isOccupationValid = occupationDays >= 15 && occupationDays % 15 === 0 && occupationDays <= OCCUPATION_MAX_DAYS;
  const selectedAvailability = selectedMediaUnit ? availabilityByUnitId[selectedMediaUnit.id] : undefined;
  const selectedAvailabilityStatus = selectedAvailability?.status;
  const selectedNextAvailableAt = selectedAvailability?.nextAvailableAt ? new Date(selectedAvailability.nextAvailableAt) : null;
  const isSelectedUnitAvailable = selectedAvailabilityStatus === 'available' || (!!useNextAvailableDate && !!selectedNextAvailableAt);
  const isValid =
    !!selectedMediaUnit &&
    !!description &&
    quantity > 0 &&
    unitPrice >= 0 &&
    isOccupationValid &&
    isSelectedUnitAvailable &&
    hasOwners &&
    !!selectedMediaPointOwnerId &&
    !ownersLoading &&
    !ownersError;

  const mediaTypes = useMemo(() => {
    const types = new Set(mediaPoints.map((p: any) => p.type));
    return Array.from(types) as MediaType[];
  }, [mediaPoints]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        // ShadCN/Radix dispara onOpenChange tanto para abrir quanto para fechar.
        // Se fechou, resetamos; se abriu, delegamos para o estado do pai.
        if (!nextOpen) return handleClose();
        onOpenChange(true);
      }}
    >
      <DialogContent
        style={{ width: '96vw', maxWidth: 'min(1400px, 96vw)', height: '90vh', maxHeight: '90vh' }}
        className="flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Selecionar Mídia do Inventário</DialogTitle>
        </DialogHeader>

        {loading && <div className="p-6 text-gray-600">Carregando mídias...</div>}
        {!loading && error && <div className="p-6 text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Lista de Pontos */}
            <div className="md:w-1/2 md:h-full h-[40%] md:border-r border-b md:border-b-0 border-gray-200 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar mídia, ponto ou endereço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {mediaTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-gray-600">
                  {filteredMediaPoints.length} {filteredMediaPoints.length === 1 ? 'ponto' : 'pontos'} • {filteredUnitsCount}{' '}
                  {filteredUnitsCount === 1 ? 'mídia' : 'mídias'} disponível(is)
                </p>
              </div>

              <div className="space-y-3">
                {filteredMediaPoints.map((point: any) => {
                  const units = unitsByPointId.get(point.id) ?? [];
                  const basePointPrice = Number(point?.basePriceMonth ?? 0);
                  const minUnitPrice = units.reduce((min, u) => {
                    const p = Number((u as any).priceMonth ?? 0);
                    if (!Number.isFinite(p) || p <= 0) return min;
                    return min === null || p < min ? p : min;
                  }, null as number | null);
                  const minPrice =
                    minUnitPrice !== null
                      ? minUnitPrice
                      : Number.isFinite(basePointPrice) && basePointPrice > 0
                        ? basePointPrice
                        : null;
                  const dims = units.length === 1 ? (units[0] as any).dimensions : undefined;

                  return (
                    <div
                      key={point.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedMediaPointId === point.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectPoint(point)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-gray-900 mb-1">{point.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {point.type}{units.length ? ` • ${units.length} ${units.length === 1 ? 'unidade' : 'unidades'}` : ' • sem unidades'}
                          </p>

                          {formatAddress(point) && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{formatAddress(point)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-indigo-600 font-medium">
                              {minPrice !== null ? formatPrice(minPrice) + (units.length ? '/mês' : '') : '--'}
                            </span>
                            {dims && <span className="text-gray-500">{dims}</span>}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}

                {filteredMediaPoints.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhum ponto encontrado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes/Confirmação */}
            <div className="md:w-1/2 md:h-full h-[60%] flex-1 overflow-hidden p-4 md:p-6">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto pr-1">
                  {selectedPoint ? (
                    selectedPointUnits.length ? (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-gray-900 mb-2">Detalhes da Mídia</h2>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-gray-900 mb-1">{selectedPoint.name}</h3>
                            <p className="text-gray-600 mb-2">{selectedPoint.type}</p>
                            {formatAddress(selectedPoint) && (
                              <p className="text-sm text-gray-500">{formatAddress(selectedPoint)}</p>
                            )}
                          </div>
                        </div>

                        {selectedPointUnits.length > 1 && (
                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Unidade</label>
                            <Select
                              value={selectedMediaUnit?.id ?? ''}
                              onValueChange={(unitId: string) => {
                                const u = selectedPointUnits.find((x) => x.id === unitId);
                                if (u) handleSelectMediaUnit(u);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedPointUnits.map((u) => {
                                  const info = availabilityByUnitId[u.id];
                                  const st = info?.status;
                                  const nextDate = info?.nextAvailableAt ? new Date(info.nextAvailableAt) : null;

                                  return (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.label}{st === 'occupied' ? ' (Ocupada)' : st === 'unknown' ? ' (Indisponível)' : st === 'checking' ? ' (Verificando...)' : ''}{nextDate ? ` • livre em ${formatShortDate(nextDate)}` : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            <div className="mt-1 text-xs text-gray-500">
                              Período considerado: {formatShortDate(availabilityWindow.start)} – {formatShortDate(availabilityWindow.end)}
                            </div>
                            {!referenceStartDate && (
                              <div className="mt-1 text-xs text-amber-700">
                                Defina a <b>Data de Início</b> no passo 1 para checar com precisão.
                              </div>
                            )}
                            {availabilityError && <div className="mt-1 text-xs text-red-600">{availabilityError}</div>}
                          </div>
                        )}

                        {selectedMediaUnit && (
                          <div className="text-xs">
                            {selectedPointUnits.length <= 1 && (
                              <div className="text-gray-500">
                                Período considerado: {formatShortDate(availabilityWindow.start)} – {formatShortDate(availabilityWindow.end)}
                              </div>
                            )}
                            {selectedAvailabilityStatus === 'checking' && <div className="text-gray-500 mt-1">Verificando ocupação...</div>}
                            {selectedAvailabilityStatus === 'occupied' && (
                              <div className="space-y-2">
                                <div className="text-amber-700 mt-1">Esta face está ocupada no período selecionado.</div>
                                {selectedNextAvailableAt ? (
                                  <div className="flex items-start gap-2">
                                    <Checkbox id="use-next-available-date" checked={useNextAvailableDate} onCheckedChange={(v: boolean | 'indeterminate') => setUseNextAvailableDate(v === true)} />
                                    <label htmlFor="use-next-available-date" className="text-gray-700">
                                      Definir automaticamente a data de início para {formatShortDate(selectedNextAvailableAt)}.
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                            )}
                            {selectedAvailabilityStatus === 'unknown' && (
                              <div className="text-red-600 mt-1">Não foi possível verificar a ocupação desta face.</div>
                            )}
                            {selectedAvailabilityStatus === 'available' && (
                              <div className="text-emerald-700 mt-1">Face disponível para o período selecionado.</div>
                            )}
                          </div>
                        )}

                        {selectedMediaUnit && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-gray-600 mb-1 block">Empresa vinculada *</label>
                              {ownersLoading && <div className="text-sm text-gray-500">Carregando empresas...</div>}
                              {!ownersLoading && ownersError && <div className="text-sm text-red-600">{ownersError}</div>}
                              {!ownersLoading && !ownersError && (
                                mediaPointOwners.length ? (
                                  <Select value={selectedMediaPointOwnerId} onValueChange={setSelectedMediaPointOwnerId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={mediaPointOwners.length > 1 ? 'Selecione a empresa' : 'Empresa'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mediaPointOwners.map((o) => {
                                        const name = (o.ownerCompany?.name || o.ownerName || 'Empresa').trim();
                                        const doc = (o.ownerCompany?.document || o.ownerDocument || '').trim();
                                        const label = doc ? `${name} • ${doc}` : name;
                                        return (
                                          <SelectItem key={o.id} value={o.id}>
                                            {label}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                                    Este ponto não possui empresa vinculada. Vincule uma empresa ao ponto no Inventário para poder adicioná-lo à proposta.
                                  </div>
                                )
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                A empresa selecionada será usada como referência do item (e no PDF na próxima etapa).
                              </p>
                            </div>

                            <div>
                              <label className="text-sm text-gray-600 mb-1 block">Descrição *</label>
                              <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descrição do item"
                              />
                            </div>

                            {/* Tempo de ocupação (novo fluxo) */}
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Tempo de ocupação *</label>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={occupationMode === '15' ? 'default' : 'outline'}
                                    onClick={() => {
                                      setOccupationMode('15');
                                      setOccupationDays(15);
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
                                    }}
                                  >
                                    Personalizado
                                  </Button>
                                </div>

                                <div className="mt-2">
                                  {occupationMode === 'custom' ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setOccupationDays((d) => Math.min(OCCUPATION_MAX_DAYS, Math.max(0, d) + 15))
                                        }
                                      >
                                        +15 dias
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setOccupationDays((d) => Math.min(OCCUPATION_MAX_DAYS, Math.max(0, d) + 30))
                                        }
                                      >
                                        +30 dias
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setOccupationDays(0)}
                                      >
                                        Limpar
                                      </Button>
                                      <span className="text-sm text-gray-700">
                                        Total: <b>{occupationDays}</b> dias
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500">Total: {occupationDays} dias</p>
                                  )}

                                  {!isOccupationValid && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Selecione um tempo válido (múltiplo de 15, máximo {OCCUPATION_MAX_DAYS} dias).
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <Checkbox
                                  id="clientProvidesBanner"
                                  checked={clientProvidesBanner}
                                  onCheckedChange={(v: boolean | 'indeterminate') => setClientProvidesBanner(v === true)}
                                />
                                <div>
                                  <label htmlFor="clientProvidesBanner" className="text-sm text-gray-700">
                                    Cliente irá fornecer a lona
                                  </label>
                                  <p className="text-xs text-gray-500">
                                    Se marcado, não contabiliza custo de produção (somente instalação/montagem).
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm text-gray-600 mb-1 block">Preço mensal</label>
                                  <Input value={formatPrice(computedPricing.priceMonth)} readOnly disabled />
                                </div>
                                <div>
                                  <label className="text-sm text-gray-600 mb-1 block">Preço bi-semana</label>
                                  <Input value={formatPrice(computedPricing.priceBiweekly)} readOnly disabled />
                                </div>
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg border">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Aluguel por unidade</span>
                                  <span className="text-gray-900">{formatPrice(computedPricing.rentPerUnit)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Custos (produção/instalação)</span>
                                  <span className="text-gray-900">{formatPrice(computedPricing.upfrontPerUnit)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                                  <span className="text-gray-900">Total por unidade</span>
                                  <span className="text-gray-900">{formatPrice(computedPricing.perUnitTotal)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Quantidade *</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={quantity}
                                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                              </div>

                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Preço por unidade (calculado)</label>
                                <Input value={formatPrice(unitPrice)} readOnly disabled />
                              </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <div className="flex items-center gap-2 text-sm text-amber-800">
                                <Gift className="h-4 w-4" />
                                Adicionar como brinde
                              </div>
                              <Checkbox
                                checked={isGift}
                                onCheckedChange={(v: boolean | 'indeterminate') => setIsGift(v === true)}
                              />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                              <div className="rounded-lg border p-3 space-y-3">
                                <div className="font-medium text-gray-900">Desconto no aluguel</div>
                                <div className="grid gap-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={rentDiscountPercent || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setRentDiscountPercent(v);
                                      if (v > 0) setRentDiscountAmount(0);
                                    }}
                                    disabled={isGift || !!rentDiscountAmount}
                                    placeholder="%"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={rentDiscountAmount || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setRentDiscountAmount(v);
                                      if (v > 0) setRentDiscountPercent(0);
                                    }}
                                    disabled={isGift || !!rentDiscountPercent}
                                    placeholder="R$"
                                  />
                                </div>
                              </div>

                              <div className="rounded-lg border p-3 space-y-3">
                                <div className="font-medium text-gray-900">Desconto nos custos</div>
                                <div className="grid gap-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={costDiscountPercent || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setCostDiscountPercent(v);
                                      if (v > 0) setCostDiscountAmount(0);
                                    }}
                                    disabled={isGift || !!costDiscountAmount}
                                    placeholder="%"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={costDiscountAmount || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setCostDiscountAmount(v);
                                      if (v > 0) setCostDiscountPercent(0);
                                    }}
                                    disabled={isGift || !!costDiscountPercent}
                                    placeholder="R$"
                                  />
                                </div>
                              </div>

                              <div className="rounded-lg border p-3 space-y-3">
                                <div className="font-medium text-gray-900">Desconto geral adicional</div>
                                <div className="grid gap-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={totalDiscountPercent || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setTotalDiscountPercent(v);
                                      setDiscountPercent(v);
                                      if (v > 0) {
                                        setTotalDiscountAmount(0);
                                        setDiscountAmount(0);
                                      }
                                    }}
                                    disabled={isGift || !!totalDiscountAmount}
                                    placeholder="%"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={totalDiscountAmount || 0}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                                      setTotalDiscountAmount(v);
                                      setDiscountAmount(v);
                                      if (v > 0) {
                                        setTotalDiscountPercent(0);
                                        setDiscountPercent(0);
                                      }
                                    }}
                                    disabled={isGift || !!totalDiscountPercent}
                                    placeholder="R$"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                              <div className="flex justify-between items-center">
                                <span className="text-indigo-900">Total do Item:</span>
                                <span className="text-indigo-900 font-medium">{formatPrice(totalPrice)}</span>
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
                                    <span>Desconto total aplicado:</span>
                                    <span>-{formatPrice(computedDiscountValue)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Este ponto ainda não possui unidades/mídias cadastradas.</p>
                          <p className="text-sm text-gray-400 mt-2">Cadastre unidades no módulo de Inventário.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Selecione um ponto para adicionar à proposta</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer fixo (sempre visível) */}
                <div className="pt-4 mt-4 border-t flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm} disabled={!isValid}>
                    Adicionar Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}