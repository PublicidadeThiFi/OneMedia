import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ProposalItem, MediaType } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { getAllMediaPointsForCompany, getAllMediaUnitsForCompany } from '../../lib/mockData';
import { Search, MapPin } from 'lucide-react';

interface MediaSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriod: {
    startDate?: Date;
    endDate?: Date;
  };
  onAddItems: (items: ProposalItem[]) => void;
}

interface MediaUnitSelection {
  unitId: string;
  unitLabel: string;
  pointName: string;
  pointType: MediaType;
  basePrice: number;
  quantity: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export function MediaSelectionDrawer({
  open,
  onOpenChange,
  defaultPeriod,
  onAddItems,
}: MediaSelectionDrawerProps) {
  const { company } = useCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUnits, setSelectedUnits] = useState<Map<string, MediaUnitSelection>>(
    new Map()
  );

  // Carregar unidades de mídia
  const mediaUnits = useMemo(() => {
    if (!company) return [];
    const units = getAllMediaUnitsForCompany(company.id);
    const points = getAllMediaPointsForCompany(company.id);

    return units.map(unit => {
      const point = points.find(p => p.id === unit.mediaPointId);
      return {
        ...unit,
        pointName: point?.name || 'Ponto desconhecido',
        pointType: point?.type || MediaType.OOH,
        pointCity: point?.addressCity,
        pointDistrict: point?.addressDistrict,
      };
    });
  }, [company]);

  // Filtrar unidades
  const filteredUnits = useMemo(() => {
    return mediaUnits.filter(unit => {
      const matchesSearch =
        !searchQuery ||
        unit.pointName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.pointCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.pointDistrict?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === 'all' || unit.pointType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [mediaUnits, searchQuery, typeFilter]);

  // Toggle seleção de unidade
  const handleToggleUnit = (unitId: string, checked: boolean) => {
    const newSelected = new Map(selectedUnits);
    
    if (checked) {
      const unit = filteredUnits.find(u => u.id === unitId);
      if (unit) {
        newSelected.set(unitId, {
          unitId: unit.id,
          unitLabel: unit.label,
          pointName: unit.pointName,
          pointType: unit.pointType,
          basePrice: unit.priceMonth || 0,
          quantity: 1,
          startDate: defaultPeriod.startDate,
          endDate: defaultPeriod.endDate,
        });
      }
    } else {
      newSelected.delete(unitId);
    }
    
    setSelectedUnits(newSelected);
  };

  // Atualizar período de uma unidade
  const handleUpdateUnitPeriod = (
    unitId: string,
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    const newSelected = new Map(selectedUnits);
    const selection = newSelected.get(unitId);
    if (selection) {
      selection[field] = value ? new Date(value) : undefined;
      newSelected.set(unitId, selection);
      setSelectedUnits(newSelected);
    }
  };

  // Atualizar quantidade de uma unidade
  const handleUpdateUnitQuantity = (unitId: string, quantity: number) => {
    const newSelected = new Map(selectedUnits);
    const selection = newSelected.get(unitId);
    if (selection) {
      selection.quantity = Math.max(1, quantity);
      newSelected.set(unitId, selection);
      setSelectedUnits(newSelected);
    }
  };

  // Confirmar seleção
  const handleConfirm = () => {
    const items: ProposalItem[] = Array.from(selectedUnits.values()).map(selection => ({
      id: `item${Date.now()}${Math.random()}`,
      companyId: company!.id,
      proposalId: '', // será preenchido ao salvar a proposta
      mediaUnitId: selection.unitId,
      productId: undefined,
      description: `${selection.pointName} - ${selection.unitLabel}`,
      startDate: selection.startDate,
      endDate: selection.endDate,
      quantity: selection.quantity,
      unitPrice: selection.basePrice,
      totalPrice: selection.basePrice * selection.quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    onAddItems(items);
    setSelectedUnits(new Map());
    setSearchQuery('');
    setTypeFilter('all');
  };

  const handleClose = () => {
    setSelectedUnits(new Map());
    setSearchQuery('');
    setTypeFilter('all');
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Selecionar Pontos/Faces/Telas</SheetTitle>
          <SheetDescription>
            Escolha as unidades de mídia do seu inventário para adicionar à proposta
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de mídia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value={MediaType.OOH}>OOH</SelectItem>
                <SelectItem value={MediaType.DOOH}>DOOH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de unidades */}
          <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
            {filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma unidade de mídia encontrada
              </div>
            ) : (
              filteredUnits.map(unit => {
                const isSelected = selectedUnits.has(unit.id);
                const selection = selectedUnits.get(unit.id);

                return (
                  <div
                    key={unit.id}
                    className={`border rounded-lg p-4 ${
                      isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: boolean | 'indeterminate') =>
                          handleToggleUnit(unit.id, checked === true)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900">
                                {unit.pointName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{unit.label}</p>
                            {unit.pointCity && (
                              <p className="text-xs text-gray-500 mt-1">
                                {unit.pointCity}
                                {unit.pointDistrict && ` - ${unit.pointDistrict}`}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs ${
                                unit.pointType === MediaType.DOOH
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {unit.pointType}
                            </span>
                            <p className="text-sm text-gray-900 mt-2">
                              {formatCurrency(unit.priceMonth || 0)}/mês
                            </p>
                          </div>
                        </div>

                        {/* Campos de período e quantidade (só aparecem se selecionado) */}
                        {isSelected && selection && (
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                            <div>
                              <Label htmlFor={`start-${unit.id}`} className="text-xs">
                                Início
                              </Label>
                              <Input
                                id={`start-${unit.id}`}
                                type="date"
                                value={
                                  selection.startDate
                                    ? selection.startDate.toISOString().split('T')[0]
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdateUnitPeriod(unit.id, 'startDate', e.target.value)
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${unit.id}`} className="text-xs">
                                Término
                              </Label>
                              <Input
                                id={`end-${unit.id}`}
                                type="date"
                                value={
                                  selection.endDate
                                    ? selection.endDate.toISOString().split('T')[0]
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdateUnitPeriod(unit.id, 'endDate', e.target.value)
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`qty-${unit.id}`} className="text-xs">
                                Qtd (meses)
                              </Label>
                              <Input
                                id={`qty-${unit.id}`}
                                type="number"
                                min="1"
                                value={selection.quantity}
                                onChange={(e) =>
                                  handleUpdateUnitQuantity(
                                    unit.id,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Resumo da seleção */}
          {selectedUnits.size > 0 && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-900 mb-2">
                {selectedUnits.size}{' '}
                {selectedUnits.size === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
              <p className="text-indigo-900">
                Total:{' '}
                {formatCurrency(
                  Array.from(selectedUnits.values()).reduce(
                    (sum, s) => sum + s.basePrice * s.quantity,
                    0
                  )
                )}
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selectedUnits.size === 0}>
              Adicionar {selectedUnits.size > 0 && `(${selectedUnits.size})`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
