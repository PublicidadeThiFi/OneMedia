import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { OwnerCompany } from '../types';
import { useOwnerCompanies } from '../hooks/useOwnerCompanies';
import { Plus, Pencil, Trash2, RefreshCcw } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

type CompanySettingsResponse = {
  agencyMarkupPercent?: number | string | null;
  reservationStartCutoffTime?: string | null;
};

export function SuperAdmin() {
  const { user } = useAuth();

  const {
    ownerCompanies,
    loading,
    error,
    refetch,
    createOwnerCompany,
    updateOwnerCompany,
    deleteOwnerCompany,
  } = useOwnerCompanies(true);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerCompany | null>(null);

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const [agencyMarkupPercent, setAgencyMarkupPercent] = useState<string>('0');
  const [reservationStartCutoffTime, setReservationStartCutoffTime] = useState<string>('18:00');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  const loadCompany = async () => {
    setCompanyLoading(true);
    try {
      const res = await apiClient.get<CompanySettingsResponse>('/company');
      const p = Number(res?.data?.agencyMarkupPercent ?? 0);
      const cutoffRaw = String(res?.data?.reservationStartCutoffTime ?? '').trim();
      setAgencyMarkupPercent(String(Number.isFinite(p) ? p : 0));
      setReservationStartCutoffTime(/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoffRaw) ? cutoffRaw : '18:00');
    } catch {
      // não bloqueia a tela
    } finally {
      setCompanyLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    if (!isSuperAdmin) {
      toast.error('Apenas SuperAdmin pode alterar o markup.');
      return;
    }
    const next = Math.max(0, Math.min(500, Number(agencyMarkupPercent) || 0));
    const cutoff = String(reservationStartCutoffTime || '').trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoff)) {
      toast.error('Informe um horário válido no formato HH:mm.');
      return;
    }
    setCompanySaving(true);
    try {
      await apiClient.put('/company', { agencyMarkupPercent: next, reservationStartCutoffTime: cutoff });
      setAgencyMarkupPercent(String(next));
      setReservationStartCutoffTime(cutoff);
      toast.success('Configurações atualizadas', { description: `Agência +${next}% • corte ${cutoff}` });
    } catch (e: any) {
      toast.error('Não foi possível salvar', { description: e?.response?.data?.message || e?.message });
    } finally {
      setCompanySaving(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ownerCompanies;
    return ownerCompanies.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [ownerCompanies, query]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cardápio público — Markup “Sou Agência”</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            Configure o percentual aplicado nos preços quando o cliente abrir o cardápio com <b>flow=agency</b>.
            <br />
            <b>0%</b> desativa o markup.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[16rem_16rem_auto] gap-3 md:items-end">
            <div className="space-y-2">
              <Label>Percentual (%)</Label>
              <Input
                type="number"
                min={0}
                max={500}
                step={1}
                value={agencyMarkupPercent}
                disabled={!isSuperAdmin || companyLoading || companySaving}
                onChange={(e) => setAgencyMarkupPercent(e.target.value)}
                className="w-full md:w-64"
              />
            </div>

            <div className="space-y-2">
              <Label>Horário de corte da vigência</Label>
              <Input
                type="time"
                step={60}
                value={reservationStartCutoffTime}
                disabled={!isSuperAdmin || companyLoading || companySaving}
                onChange={(e) => setReservationStartCutoffTime(e.target.value)}
                className="w-full md:w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={saveCompanySettings}
                disabled={!isSuperAdmin || companyLoading || companySaving}
              >
                {companySaving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={loadCompany}
                disabled={companyLoading || companySaving}
                title="Recarregar valor atual"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
              {!isSuperAdmin && (
                <span className="text-xs text-gray-500">Sem permissão</span>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Check-ins feitos até o horário de corte contam no mesmo dia. Depois desse horário, a vigência começa no dia seguinte.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Super Admin (Interno) – Empresas Proprietárias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Aqui você cadastra empresas proprietárias que poderão ser vinculadas aos pontos do inventário.
            <br />
            <b>Não há limite</b> de empresas proprietárias na conta. O limite da assinatura multi-proprietários é apenas
            a <b>quantidade de proprietários por ponto</b>.
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Buscar por nome, documento, e-mail ou telefone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md"
            />

            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>

            <Button
              onClick={() => {
                setEditing(null);
                setIsOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova empresa
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-600">{String(error)}</div>
          )}

          {loading && (
            <div className="text-sm text-gray-500">Carregando...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-sm text-gray-500">Nenhuma empresa encontrada.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((c) => (
              <Card key={c.id} className={c.isPrimary ? 'border-blue-200 bg-blue-50/40' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        {c.isPrimary && <Badge variant="secondary">Empresa própria</Badge>}
                      </div>
                      <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                        {c.document && <span>Doc: {c.document}</span>}
                        {c.email && <span>E-mail: {c.email}</span>}
                        {c.phone && <span>Tel: {c.phone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(c);
                          setIsOpen(true);
                        }}
                        disabled={c.isPrimary}
                        title={c.isPrimary ? 'Edite a empresa principal em Configurações > Empresa' : 'Editar'}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (c.isPrimary) return;
                          if (!confirm(`Excluir a empresa "${c.name}"?`)) return;
                          try {
                            await deleteOwnerCompany(c.id);
                          } catch (e: any) {
                            alert(e?.response?.data?.message || 'Erro ao excluir.');
                          }
                        }}
                        disabled={c.isPrimary}
                        title={c.isPrimary ? 'A empresa principal não pode ser excluída' : 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Check-ins feitos até o horário de corte contam no mesmo dia. Depois desse horário, a vigência começa no dia seguinte.
          </div>
        </CardContent>
      </Card>

      <OwnerCompanyDialog
        open={isOpen}
        onOpenChange={(o) => setIsOpen(o)}
        editing={editing}
        onSubmit={async (payload) => {
          try {
            if (editing) {
              await updateOwnerCompany(editing.id, payload);
            } else {
              await createOwnerCompany(payload);
            }
            setIsOpen(false);
            setEditing(null);
          } catch (e: any) {
            alert(e?.response?.data?.message || 'Erro ao salvar.');
          }
        }}
      />
    </div>
  );
}

function OwnerCompanyDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OwnerCompany | null;
  onSubmit: (payload: Partial<OwnerCompany>) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [document, setDocument] = useState(editing?.document ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');

  // Atualiza formulário quando mudar editing
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDocument(editing?.document ?? '');
    setEmail(editing?.email ?? '');
    setPhone(editing?.phone ?? '');
  }, [open, editing]);

  const canSave = name.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 gap-0"
        style={{
          width: 'min(720px, calc(100vw - 2rem))',
          maxWidth: 'min(720px, calc(100vw - 2rem))',
          height: 'min(82vh, 560px)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>{editing ? 'Editar empresa proprietária' : 'Nova empresa proprietária'}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Prefeitura de ..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Documento</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CNPJ/CPF" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
          </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  onSubmit({
                    name: name.trim(),
                    document: document.trim() || undefined,
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                  })
                }
                disabled={!canSave}
              >
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
