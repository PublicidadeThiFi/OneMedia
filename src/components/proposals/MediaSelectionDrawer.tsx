import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MapPin, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../lib/apiClient';
import { MediaPoint, MediaType, MediaUnit, ProposalItem } from '../../types';
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
  dimensions?: string; // ✅ adiciona
};


export function MediaSelectionDrawer({
  open,
  onOpenChange,
  defaultPeriod,
  onAddItem,
}: MediaSelectionDrawerProps) {
  const { company } = useCompany();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [mediaPoints, setMediaPoints] = useState<MediaPoint[]>([]);
  const [mediaUnits, setMediaUnits] = useState<MediaUnitWithPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seleção
  const [selectedMediaUnit, setSelectedMediaUnit] = useState<MediaUnitWithPoint | null>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultPeriod.endDate);

  const totalPrice = quantity * unitPrice;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatAddress = (p: MediaPoint) => {
    const parts = [
      p.addressStreet,
      p.addressNumber,
      p.addressDistrict,
      p.addressCity,
      p.addressState,
    ].filter(Boolean);
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

        // 1) Carrega pontos
        const pointsRes = await apiClient.get<any>('/media-points', { params: { pageSize: 1000 } });
        const points: MediaPoint[] = Array.isArray(pointsRes.data)
          ? pointsRes.data
          : (pointsRes.data?.data ?? []);

        setMediaPoints(points);

        // 2) Carrega unidades por ponto (endpoint existente)
        const unitsByPoint = await Promise.all(
          points.map(async (p) => {
            const res = await apiClient.get<MediaUnit[]>(`/media-points/${p.id}/units`);
            const units = res.data || [];
            return units.map((u) => ({
              ...u,
              pointName: p.name,
              pointType: p.type,
              pointAddress: formatAddress(p),
              dimensions: formatDimensions(u), // ✅ aqui
            })) as MediaUnitWithPoint[];

          })
        );

        setMediaUnits(unitsByPoint.flat());
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

  const filteredMediaUnits = useMemo(() => {
    let filtered = mediaUnits;

    if (typeFilter !== 'all') {
      filtered = filtered.filter((media) => media.pointType === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((media) => {
        const name = (media.label || '').toLowerCase();
        const pointName = (media.pointName || '').toLowerCase();
        const pointAddress = (media.pointAddress || '').toLowerCase();
        return name.includes(query) || pointName.includes(query) || pointAddress.includes(query);
      });
    }

    return filtered;
  }, [mediaUnits, typeFilter, searchQuery]);

  const handleSelectMediaUnit = (media: MediaUnitWithPoint) => {
    setSelectedMediaUnit(media);
    setDescription(`${media.pointName || 'Ponto'} - ${media.label}`);
    setUnitPrice(media.priceMonth || 0);
    setQuantity(1);
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
  };

  const handleConfirm = () => {
    if (!selectedMediaUnit) return;

    const item: ProposalItem = {
      id: `item${Date.now()}${Math.random()}`,
      companyId: company?.id || selectedMediaUnit.companyId || '',
      proposalId: '',
      mediaUnitId: selectedMediaUnit.id,
      productId: undefined,
      description,
      startDate,
      endDate,
      quantity,
      unitPrice,
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
    setSelectedMediaUnit(null);
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    setStartDate(defaultPeriod.startDate);
    setEndDate(defaultPeriod.endDate);
    onOpenChange(false);
  };

  const isValid = !!selectedMediaUnit && !!description && quantity > 0 && unitPrice >= 0;

  const mediaTypes = useMemo(() => {
    const types = new Set(mediaPoints.map((p) => p.type));
    return Array.from(types) as MediaType[];
  }, [mediaPoints]);

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="h-[90vh] max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>Selecionar Mídia do Inventário</DrawerTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        {loading && <div className="p-6 text-gray-600">Carregando mídias...</div>}
        {!loading && error && <div className="p-6 text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="flex h-full">
            {/* Lista */}
            <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
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
                  {filteredMediaUnits.length} {filteredMediaUnits.length === 1 ? 'mídia' : 'mídias'} disponível(is)
                </p>
              </div>

              <div className="space-y-3">
                {filteredMediaUnits.map((media) => (
                  <div
                    key={media.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedMediaUnit?.id === media.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => handleSelectMediaUnit(media)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-gray-900 mb-1">{media.label}</h3>
                        <p className="text-sm text-gray-600 mb-2">{media.pointName}</p>

                        {media.pointAddress && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{media.pointAddress}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-indigo-600 font-medium">
                            {formatPrice(media.priceMonth || 0)}/mês
                          </span>
                          {media.dimensions && (
                            <span className="text-gray-500">{media.dimensions}</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}

                {filteredMediaUnits.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma mídia encontrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes/Confirmação */}
            <div className="w-1/2 p-6 overflow-y-auto">
              {selectedMediaUnit ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-gray-900 mb-2">Detalhes da Mídia</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-gray-900 mb-1">{selectedMediaUnit.label}</h3>
                      <p className="text-gray-600 mb-2">{selectedMediaUnit.pointName}</p>
                      {selectedMediaUnit.pointAddress && (
                        <p className="text-sm text-gray-500">{selectedMediaUnit.pointAddress}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
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
                        <label className="text-sm text-gray-600 mb-1 block">Data Início</label>
                        <Input
                          type="date"
                          value={startDate ? startDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Data Fim</label>
                        <Input
                          type="date"
                          value={endDate ? endDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-900">Total do Item:</span>
                        <span className="text-indigo-900 font-medium">
                          {formatPrice(totalPrice)}
                        </span>
                      </div>
                      <p className="text-sm text-indigo-700 mt-1">
                        {quantity} x {formatPrice(unitPrice)}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={handleClose}>
                        Cancelar
                      </Button>
                      <Button className="flex-1" onClick={handleConfirm} disabled={!isValid}>
                        Adicionar Item
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Selecione uma mídia para adicionar à proposta</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
