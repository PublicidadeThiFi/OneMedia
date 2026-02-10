import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '../../lib/apiClient';
import { Company, OwnerCompany } from '../../types';
import { CompanySettings } from './CompanySettings';

type Target =
  | { type: 'company' }
  | { type: 'ownerCompany'; id: string };

interface CompanyEntitySettingsProps {
  company: Company;
  onUpdateCompany: (updates: Partial<Company>) => Promise<void>;
  onRefreshCompany: () => Promise<void>;
}

/**
 * Configurações > Empresa
 *
 * Em vez de duplicar o módulo de Super Admin aqui, exibimos um dropdown para alternar
 * entre a Empresa principal (Company) e as Empresas Proprietárias (OwnerCompany)
 * cadastradas no Super Admin.
 */
export function CompanyEntitySettings({
  company,
  onUpdateCompany,
  onRefreshCompany,
}: CompanyEntitySettingsProps) {
  const [target, setTarget] = useState<Target>({ type: 'company' });
  const [ownerCompanies, setOwnerCompanies] = useState<OwnerCompany[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  const selectableOwnerCompanies = useMemo(() => {
    // A empresa principal já é editada no modo Company.
    // O registro isPrimary existe apenas para seleção no Inventário.
    return (ownerCompanies || []).filter((c) => !c.isPrimary);
  }, [ownerCompanies]);

  const selectedOwnerCompany = useMemo(() => {
    if (target.type !== 'ownerCompany') return null;
    return selectableOwnerCompanies.find((c) => c.id === target.id) ?? null;
  }, [target, selectableOwnerCompanies]);

  const fetchOwnerCompanies = async () => {
    try {
      setOwnersLoading(true);
      setOwnersError(null);
      const res = await apiClient.get<OwnerCompany[]>('/owner-companies');
      setOwnerCompanies(res.data ?? []);
    } catch (e: any) {
      console.error(e);
      setOwnersError(e?.response?.data?.message || e?.message || 'Erro ao carregar empresas proprietárias');
    } finally {
      setOwnersLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectValue = useMemo(() => {
    if (target.type === 'company') return 'company';
    return `owner:${target.id}`;
  }, [target]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Empresa selecionada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label>Editar dados de</Label>
              <Select
                value={selectValue}
                onValueChange={(v: string) => {
                  if (v === 'company') {
                    setTarget({ type: 'company' });
                    return;
                  }
                  if (v.startsWith('owner:')) {
                    const id = v.replace('owner:', '');
                    setTarget({ type: 'ownerCompany', id });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">{company.name} (Empresa principal)</SelectItem>
                  {selectableOwnerCompanies.map((c) => (
                    <SelectItem key={c.id} value={`owner:${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchOwnerCompanies} disabled={ownersLoading}>
                {ownersLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Atualizar lista
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            As empresas proprietárias são cadastradas no módulo <b>Super Admin</b>. Aqui você escolhe uma delas para editar.
          </div>

          {ownersError && <div className="text-sm text-red-600">{ownersError}</div>}
        </CardContent>
      </Card>

      {target.type === 'company' ? (
        <CompanySettings company={company} onUpdateCompany={onUpdateCompany} onRefreshCompany={onRefreshCompany} />
      ) : (
        <OwnerCompanyEditor
          key={target.id}
          ownerCompany={selectedOwnerCompany}
          onReload={fetchOwnerCompanies}
        />
      )}
    </div>
  );
}

function OwnerCompanyEditor({
  ownerCompany,
  onReload,
}: {
  ownerCompany: OwnerCompany | null;
  onReload: () => Promise<void>;
}) {
  const [name, setName] = useState(ownerCompany?.name ?? '');
  const [document, setDocument] = useState(ownerCompany?.document ?? '');
  const [email, setEmail] = useState(ownerCompany?.email ?? '');
  const [phone, setPhone] = useState(ownerCompany?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(ownerCompany?.name ?? '');
    setDocument(ownerCompany?.document ?? '');
    setEmail(ownerCompany?.email ?? '');
    setPhone(ownerCompany?.phone ?? '');
  }, [ownerCompany?.id]);

  const canSave = name.trim().length >= 2;

  const handleSave = async () => {
    if (!ownerCompany) return;
    if (!canSave) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/owner-companies/${ownerCompany.id}`, {
        name: name.trim(),
        document: document.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success('Empresa proprietária atualizada');
      await onReload();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (!ownerCompany) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Empresa proprietária não encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa Proprietária</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>Documento</Label>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CNPJ/CPF" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
