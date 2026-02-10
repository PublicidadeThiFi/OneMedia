import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Building2, Loader2, RefreshCcw } from 'lucide-react';
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
  const [site, setSite] = useState(ownerCompany?.site ?? '');
  const [addressZipcode, setAddressZipcode] = useState(ownerCompany?.addressZipcode ?? '');
  const [addressStreet, setAddressStreet] = useState(ownerCompany?.addressStreet ?? '');
  const [addressNumber, setAddressNumber] = useState(ownerCompany?.addressNumber ?? '');
  const [addressDistrict, setAddressDistrict] = useState(ownerCompany?.addressDistrict ?? '');
  const [addressCity, setAddressCity] = useState(ownerCompany?.addressCity ?? '');
  const [addressState, setAddressState] = useState(ownerCompany?.addressState ?? '');
  const [addressCountry, setAddressCountry] = useState(ownerCompany?.addressCountry ?? 'Brasil');
  const [defaultProposalNotes, setDefaultProposalNotes] = useState(ownerCompany?.defaultProposalNotes ?? '');

  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const resolveUploadsUrl = (url?: string | null): string | null => {
    if (!url) return null;
    const value = String(url);
    if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) return value;

    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    if (envUrl && !envUrl.startsWith('/')) {
      const origin = envUrl.replace(/\/?api\/?$/i, '');
      const path = value.startsWith('/') ? value : `/${value}`;
      return `${origin}${path}`;
    }

    return value;
  };

  useEffect(() => {
    setName(ownerCompany?.name ?? '');
    setDocument(ownerCompany?.document ?? '');
    setEmail(ownerCompany?.email ?? '');
    setPhone(ownerCompany?.phone ?? '');
    setSite(ownerCompany?.site ?? '');
    setAddressZipcode(ownerCompany?.addressZipcode ?? '');
    setAddressStreet(ownerCompany?.addressStreet ?? '');
    setAddressNumber(ownerCompany?.addressNumber ?? '');
    setAddressDistrict(ownerCompany?.addressDistrict ?? '');
    setAddressCity(ownerCompany?.addressCity ?? '');
    setAddressState(ownerCompany?.addressState ?? '');
    setAddressCountry(ownerCompany?.addressCountry ?? 'Brasil');
    setDefaultProposalNotes(ownerCompany?.defaultProposalNotes ?? '');
    setLogoPreview(resolveUploadsUrl(ownerCompany?.logoUrl) ?? null);
    // não zera selectedLogoFile aqui pra não perder seleção se o user ainda não salvou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerCompany?.id, ownerCompany?.updatedAt]);

  const canSave = name.trim().length >= 2;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${maxMb}MB.`);
      return;
    }

    setSelectedLogoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    toast.info('Logo selecionada. Clique em "Salvar Alterações" para enviar.');
  };

  const uploadLogo = async (file: File) => {
    if (!ownerCompany) return null;
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<OwnerCompany>(`/owner-companies/${ownerCompany.id}/logo`, form, {
      headers: { 'Content-Type': undefined } as any,
    });
    return res.data?.logoUrl ?? null;
  };

  const handleSave = async () => {
    if (!ownerCompany) return;
    if (!canSave) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    try {
      setIsSaving(true);

      // 1) Upload da logo (se alterada)
      if (selectedLogoFile) {
        setIsUploadingLogo(true);
        const newLogoUrl = await uploadLogo(selectedLogoFile);
        if (newLogoUrl) {
          setLogoPreview(resolveUploadsUrl(newLogoUrl));
        }
        setSelectedLogoFile(null);
        setIsUploadingLogo(false);
        await onReload();
      }

      // 2) Atualiza dados
      await apiClient.put(`/owner-companies/${ownerCompany.id}`, {
        name: name.trim(),
        document: document.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        site: site.trim() || undefined,

        addressZipcode: addressZipcode.trim() || undefined,
        addressStreet: addressStreet.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        addressDistrict: addressDistrict.trim() || undefined,
        addressCity: addressCity.trim() || undefined,
        addressState: addressState.trim() || undefined,
        addressCountry: addressCountry.trim() || undefined,

        defaultProposalNotes: defaultProposalNotes.trim() || undefined,
      });

      toast.success('Empresa proprietária atualizada');
      await onReload();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao salvar alterações');
    } finally {
      setIsUploadingLogo(false);
      setIsSaving(false);
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
        {/* Logo */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-12 h-12" />
            )}
          </div>
          <div>
            <input
              type="file"
              id={`owner-logo-upload-${ownerCompany.id}`}
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
  variant="outline"
  onClick={() =>
    globalThis.document
      ?.getElementById(`owner-logo-upload-${ownerCompany.id}`)
      ?.click()
  }
  disabled={isSaving || isUploadingLogo}
>
              Alterar Logo (logoUrl)
            </Button>
            {selectedLogoFile && (
              <p className="text-xs text-gray-500 mt-1">Arquivo: {selectedLogoFile.name}</p>
            )}
            {isUploadingLogo && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando logo...
              </p>
            )}
          </div>
        </div>

        {/* Dados básicos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da Empresa (name) *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>Documento (document)</Label>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CNPJ/CPF" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Telefone (phone)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Website (site)</Label>
          <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://empresa.com" />
        </div>

        {/* Endereço */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-4">Endereço</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CEP (addressZipcode)</Label>
              <Input value={addressZipcode} onChange={(e) => setAddressZipcode(e.target.value)} placeholder="00000-000" />
            </div>
            <div className="space-y-2">
              <Label>Logradouro (addressStreet)</Label>
              <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua / Avenida" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Número (addressNumber)</Label>
              <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="123" />
            </div>
            <div className="space-y-2">
              <Label>Bairro (addressDistrict)</Label>
              <Input value={addressDistrict} onChange={(e) => setAddressDistrict(e.target.value)} placeholder="Centro" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Cidade (addressCity)</Label>
              <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="Cidade" />
            </div>
            <div className="space-y-2">
              <Label>Estado (addressState)</Label>
              <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="UF" />
            </div>
            <div className="space-y-2">
              <Label>País (addressCountry)</Label>
              <Input value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} placeholder="Brasil" />
            </div>
          </div>
        </div>

        {/* Observações padrão */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-4">Observações Padrão para Propostas (defaultProposalNotes)</h3>
          <Textarea
            value={defaultProposalNotes}
            onChange={(e) => setDefaultProposalNotes(e.target.value)}
            placeholder="Texto padrão para novas propostas"
            rows={4}
          />
          <div className="text-xs text-gray-500 mt-2">Este texto será exibido por padrão em todas as novas propostas</div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
