import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MapPin, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../lib/apiClient';
import { MediaPoint, MediaPointOwner, MediaType, MediaUnit, ProposalItem } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';

interface MediaSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod: {
    startDate?: Date;
    endDate?: Date;
  };
  onAddItem: (item: ProposalItem) => void;
}

type MediaUnitWithPoint = MediaUnit & {
  pointName?: string;
  pointType?: MediaType;
  pointAddress?: string;
  dimensions?: string;
};

export function MediaSelectionDrawer({
  open,
  onOpenChange,
  defaultPeriod,
  onAddItem,
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
  const [startDate, setStartDate] = useState<Date | undefined>(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultPeriod.endDate);

  const baseTotal = quantity * unitPrice;
  let discountedTotal = baseTotal;
  if (discountPercent > 0) discountedTotal = discountedTotal * (1 - discountPercent / 100);
  if (discountAmount > 0) discountedTotal = discountedTotal - discountAmount;
  const totalPrice = Math.max(0, discountedTotal);
  const computedDiscountValue = Math.max(0, baseTotal - totalPrice);

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
            pointName: p.name,
            pointType: p.type,
            pointAddress: formatAddress(p),
            dimensions: formatDimensions(u),
            mediaPointId: p.id,
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
      setStartDate(defaultPeriod.startDate);
      setEndDate(defaultPeriod.endDate);
      load();
    }
  }, [open, defaultPeriod.startDate, defaultPeriod.endDate]);

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

  const handleSelectMediaUnit = (media: MediaUnitWithPoint) => {
    setSelectedMediaUnit(media);
    setDescription(`${media.pointName || 'Ponto'} - ${media.label}`);
    setUnitPrice((media as any).priceMonth || 0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setQuantity(1);
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
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
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
  };

  const handleConfirm = () => {
    if (!selectedMediaUnit) return;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company?.id || (selectedMediaUnit as any).companyId || '',
      proposalId: '',
      mediaUnitId: selectedMediaUnit.id,
      productId: undefined,
      mediaPointOwnerId: selectedMediaUnit.id ? (selectedMediaPointOwnerId || null) : null,
      description,
      startDate,
      endDate,
      quantity,
      unitPrice,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
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
    setMediaPointOwners([]);
    setOwnersError(null);
    setSelectedMediaPointOwnerId('');
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
    onOpenChange(false);
  };

  const hasOwners = mediaPointOwners.length > 0;
  const isValid = !!selectedMediaUnit && !!description && quantity > 0 && unitPrice >= 0 && hasOwners && !!selectedMediaPointOwnerId && !ownersLoading && !ownersError;

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
                  const minPrice = units.reduce((min, u) => {
                    const p = Number((u as any).priceMonth ?? 0);
                    if (!Number.isFinite(p)) return min;
                    return min === null || p < min ? p : min;
                  }, null as number | null);
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
                              {formatPrice(minPrice ?? 0)}{units.length ? '/mês' : ''}
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
                                {selectedPointUnits.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                                <label className="text-sm text-gray-600 mb-1 block">Preço/mês (R$) *</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={unitPrice}
                                  onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                              </div>
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
                              💡 Preencha apenas um campo. O desconto será aplicado sobre o total do item.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Data Início</label>
                                <Input
                                  type="date"
                                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                                  onChange={(e) =>
                                    setStartDate(
                                      e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label className="text-sm text-gray-600 mb-1 block">Data Fim</label>
                                <Input
                                  type="date"
                                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                                  onChange={(e) =>
                                    setEndDate(
                                      e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined
                                    )
                                  }
                                />
                              </div>
                            </div>

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
                                    <span>Desconto{discountPercent > 0 ? ` (${discountPercent}%)` : ''}:</span>
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
