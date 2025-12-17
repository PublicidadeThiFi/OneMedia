import { useEffect, useMemo, useState } from 'react';
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
import apiClient from '../../lib/apiClient';

interface MediaPointOwnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
}

type OwnerPayload = Partial<
  Pick<
    MediaPointOwner,
    | 'ownerName'
    | 'ownerDocument'
    | 'regime'
    | 'derMonthlyFee'
    | 'rentValue'
    | 'fixedExpenseDueDay'
    | 'ownerPhone'
    | 'rentPeriodicity'
    | 'notes'
  >
>;

function sanitizeOwnerPayload(payload: OwnerPayload) {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    clean[k] = v;
  }
  return clean;
}

export function MediaPointOwnersDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
}: MediaPointOwnersDialogProps) {
  const [owners, setOwners] = useState<MediaPointOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [editingOwner, setEditingOwner] = useState<MediaPointOwner | null>(null);

  const currentOwners = owners.length;

  const loadOwners = async () => {
    if (!mediaPointId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<MediaPointOwner[]>(
        `/media-points/${mediaPointId}/owners`
      );
      setOwners(res.data ?? []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || 'Erro ao carregar proprietários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadOwners();
    } else {
      setIsAddingOwner(false);
      setEditingOwner(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaPointId]);

  const getRegimeLabel = (regime?: OwnerRegime | null) => {
    if (!regime) return '-';
    switch (regime) {
      case OwnerRegime.DER:
        return 'DER (Departamento de Estradas)';
      case OwnerRegime.ADMIN_PUBLICA:
        return 'Administração Pública';
      case OwnerRegime.AREA_PARTICULAR:
        return 'Área Particular';
      case OwnerRegime.OUTRO:
        return 'Outro';
      default:
        return String(regime);
    }
  };

  const getRegimeColor = (regime?: OwnerRegime | null) => {
    if (!regime) return 'bg-gray-100 text-gray-800';
    switch (regime) {
      case OwnerRegime.DER:
        return 'bg-blue-100 text-blue-800';
      case OwnerRegime.ADMIN_PUBLICA:
        return 'bg-green-100 text-green-800';
      case OwnerRegime.AREA_PARTICULAR:
        return 'bg-purple-100 text-purple-800';
      case OwnerRegime.OUTRO:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPeriodicityLabel = (periodicity?: RentPeriodicity | null) => {
    if (!periodicity) return '-';
    switch (periodicity) {
      case RentPeriodicity.MENSAL:
        return 'Mensal';
      case RentPeriodicity.TRIMESTRAL:
        return 'Trimestral';
      case RentPeriodicity.ANUAL:
        return 'Anual';
      case RentPeriodicity.OUTRO:
        return 'Outro';
      default:
        return String(periodicity);
    }
  };

  const getPeriodicityColor = (periodicity?: RentPeriodicity | null) => {
    if (!periodicity) return 'bg-gray-100 text-gray-800';
    switch (periodicity) {
      case RentPeriodicity.MENSAL:
        return 'bg-green-100 text-green-800';
      case RentPeriodicity.TRIMESTRAL:
        return 'bg-blue-100 text-blue-800';
      case RentPeriodicity.ANUAL:
        return 'bg-purple-100 text-purple-800';
      case RentPeriodicity.OUTRO:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const headerHint = useMemo(() => {
    if (currentOwners === 0) return 'Cadastre ao menos 1 proprietário para controlar contrato e despesas.';
    if (currentOwners === 1) return 'Você tem 1 proprietário cadastrado.';
    return `Você tem ${currentOwners} proprietários cadastrados.`;
  }, [currentOwners]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proprietários do Ponto - {mediaPointName}</DialogTitle>
          <DialogDescription>
            Gerencie proprietários (DER, prefeitura, particular) e despesas fixas do ponto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <div className="font-medium mb-1">Dica</div>
              <div>{headerHint}</div>
              <div className="text-amber-700 mt-1">
                Observação: o <strong>limite de proprietários por assinatura</strong> ainda não está integrado (não há bloqueio no sistema).
              </div>
            </div>
          </div>

          {/* Lista de proprietários */}
          <div className="space-y-3">
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">Carregando...</CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-red-600 mb-2">Erro ao carregar proprietários</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <div className="mt-4">
                    <Button variant="outline" onClick={loadOwners}>
                      Tentar novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : owners.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">Nenhum proprietário cadastrado</p>
                  <Button onClick={() => setIsAddingOwner(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Proprietário
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {owners.map((owner) => (
                  <Card key={owner.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-gray-900">{owner.ownerName}</h4>
                            {owner.regime && (
                              <Badge className={getRegimeColor(owner.regime)}>
                                {getRegimeLabel(owner.regime)}
                              </Badge>
                            )}
                            {owner.rentPeriodicity && (
                              <Badge className={getPeriodicityColor(owner.rentPeriodicity)}>
                                {getPeriodicityLabel(owner.rentPeriodicity)}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {owner.ownerDocument && (
                              <div>
                                <span className="text-gray-600">Documento: </span>
                                <span className="text-gray-900">{owner.ownerDocument}</span>
                              </div>
                            )}
                            {owner.ownerPhone && (
                              <div>
                                <span className="text-gray-600">Telefone: </span>
                                <span className="text-gray-900">{owner.ownerPhone}</span>
                              </div>
                            )}
                            {owner.derMonthlyFee !== undefined && owner.derMonthlyFee !== null && (
                              <div>
                                <span className="text-gray-600">Taxa DER: </span>
                                <span className="text-gray-900">R$ {owner.derMonthlyFee}</span>
                              </div>
                            )}
                            {owner.rentValue !== undefined && owner.rentValue !== null && (
                              <div>
                                <span className="text-gray-600">Aluguel: </span>
                                <span className="text-gray-900">R$ {owner.rentValue}</span>
                              </div>
                            )}
                            {owner.fixedExpenseDueDay !== undefined &&
                              owner.fixedExpenseDueDay !== null && (
                                <div>
                                  <span className="text-gray-600">Vencimento: </span>
                                  <span className="text-gray-900">dia {owner.fixedExpenseDueDay}</span>
                                </div>
                              )}
                          </div>

                          {owner.notes && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-600">Obs: </span>
                              <span className="text-gray-900">{owner.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingOwner(owner)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const ok = window.confirm('Excluir este proprietário?');
                              if (!ok) return;
                              try {
                                await apiClient.delete(`/media-point-owners/${owner.id}`);
                                setOwners((prev) => prev.filter((o) => o.id !== owner.id));
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao excluir proprietário.');
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full" onClick={() => setIsAddingOwner(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Proprietário ({currentOwners})
                </Button>
              </>
            )}
          </div>

          {/* Formulário de adição/edição */}
          {(isAddingOwner || editingOwner) && (
            <OwnerForm
              owner={editingOwner}
              onSave={async (data) => {
                try {
                  const payload = sanitizeOwnerPayload(data);

                  if (editingOwner) {
                    const res = await apiClient.put<MediaPointOwner>(
                      `/media-point-owners/${editingOwner.id}`,
                      payload
                    );
                    setOwners((prev) => prev.map((o) => (o.id === editingOwner.id ? res.data : o)));
                    setEditingOwner(null);
                  } else {
                    const res = await apiClient.post<MediaPointOwner>(
                      `/media-points/${mediaPointId}/owners`,
                      payload
                    );
                    setOwners((prev) => [...prev, res.data]);
                    setIsAddingOwner(false);
                  }
                } catch (e) {
                  console.error(e);
                  alert('Erro ao salvar proprietário.');
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
  owner: MediaPointOwner | null;
  onSave: (data: OwnerPayload) => void;
  onCancel: () => void;
}

function OwnerForm({ owner, onSave, onCancel }: OwnerFormProps) {
  const [formData, setFormData] = useState<OwnerPayload>(
    owner || {
      ownerName: '',
      regime: undefined,
    }
  );

  const updateField = (field: keyof OwnerPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-2 border-green-100 bg-green-50/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <h4 className="text-gray-900">{owner ? 'Editar Proprietário' : 'Novo Proprietário'}</h4>
            <p className="text-sm text-gray-600">
              Preencha os dados do proprietário e (se aplicável) despesas fixas do ponto.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Proprietário *</Label>
            <Input
              placeholder="Ex: DER SP / Prefeitura / João Silva"
              value={formData.ownerName || ''}
              onChange={(e) => updateField('ownerName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Documento (CPF/CNPJ)</Label>
            <Input
              placeholder="00.000.000/0001-00"
              value={formData.ownerDocument || ''}
              onChange={(e) => updateField('ownerDocument', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Regime</Label>
          <Select
            value={(formData.regime as any) || ''}
            onValueChange={(value: string) => updateField('regime', value as OwnerRegime)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OwnerRegime.AREA_PARTICULAR}>Área Particular</SelectItem>
              <SelectItem value={OwnerRegime.ADMIN_PUBLICA}>Administração Pública</SelectItem>
              <SelectItem value={OwnerRegime.DER}>DER</SelectItem>
              <SelectItem value={OwnerRegime.OUTRO}>Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Taxa DER mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="300.00"
              value={formData.derMonthlyFee ?? ''}
              onChange={(e) => updateField('derMonthlyFee', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor do aluguel (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={formData.rentValue ?? ''}
              onChange={(e) => updateField('rentValue', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dia vencimento</Label>
            <Input
              type="number"
              placeholder="10"
              value={formData.fixedExpenseDueDay ?? ''}
              onChange={(e) =>
                updateField('fixedExpenseDueDay', e.target.value ? parseInt(e.target.value) : null)
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={formData.ownerPhone || ''}
              onChange={(e) => updateField('ownerPhone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Periodicidade do aluguel</Label>
            <Select
              value={(formData.rentPeriodicity as any) || ''}
              onValueChange={(value: string) =>
                updateField('rentPeriodicity', value as RentPeriodicity)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
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
          <Label>Observações</Label>
          <Textarea
            placeholder="Ex: Contrato vence em..., reajuste anual..., etc."
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(formData)} disabled={!formData.ownerName?.trim()}>
            {owner ? 'Salvar Alterações' : 'Adicionar Proprietário'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
