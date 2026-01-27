import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MapPin, Search } from 'lucide-react';
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
   * Data de início de referência da campanha (passo 1). Usada para checar ocupação (reservas) do período.
   * Se não for informada, usamos a data atual apenas para não permitir seleção sem verificação.
   */
  referenceStartDate?: Date | null;
}

type AvailabilityStatus = 'checking' | 'available' | 'occupied' | 'unknown';

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
  referenceStartDate,
}: MediaSelectionDrawerProps) {
  const { company } = useCompany();
  // companyId é usado apenas para preencher o item local. A API usa o companyId do token.

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [mediaPoints, setMediaPoints] = useState<MediaPoint[]>([]);
  const [mediaUnits, setMediaUnits] = useState<MediaUnitWithPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleção
  const [selectedMediaPointId, setSelectedMediaPointId] = useState<string | null>(null);
  const [selectedMediaUnit, setSelectedMediaUnit] = useState<MediaUnitWithPoint | null>(null);

  const [mediaPointOwners, setMediaPointOwners] = useState<MediaPointOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [selectedMediaPointOwnerId, setSelectedMediaPointOwnerId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplyTo, setDiscountApplyTo] = useState<ProposalItemDiscountApplyTo>(ProposalItemDiscountApplyTo.TOTAL);

  // Novo fluxo: tempo de ocupacao (multiplo de 15, max 360)
  const OCCUPATION_MAX_DAYS = 360;
  const [occupationMode, setOccupationMode] = useState<'15' | '30' | 'custom'>('30');
  const [occupationDays, setOccupationDays] = useState<number>(30);
  const [clientProvidesBanner, setClientProvidesBanner] = useState<boolean>(false);

  // Disponibilidade (ocupação por reservas existentes)
  const [availabilityByUnitId, setAvailabilityByUnitId] = useState<Record<string, AvailabilityStatus>>({});
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

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
    const prod = safeNumber(selectedMediaUnit?.productionCosts?.lona ?? 0);
    const inst = safeNumber(selectedMediaUnit?.productionCosts?.montagem ?? 0);

    const { months, biweeks } = getOccupationBreakdown(occupationDays);
    const rentPerUnit = months * priceMonth + biweeks * priceBiweekly;
    const upfrontPerUnit = inst + (clientProvidesBanner ? 0 : prod);
    const perUnitTotal = rentPerUnit + upfrontPerUnit;

    return {
      priceMonth,
      priceBiweekly,
      months,
      biweeks,
      rentPerUnit,
      prod,
      inst,
      upfrontPerUnit,
      perUnitTotal,
    };
  }, [selectedMediaUnit, occupationDays, clientProvidesBanner]);

  const discountCalc = useMemo(() => {
    const qty = Math.max(1, Number(quantity) || 1);

    const rentTotal = qty * computedPricing.rentPerUnit;
    const upfrontTotal = qty * computedPricing.upfrontPerUnit;
    const baseTotal = rentTotal + upfrontTotal;

    const pct = safeNumber(discountPercent);
    const amt = safeNumber(discountAmount);

    const discountBase =
      discountApplyTo === ProposalItemDiscountApplyTo.RENT
        ? rentTotal
        : discountApplyTo === ProposalItemDiscountApplyTo.COSTS
          ? upfrontTotal
          : baseTotal;

    const discountValue =
      pct > 0
        ? (discountBase * pct) / 100
        : amt > 0
          ? Math.min(amt, discountBase)
          : 0;

    const totalPrice = Math.max(0, baseTotal - discountValue);
    const computedDiscountValue = Math.max(0, discountValue);

    return { qty, rentTotal, upfrontTotal, baseTotal, discountBase, discountValue, totalPrice, computedDiscountValue };
  }, [quantity, computedPricing.rentPerUnit, computedPricing.upfrontPerUnit, discountPercent, discountAmount, discountApplyTo]);

  const { baseTotal, totalPrice, computedDiscountValue } = discountCalc;

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

        setMediaPoints(all);

        // 2) Flatten das unidades.
        // Backend costuma retornar `units`, mas alguns endpoints antigos podem retornar `mediaUnits`.
        const flattened: MediaUnitWithPoint[] = all.flatMap((p: any) => {
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
      setOccupationMode('30');
      setOccupationDays(30);
      setClientProvidesBanner(false);
      load();
    }
  }, [open]);

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
      const next: Record<string, AvailabilityStatus> = { ...prev };
      for (const u of units) next[u.id] = 'checking';
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

      const next: Record<string, AvailabilityStatus> = {};
      let hadError = false;

      results.forEach((r, idx) => {
        const unitId = units[idx]?.id;
        if (!unitId) return;
        if (r.status === 'fulfilled') {
          const available = Boolean((r.value as any)?.data?.available);
          next[unitId] = available ? 'available' : 'occupied';
        } else {
          next[unitId] = 'unknown';
          hadError = true;
        }
      });

      setAvailabilityByUnitId(next);
      if (hadError) {
        setAvailabilityError('Não foi possível verificar a disponibilidade de uma ou mais faces.');
      }
    })().catch(() => {
      if (cancelled) return;
      const next: Record<string, AvailabilityStatus> = {};
      for (const u of units) next[u.id] = 'unknown';
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
      const nextUnit = selectedPointUnits.find((u) => availabilityByUnitId[u.id] === 'available');
      if (nextUnit) handleSelectMediaUnit(nextUnit);
      else setSelectedMediaUnit(null);
    };

    if (!selectedMediaUnit) {
      pickFirstAvailable();
      return;
    }

    const st = availabilityByUnitId[selectedMediaUnit.id];
    if (st === 'occupied' || st === 'unknown') {
      pickFirstAvailable();
    }
  }, [open, selectedMediaPointId, selectedPointUnits, availabilityByUnitId, selectedMediaUnit]);

  const handleSelectMediaUnit = (media: MediaUnitWithPoint) => {
    setSelectedMediaUnit(media);
    setDescription(`${media.pointName || 'Ponto'} - ${media.label}`);
    setDiscountPercent(0);
    setDiscountAmount(0);
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
      if (owners.length === 1) {
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
    setQuantity(1);
    setOccupationMode('30');
    setOccupationDays(30);
    setClientProvidesBanner(false);
  };

  const handleConfirm = () => {
    if (!selectedMediaUnit) return;

    const days = occupationDays;
    const rentTotalSnapshot = quantity * computedPricing.rentPerUnit;
    const upfrontTotalSnapshot = quantity * computedPricing.upfrontPerUnit;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company?.id || (selectedMediaUnit as any).companyId || '',
      proposalId: '',
      mediaUnitId: selectedMediaUnit.id,
      productId: undefined,
      mediaPointOwnerId: selectedMediaUnit.id ? (selectedMediaPointOwnerId || null) : null,
      description,
      occupationDays: days,
      clientProvidesBanner,
      priceMonthSnapshot: computedPricing.priceMonth,
      priceBiweeklySnapshot: computedPricing.priceBiweekly,
      productionCostSnapshot: computedPricing.prod,
      installationCostSnapshot: computedPricing.inst,
      rentTotalSnapshot,
      upfrontTotalSnapshot,
      quantity,
      unitPrice,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      discountApplyTo,
      totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
    setOccupationMode('30');
    setOccupationDays(30);
    setClientProvidesBanner(false);
    onOpenChange(false);
  };

  const hasOwners = mediaPointOwners.length > 0;
  const isOccupationValid = occupationDays >= 15 && occupationDays % 15 === 0 && occupationDays <= OCCUPATION_MAX_DAYS;
  const selectedAvailability = selectedMediaUnit ? availabilityByUnitId[selectedMediaUnit.id] : undefined;
  const isSelectedUnitAvailable = selectedAvailability === 'available';
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

  const discountBaseLabel =
    discountApplyTo === ProposalItemDiscountApplyTo.RENT
      ? 'o aluguel'
      : discountApplyTo === ProposalItemDiscountApplyTo.COSTS
        ? 'os custos (produção/instalação)'
        : 'o total do item';

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
                                  const st = availabilityByUnitId[u.id];
                                  const disabled = st !== 'available';
                                  const suffix =
                                    st === 'occupied'
                                      ? ' (Ocupado)'
                                      : st === 'unknown'
                                        ? ' (Indisponível)'
                                        : st === 'checking'
                                          ? ' (Verificando...)'
                                          : '';

                                  return (
                                    <SelectItem key={u.id} value={u.id} disabled={disabled}>
                                      {u.label}
                                      {suffix}
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
                            {selectedAvailability === 'checking' && <div className="text-gray-500 mt-1">Verificando ocupação...</div>}
                            {selectedAvailability === 'occupied' && (
                              <div className="text-red-600 mt-1">Esta face está ocupada no período selecionado.</div>
                            )}
                            {selectedAvailability === 'unknown' && (
                              <div className="text-red-600 mt-1">Não foi possível verificar a ocupação desta face.</div>
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
                                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">Este ponto não possui empresa vinculada. Vincule uma empresa ao ponto no Inventário para poder adicioná-lo à proposta.</div>
                                )
                              )}
                              <p className="text-xs text-gray-500 mt-1">A empresa selecionada será usada como referência do item (e no PDF na próxima etapa).</p>
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
                                      // começa com 15 para evitar estado inválido
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
                                      <span className="text-sm text-gray-700">Total: <b>{occupationDays}</b> dias</span>
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
                                  <label className="text-sm text-gray-600 mb-1 block">Preço quinzenal</label>
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
                                <Input
                                  value={formatPrice(unitPrice)}
                                  readOnly
                                  disabled
                                />
                              </div>
                            </div>

                            

                            <div>
                              <label className="text-sm text-gray-600 mb-1 block">Aplicar desconto em</label>
                              <Select value={discountApplyTo} onValueChange={(v: string) => setDiscountApplyTo(v as ProposalItemDiscountApplyTo)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={ProposalItemDiscountApplyTo.TOTAL}>Total (aluguel + custos)</SelectItem>
                                  <SelectItem value={ProposalItemDiscountApplyTo.RENT}>Aluguel</SelectItem>
                                  <SelectItem value={ProposalItemDiscountApplyTo.COSTS}>Custos (produção/instalação)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-1">
                                Define sobre qual parte do item o desconto será aplicado.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Desconto em %</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={discountPercent || 0}
                                  onChange={(e) => {
                                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                                    setDiscountPercent(v);
                                    if (v > 0) setDiscountAmount(0);
                                  }}
                                  disabled={!!discountAmount}
                                />
                              </div>

                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Desconto em R$</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={discountAmount || 0}
                                  onChange={(e) => {
                                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                                    setDiscountAmount(v);
                                    if (v > 0) setDiscountPercent(0);
                                  }}
                                  disabled={!!discountPercent}
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              💡 Preencha apenas um campo. O desconto será aplicado sobre {discountBaseLabel}.
                            </p>
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                              <div className="flex justify-between items-center">
                                <span className="text-indigo-900">Total do Item:</span>
                                <span className="text-indigo-900 font-medium">{formatPrice(totalPrice)}</span>
                              </div>
                              <p className="text-sm text-indigo-700 mt-1">
                                {quantity} x {formatPrice(unitPrice)}
                              </p>
                              {computedDiscountValue > 0 && (
                                <div className="mt-2 text-xs text-indigo-800">
                                  <div className="flex justify-between">
                                    <span>Original:</span>
                                    <span>{formatPrice(baseTotal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Desconto{discountPercent > 0 ? ` (${discountPercent}%)` : ''} ({discountBaseLabel}):</span>
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
