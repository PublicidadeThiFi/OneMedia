import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Lightbulb } from 'lucide-react';
import { MediaPointOwner, OwnerRegime, RentPeriodicity } from '../../types';
import { getOwnersForPoint } from '../../lib/mockData';
import { getPlatformSubscriptionForCompany, CURRENT_COMPANY_ID } from '../../lib/mockDataSettings';

interface MediaPointOwnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
}

export function MediaPointOwnersDialog({ 
  open, 
  onOpenChange, 
  mediaPointId, 
  mediaPointName 
}: MediaPointOwnersDialogProps) {
  // TODO: Integrar com API real
  const [owners, setOwners] = useState<MediaPointOwner[]>(getOwnersForPoint(mediaPointId));
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [editingOwner, setEditingOwner] = useState<MediaPointOwner | null>(null);

  // Buscar limite de proprietários da assinatura
  const subscription = getPlatformSubscriptionForCompany(CURRENT_COMPANY_ID);
  const maxOwners = subscription.maxOwnersPerMediaPoint; // 1-4
  const currentOwners = owners.length;

  const getRegimeLabel = (regime?: OwnerRegime | null) => {
    if (!regime) return '-';
    switch (regime) {
      case OwnerRegime.DER: return 'DER (Departamento de Estradas)';
      case OwnerRegime.ADMIN_PUBLICA: return 'Administração Pública';
      case OwnerRegime.AREA_PARTICULAR: return 'Área Particular';
      case OwnerRegime.OUTRO: return 'Outro';
    }
  };

  const getRegimeColor = (regime?: OwnerRegime | null) => {
    if (!regime) return 'bg-gray-100 text-gray-800';
    switch (regime) {
      case OwnerRegime.DER: return 'bg-blue-100 text-blue-800';
      case OwnerRegime.ADMIN_PUBLICA: return 'bg-purple-100 text-purple-800';
      case OwnerRegime.AREA_PARTICULAR: return 'bg-green-100 text-green-800';
      case OwnerRegime.OUTRO: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPeriodicityLabel = (periodicity?: RentPeriodicity | null) => {
    if (!periodicity) return '-';
    switch (periodicity) {
      case RentPeriodicity.MENSAL: return 'Mensal';
      case RentPeriodicity.TRIMESTRAL: return 'Trimestral';
      case RentPeriodicity.ANUAL: return 'Anual';
      case RentPeriodicity.OUTRO: return 'Outro';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Proprietários / Empresas vinculadas - {mediaPointName}
          </DialogTitle>
          <DialogDescription>
            Gerencie os proprietários e empresas relacionadas a este ponto (MediaPointOwner)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info sobre limites */}
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-900 mb-1">
              ⚠️ Limite de Proprietários
            </p>
            <p className="text-sm text-amber-700">
              {maxOwners === 1 ? (
                <>
                  Pelo seu plano atual, cada ponto pode ter até <strong>1 proprietário</strong>.
                  {' '}Para habilitar mais proprietários por ponto, faça upgrade da sua assinatura em{' '}
                  <strong>Configurações › Assinatura</strong>.
                </>
              ) : (
                <>
                  Pelo seu plano atual, cada ponto pode ter até <strong>{maxOwners} proprietários</strong>.
                  {' '}Para aumentar esse limite, faça upgrade em{' '}
                  <strong>Configurações › Assinatura</strong>.
                </>
              )}
            </p>
          </div>

          {/* Lista de proprietários */}
          <div className="space-y-3">
            {owners.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">
                    Nenhum proprietário cadastrado para este ponto
                  </p>
                  <Button onClick={() => setIsAddingOwner(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Proprietário
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {owners.map((owner) => (
                  <Card key={owner.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-gray-900">{owner.ownerName}</h4>
                            {owner.regime && (
                              <Badge className={getRegimeColor(owner.regime)}>
                                {getRegimeLabel(owner.regime)}
                              </Badge>
                            )}
                          </div>

                          {owner.ownerDocument && (
                            <p className="text-sm text-gray-600 mb-2">
                              CNPJ/CPF: {owner.ownerDocument}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {owner.regime === OwnerRegime.DER && owner.derMonthlyFee && (
                              <div>
                                <span className="text-gray-600">Taxa Mensal DER: </span>
                                <span className="text-gray-900">
                                  R$ {owner.derMonthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}

                            {owner.rentValue && (
                              <div>
                                <span className="text-gray-600">Aluguel: </span>
                                <span className="text-gray-900">
                                  R$ {owner.rentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}

                            {owner.fixedExpenseDueDay && (
                              <div>
                                <span className="text-gray-600">Vencimento: </span>
                                <span className="text-gray-900">Dia {owner.fixedExpenseDueDay}</span>
                              </div>
                            )}
                          </div>

                          {owner.notes && (
                            <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                              {owner.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingOwner(owner)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Confirmar exclusão
                              setOwners(prev => prev.filter(o => o.id !== owner.id));
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {currentOwners < maxOwners && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddingOwner(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Proprietário ({currentOwners}/{maxOwners})
                  </Button>
                )}

                {currentOwners >= maxOwners && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    💡 Você já atingiu o limite de {maxOwners} {maxOwners === 1 ? 'proprietário' : 'proprietários'} para este ponto no seu plano atual. 
                    Para aumentar esse limite, altere sua assinatura em <strong>Configurações › Assinatura</strong>.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Formulário de adição/edição */}
          {(isAddingOwner || editingOwner) && (
            <OwnerForm
              owner={editingOwner}
              onSave={(data) => {
                if (editingOwner) {
                  setOwners(prev => prev.map(o => o.id === editingOwner.id ? { ...o, ...data } : o));
                  setEditingOwner(null);
                } else {
                  const newOwner: MediaPointOwner = {
  id: `mpo${Date.now()}`,
  companyId: 'c1',
  mediaPointId,
  ...data,
  // garante que no final ownerName seja sempre string
  ownerName: data.ownerName ?? '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

                  setOwners(prev => [...prev, newOwner]);
                  setIsAddingOwner(false);
                }
              }}
              onCancel={() => {
                setIsAddingOwner(false);
                setEditingOwner(null);
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

interface OwnerFormProps {
  owner?: MediaPointOwner | null;
  onSave: (data: Partial<MediaPointOwner>) => void;
  onCancel: () => void;
}

function OwnerForm({ owner, onSave, onCancel }: OwnerFormProps) {
  const [formData, setFormData] = useState<Partial<MediaPointOwner>>(
    owner || {
      ownerName: '',
      regime: undefined,
    }
  );

  const updateField = (field: keyof MediaPointOwner, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-2 border-green-100 bg-green-50/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="text-gray-900 mb-1">
              {owner ? 'Editar Proprietário' : 'Informe os dados do pagamento de aluguel deste ponto de mídia'}
            </h4>
            <p className="text-sm text-gray-600">
              Dados de propriedade e locação
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Proprietário/Locador *</Label>
            <Input
              placeholder="Ex: João Silva, Empresa XYZ"
              value={formData.ownerName || ''}
              onChange={(e) => updateField('ownerName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>CPF/CNPJ</Label>
            <Input
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={formData.ownerDocument || ''}
              onChange={(e) => updateField('ownerDocument', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contato</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={formData.ownerPhone || ''}
              onChange={(e) => updateField('ownerPhone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Regime</Label>
            <Select
  value={formData.regime || ''}
  onValueChange={(value: string) =>
    updateField('regime', value as OwnerRegime)
  }
>

              <SelectTrigger>
                <SelectValue placeholder="Selecione o regime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OwnerRegime.AREA_PARTICULAR}>
                  Área Particular
                </SelectItem>
                <SelectItem value={OwnerRegime.DER}>
                  DER (Departamento de Estradas)
                </SelectItem>
                <SelectItem value={OwnerRegime.ADMIN_PUBLICA}>
                  Administração Pública
                </SelectItem>
                <SelectItem value={OwnerRegime.OUTRO}>
                  Outro
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor do Aluguel (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={formData.rentValue || ''}
              onChange={(e) => updateField('rentValue', parseFloat(e.target.value) || null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Periodicidade</Label>
            <Select
  value={formData.rentPeriodicity || ''}
  onValueChange={(value: string) =>
    updateField('rentPeriodicity', value as RentPeriodicity)
  }
>

              <SelectTrigger>
                <SelectValue placeholder="Selecione a periodicidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RentPeriodicity.MENSAL}>Mensal</SelectItem>
                <SelectItem value={RentPeriodicity.TRIMESTRAL}>Trimestral</SelectItem>
                <SelectItem value={RentPeriodicity.ANUAL}>Anual</SelectItem>
                <SelectItem value={RentPeriodicity.OUTRO}>Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Dia de Vencimento
            <span className="text-sm text-gray-500 ml-2">(opcional - dia do mês para vencimento do aluguel)</span>
          </Label>
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 5 (dia 5 de cada mês)"
            value={formData.fixedExpenseDueDay || ''}
            onChange={(e) => updateField('fixedExpenseDueDay', parseInt(e.target.value) || null)}
          />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Informações adicionais sobre o aluguel..."
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.ownerName?.trim()}
          >
            {owner ? 'Salvar Alterações' : 'Adicionar Proprietário'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}