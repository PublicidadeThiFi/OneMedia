import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { MediaPointOwner, OwnerCompany, OwnerRegime, RentPeriodicity } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';
import { useOwnerCompanies } from '../../hooks/useOwnerCompanies';

interface MediaPointOwnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaPointId: string;
  mediaPointName: string;
}

type OwnerPayload = {
  ownerCompanyId?: string;
  ownerName?: string;
  ownerDocument?: string;
  ownerPhone?: string;
  regime?: OwnerRegime;
  derMonthlyFee?: number;
  rentValue?: number;
  fixedExpenseDueDay?: number;
  rentPeriodicity?: RentPeriodicity;
  notes?: string;
};

export function MediaPointOwnersDialog({
  open,
  onOpenChange,
  mediaPointId,
  mediaPointName,
}: MediaPointOwnersDialogProps) {
  const { subscription } = useCompany();
  const maxOwners = subscription?.maxOwnersPerMediaPoint ?? 1;

  const {
    ownerCompanies,
    loading: ownerCompaniesLoading,
    error: ownerCompaniesError,
    refetch: refetchOwnerCompanies,
  } = useOwnerCompanies(open);

  const [owners, setOwners] = useState<MediaPointOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [editingOwner, setEditingOwner] = useState<MediaPointOwner | null>(null);

  const canAddOwner = owners.length < maxOwners;

  const loadOwners = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<MediaPointOwner[]>(`/media-points/${mediaPointId}/owners`);
      setOwners(res.data || []);
    } catch (e) {
      console.error(e);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadOwners();
      refetchOwnerCompanies();
    } else {
      setOwners([]);
      setIsAddingOwner(false);
      setEditingOwner(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaPointId]);

  const handleRemoveOwner = async (owner: MediaPointOwner) => {
    if (!confirm(`Remover proprietário "${owner.ownerCompany?.name ?? owner.ownerName}" deste ponto?`)) return;

    try {
      await apiClient.delete(`/media-point-owners/${owner.id}`);
      setOwners((prev) => prev.filter((o) => o.id !== owner.id));
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || 'Erro ao remover proprietário.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Proprietários / Empresas vinculadas – {mediaPointName}
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Limite atual: <b>{maxOwners}</b> proprietário(s) por ponto (assinatura multi-proprietários).
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-600">
              {owners.length} de {maxOwners} proprietário(s) utilizado(s)
            </div>

            <Button
              onClick={() => {
                if (!canAddOwner) return;
                setIsAddingOwner(true);
                setEditingOwner(null);
              }}
              disabled={!canAddOwner}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Proprietário
            </Button>
          </div>

          {!canAddOwner && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                Você atingiu o limite de proprietários por ponto ({maxOwners}). Para adicionar mais, aumente a assinatura multi-proprietários em Configurações.
              </CardContent>
            </Card>
          )}

          {ownerCompaniesError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-sm text-red-900">
                {String(ownerCompaniesError)}
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-gray-500">
                Carregando proprietários...
              </CardContent>
            </Card>
          )}

          {!loading && owners.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-gray-500">
                Nenhum proprietário vinculado a este ponto.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {owners.map((owner) => {
              const displayName = owner.ownerCompany?.name ?? owner.ownerName;
              const isPrimary = !!owner.ownerCompany?.isPrimary;
              return (
                <Card key={owner.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium text-gray-900">{displayName}</div>
                          {isPrimary && (
                            <Badge variant="secondary">Empresa própria</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                          {owner.ownerDocument && <span>Doc: {owner.ownerDocument}</span>}
                          {owner.ownerPhone && <span>Tel: {owner.ownerPhone}</span>}
                          {owner.regime && <span>Regime: {owner.regime}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingOwner(owner);
                            setIsAddingOwner(false);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveOwner(owner)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {(owner.derMonthlyFee || owner.rentValue || owner.fixedExpenseDueDay) && (
                      <div className="mt-3 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {owner.derMonthlyFee != null && (
                            <span>DER: R$ {Number(owner.derMonthlyFee).toFixed(2)}</span>
                          )}
                          {owner.rentValue != null && (
                            <span>Aluguel: R$ {Number(owner.rentValue).toFixed(2)}</span>
                          )}
                          {owner.fixedExpenseDueDay != null && (
                            <span>Venc.: dia {owner.fixedExpenseDueDay}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {owner.notes && (
                      <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
                        {owner.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {(isAddingOwner || editingOwner) && (
            <OwnerForm
              owner={editingOwner}
              ownerCompanies={ownerCompanies}
              ownerCompaniesLoading={ownerCompaniesLoading}
              onSave={async (data) => {
                try {
                  const payload: any = {};

                  if (data.ownerCompanyId) payload.ownerCompanyId = data.ownerCompanyId;
                  if (!data.ownerCompanyId && data.ownerName?.trim()) payload.ownerName = data.ownerName.trim();

                  if (data.ownerDocument?.trim()) payload.ownerDocument = data.ownerDocument.trim();
                  if (data.ownerPhone?.trim()) payload.ownerPhone = data.ownerPhone.trim();

                  if (data.regime) payload.regime = data.regime;
                  if (data.derMonthlyFee !== undefined) payload.derMonthlyFee = data.derMonthlyFee;
                  if (data.rentValue !== undefined) payload.rentValue = data.rentValue;
                  if (data.fixedExpenseDueDay !== undefined) payload.fixedExpenseDueDay = data.fixedExpenseDueDay;
                  if (data.rentPeriodicity) payload.rentPeriodicity = data.rentPeriodicity;
                  if (data.notes?.trim()) payload.notes = data.notes.trim();

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
                } catch (e: any) {
                  console.error(e);
                  alert(e?.response?.data?.message || 'Erro ao salvar proprietário.');
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
  ownerCompanies: OwnerCompany[];
  ownerCompaniesLoading: boolean;
  onSave: (data: OwnerPayload) => void;
  onCancel: () => void;
}

function OwnerForm({ owner, ownerCompanies, ownerCompaniesLoading, onSave, onCancel }: OwnerFormProps) {
  const [formData, setFormData] = useState<OwnerPayload>(() => {
    if (owner) {
      return {
        ownerCompanyId: owner.ownerCompanyId ?? undefined,
        ownerName: owner.ownerName,
        ownerDocument: owner.ownerDocument,
        ownerPhone: owner.ownerPhone ?? undefined,
        regime: owner.regime,
        derMonthlyFee: owner.derMonthlyFee ?? undefined,
        rentValue: owner.rentValue ?? undefined,
        fixedExpenseDueDay: owner.fixedExpenseDueDay ?? undefined,
        rentPeriodicity: owner.rentPeriodicity ?? undefined,
        notes: owner.notes ?? undefined,
      };
    }

    return {
      ownerCompanyId: undefined,
      ownerName: '',
    };
  });

  const updateField = (field: keyof OwnerPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const requiresManualName = !formData.ownerCompanyId;
  const canSave = !!(formData.ownerCompanyId || formData.ownerName?.trim());

  return (
    <Card className="border-2 border-green-100 bg-green-50/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <h4 className="text-gray-900">{owner ? 'Editar Proprietário' : 'Novo Proprietário'}</h4>
            <p className="text-sm text-gray-600">
              Selecione a empresa proprietária (cadastrada no SuperAdmin) e preencha os dados de despesas fixas do ponto.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Empresa proprietária *</Label>
          <Select
            value={formData.ownerCompanyId || ''}
            onValueChange={(value: string) => updateField('ownerCompanyId', value || undefined)}
            disabled={ownerCompaniesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={ownerCompaniesLoading ? 'Carregando...' : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              {ownerCompanies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.isPrimary ? ' (empresa própria)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ownerCompanies.length === 0 && (
            <p className="text-xs text-gray-500">
              Nenhuma empresa proprietária encontrada.
            </p>
          )}
        </div>

        {requiresManualName && (
          <div className="space-y-2">
            <Label>Nome do Proprietário (fallback) *</Label>
            <Input
              placeholder="Ex: DER SP / Prefeitura / João Silva"
              value={formData.ownerName || ''}
              onChange={(e) => updateField('ownerName', e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Use apenas se não conseguir carregar/selecionar as empresas do SuperAdmin.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={formData.ownerPhone || ''}
              onChange={(e) => updateField('ownerPhone', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Taxa DER mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="300.00"
              value={formData.derMonthlyFee ?? ''}
              onChange={(e) => updateField('derMonthlyFee', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor do aluguel (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={formData.rentValue ?? ''}
              onChange={(e) => updateField('rentValue', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dia vencimento</Label>
            <Input
              type="number"
              placeholder="10"
              value={formData.fixedExpenseDueDay ?? ''}
              onChange={(e) => updateField('fixedExpenseDueDay', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Periodicidade do aluguel</Label>
          <Select
            value={(formData.rentPeriodicity as any) || ''}
            onValueChange={(value: string) => updateField('rentPeriodicity', value as RentPeriodicity)}
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
          <Button onClick={() => onSave(formData)} disabled={!canSave}>
            {owner ? 'Salvar Alterações' : 'Adicionar Proprietário'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
