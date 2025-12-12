import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { MediaType, MediaUnit, UnitType, Orientation } from '../../types';
import { getMediaUnitsForPoint } from '../../lib/mockData';

interface MediaUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
  mediaPointType: MediaType;
}

export function MediaUnitsDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
  mediaPointType,
}: MediaUnitsDialogProps) {
  const [units, setUnits] = useState<MediaUnit[]>(getMediaUnitsForPoint(mediaPointId));
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MediaUnit | null>(null);

  const getOrientationLabel = (orientation?: Orientation) => {
    if (!orientation) return '-';
    return orientation === Orientation.FLUXO ? 'Fluxo' : 'Contra-Fluxo';
  };

  const getOrientationColor = (orientation?: Orientation) => {
    if (!orientation) return 'bg-gray-100 text-gray-800';
    return orientation === Orientation.FLUXO
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mediaPointType === MediaType.OOH ? 'Faces OOH' : 'Telas DOOH'} - {mediaPointName}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {mediaPointType === MediaType.OOH
              ? 'Gerencie as faces (unidades de veiculação) deste ponto OOH'
              : 'Gerencie as telas (unidades digitais) deste ponto DOOH'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de unidades */}
          <div className="space-y-3">
            {units.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">
                    Nenhuma {mediaPointType === MediaType.OOH ? 'face' : 'tela'} cadastrada
                  </p>
                  <Button onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {units.map((unit) => (
                  <Card key={unit.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-gray-900">{unit.label}</h4>
                            {unit.orientation && (
                              <Badge className={getOrientationColor(unit.orientation)}>
                                {getOrientationLabel(unit.orientation)}
                              </Badge>
                            )}
                            <Badge variant={unit.isActive ? 'default' : 'secondary'}>
                              {unit.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                            {mediaPointType === MediaType.OOH && (
                              <>
                                {unit.widthM && unit.heightM && (
                                  <div>
                                    <span className="text-gray-600">Dimensões: </span>
                                    <span className="text-gray-900">
                                      {unit.widthM}m x {unit.heightM}m
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {mediaPointType === MediaType.DOOH && (
                              <>
                                {unit.insertionsPerDay && (
                                  <div>
                                    <span className="text-gray-600">Inserções/dia: </span>
                                    <span className="text-gray-900">{unit.insertionsPerDay}</span>
                                  </div>
                                )}
                                {unit.resolutionWidthPx && unit.resolutionHeightPx && (
                                  <div>
                                    <span className="text-gray-600">Resolução: </span>
                                    <span className="text-gray-900">
                                      {unit.resolutionWidthPx}x{unit.resolutionHeightPx}px
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {unit.priceMonth && (
                              <div>
                                <span className="text-gray-600">Preço/mês: </span>
                                <span className="text-gray-900">
                                  R$ {unit.priceMonth.toLocaleString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>

                          {unit.imageUrl && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Imagem da {mediaPointType === MediaType.OOH ? 'face' : 'tela'}:</p>
                              <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden">
                                <img
                                  src={unit.imageUrl}
                                  alt={unit.label}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUnit(unit)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUnits((prev) => prev.filter((u) => u.id !== unit.id));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'}
                </Button>
              </>
            )}
          </div>

          {/* Formulário de adição/edição */}
          {(isAdding || editingUnit) && (
            <UnitForm
              unit={editingUnit}
              mediaPointId={mediaPointId}
              mediaPointType={mediaPointType}
              onSave={(data) => {
                if (editingUnit) {
                  setUnits((prev) =>
                    prev.map((u) => (u.id === editingUnit.id ? { ...u, ...data } : u))
                  );
                  setEditingUnit(null);
                } else {
                  const newUnit: MediaUnit = {
  id: `mu${Date.now()}`,
  companyId: 'c1',
  mediaPointId,
  unitType:
    mediaPointType === MediaType.OOH ? UnitType.FACE : UnitType.SCREEN,
  isActive: data.isActive ?? true,
  ...data,
  // garante que label seja sempre string, nunca undefined
  label: data.label ?? '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

                  setUnits((prev) => [...prev, newUnit]);
                  setIsAdding(false);
                }
              }}
              onCancel={() => {
                setIsAdding(false);
                setEditingUnit(null);
              }}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnitFormProps {
  unit?: MediaUnit | null;
  mediaPointId: string;
  mediaPointType: MediaType;
  onSave: (data: Partial<MediaUnit>) => void;
  onCancel: () => void;
}

function UnitForm({ unit, mediaPointType, onSave, onCancel }: UnitFormProps) {
  const [formData, setFormData] = useState<Partial<MediaUnit>>(
    unit || {
      label: '',
      isActive: true,
    }
  );

  const updateField = (field: keyof MediaUnit, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simular upload - em produção, fazer upload real
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="pt-6 space-y-4">
        <h4 className="text-gray-900 mb-4">
          {unit ? 'Editar Unidade' : `Nova ${mediaPointType === MediaType.OOH ? 'Face' : 'Tela'}`}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome/Label *</Label>
            <Input
              placeholder={
                mediaPointType === MediaType.OOH
                  ? 'Ex: Face 1, Face Principal'
                  : 'Ex: Tela 1, Tela Norte'
              }
              value={formData.label || ''}
              onChange={(e) => updateField('label', e.target.value)}
            />
          </div>

          {mediaPointType === MediaType.OOH && (
            <div className="space-y-2">
              <Label>Orientação</Label>
              <Select
  value={formData.orientation || ''}
  onValueChange={(value: string) =>
    updateField('orientation', value as Orientation)
  }
>

                <SelectTrigger>
                  <SelectValue placeholder="Selecione a orientação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Orientation.FLUXO}>Fluxo</SelectItem>
                  <SelectItem value={Orientation.CONTRA_FLUXO}>Contra-Fluxo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Imagem da Face/Tela */}
        <div className="space-y-2">
          <Label>Imagem da {mediaPointType === MediaType.OOH ? 'Face' : 'Tela'}</Label>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleImageChange}
              className="flex-1"
            />
            {formData.imageUrl && (
              <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Foto da {mediaPointType === MediaType.OOH ? 'face específica' : 'tela'} - JPG, PNG,
            GIF (máx. 4MB)
          </p>
        </div>

        {/* Campos específicos OOH */}
        {mediaPointType === MediaType.OOH && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura do Material (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.00"
                  value={formData.widthM || ''}
                  onChange={(e) => updateField('widthM', parseFloat(e.target.value) || null)}
                />
                <p className="text-xs text-gray-500">Largura do material veiculado</p>
              </div>

              <div className="space-y-2">
                <Label>Altura do Material (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="3.00"
                  value={formData.heightM || ''}
                  onChange={(e) => updateField('heightM', parseFloat(e.target.value) || null)}
                />
                <p className="text-xs text-gray-500">Altura do material veiculado</p>
              </div>
            </div>

            {formData.widthM && formData.heightM && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                <span className="text-blue-900">
                  Formato: {formData.widthM}m x {formData.heightM}m
                </span>
              </div>
            )}
          </>
        )}

        {/* Campos específicos DOOH */}
        {mediaPointType === MediaType.DOOH && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inserções por Dia</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.insertionsPerDay || ''}
                  onChange={(e) =>
                    updateField('insertionsPerDay', parseInt(e.target.value) || null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Resolução da Mídia</Label>
                <Select
  value={
    formData.resolutionWidthPx && formData.resolutionHeightPx
      ? `${formData.resolutionWidthPx}x${formData.resolutionHeightPx}`
      : ''
  }
  onValueChange={(value: string) => {
    const [width, height] = value.split('x').map(Number);
    updateField('resolutionWidthPx', width);
    updateField('resolutionHeightPx', height);
  }}
>

                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a resolução" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1920x1080 (Full HD Horizontal)</SelectItem>
                    <SelectItem value="1080x1920">1080x1920 (Full HD Vertical)</SelectItem>
                    <SelectItem value="1366x768">1366x768 (HD Horizontal)</SelectItem>
                    <SelectItem value="768x1366">768x1366 (HD Vertical)</SelectItem>
                    <SelectItem value="3840x2160">3840x2160 (4K Horizontal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Preços */}
        <div className="space-y-2">
          <Label className="text-gray-700">Preços Mensais/Semanais/Diários (opcional)</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Preço/Mês (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={formData.priceMonth || ''}
                onChange={(e) => updateField('priceMonth', parseFloat(e.target.value) || null)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Preço/Semana (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1500.00"
                value={formData.priceWeek || ''}
                onChange={(e) => updateField('priceWeek', parseFloat(e.target.value) || null)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Preço/Dia (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="300.00"
                value={formData.priceDay || ''}
                onChange={(e) => updateField('priceDay', parseFloat(e.target.value) || null)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(formData)} disabled={!formData.label?.trim()}>
            {unit ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
