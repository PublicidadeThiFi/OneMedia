import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Building2, Loader2 } from 'lucide-react';
import { Company } from '../../types';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';

interface CompanySettingsProps {
  company: Company;
  onUpdateCompany: (updates: Partial<Company>) => Promise<void>;
  onRefreshCompany: () => Promise<void>;
}

export function CompanySettings({ company, onUpdateCompany, onRefreshCompany }: CompanySettingsProps) {
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [email, setEmail] = useState(company.email || '');
  const [site, setSite] = useState(company.site || '');
  // primaryColor: por hora vamos manter esse campo no backend, mas esconder na UI
  const [addressZipcode, setAddressZipcode] = useState(company.addressZipcode || '');
  const [addressStreet, setAddressStreet] = useState(company.addressStreet || '');
  const [addressNumber, setAddressNumber] = useState(company.addressNumber || '');
  const [addressDistrict, setAddressDistrict] = useState(company.addressDistrict || '');
  const [addressCity, setAddressCity] = useState(company.addressCity || '');
  const [addressState, setAddressState] = useState(company.addressState || '');
  const [addressCountry, setAddressCountry] = useState(company.addressCountry || 'Brasil');
  const [defaultProposalNotes, setDefaultProposalNotes] = useState(company.defaultProposalNotes || '');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const resolveUploadsUrl = (url?: string | null): string | null => {
    if (!url) return null;
    const value = String(url);
    if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) return value;

    // Se VITE_API_URL for uma URL absoluta (ex.: https://api.meusite.com/api),
    // precisamos montar o ORIGIN para servir /uploads no mesmo host.
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    if (envUrl && !envUrl.startsWith('/')) {
      const origin = envUrl.replace(/\/?api\/?$/i, '');
      const path = value.startsWith('/') ? value : `/${value}`;
      return `${origin}${path}`;
    }

    // Fallback: assume que /uploads é acessível na mesma origem do front (Vercel rewrites/proxy)
    return value;
  };

  // Mantém o form sincronizado quando o Company do contexto for atualizado
  useEffect(() => {
    setName(company.name);
    setCnpj(company.cnpj || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setSite(company.site || '');
    setAddressZipcode(company.addressZipcode || '');
    setAddressStreet(company.addressStreet || '');
    setAddressNumber(company.addressNumber || '');
    setAddressDistrict(company.addressDistrict || '');
    setAddressCity(company.addressCity || '');
    setAddressState(company.addressState || '');
    setAddressCountry(company.addressCountry || 'Brasil');
    setDefaultProposalNotes(company.defaultProposalNotes || '');
    setLogoPreview(resolveUploadsUrl(company.logoUrl) ?? null);
    // não zera selectedLogoFile aqui, pra não perder seleção se o user ainda não salvou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id, company.updatedAt]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info('Logo selecionada. Clique em "Salvar Alterações" para enviar.');
    }
  };

  const uploadLogo = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    // Importante: o apiClient tem Content-Type default como application/json.
    // Aqui precisamos deixar o browser setar multipart/form-data com boundary.
    const res = await apiClient.post<{ logoUrl: string }>('/company/logo', form, {
      headers: { 'Content-Type': undefined } as any,
    });
    return res.data?.logoUrl;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    try {
      setIsSaving(true);

      // 1) Upload da logo (se houve alteração)
      if (selectedLogoFile) {
        setIsUploadingLogo(true);
        const newLogoUrl = await uploadLogo(selectedLogoFile);
        if (newLogoUrl) {
          setLogoPreview(resolveUploadsUrl(newLogoUrl));
        }
        setSelectedLogoFile(null);
        setIsUploadingLogo(false);

        // Recarrega company para refletir logoUrl em todo o app
        await onRefreshCompany();
      }

      // 2) Atualiza dados básicos
      await onUpdateCompany({
        name: name.trim(),
        cnpj: cnpj.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
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

      toast.success('Dados da empresa atualizados');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao salvar alterações');
    } finally {
      setIsUploadingLogo(false);
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa (Company)</CardTitle>
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
              id="logo-upload"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('logo-upload')?.click()}
              disabled={isSaving || isUploadingLogo}
            >
              Alterar Logo (logoUrl)
            </Button>
            {selectedLogoFile && (
              <p className="text-xs text-gray-500 mt-1">
                Arquivo: {selectedLogoFile.name}
              </p>
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
            <Label htmlFor="companyName">Nome da Empresa (name) *</Label>
            <Input
              id="companyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="12.345.678/0001-90"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyPhone">Telefone (phone)</Label>
            <Input
              id="companyPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 3000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Email</Label>
            <Input
              id="companyEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site">Website (site)</Label>
          <Input
            id="site"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="https://www.empresa.com"
          />
        </div>

        {/* Cor Oficial (primaryColor) */}
        {/*
          Por hora vamos manter esse campo comentado na UI para evoluir depois com mais precisão.
        */}

        {/* Endereço */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-gray-900">Endereço</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipcode">CEP (addressZipcode)</Label>
              <Input
                id="zipcode"
                value={addressZipcode}
                onChange={(e) => setAddressZipcode(e.target.value)}
                placeholder="01310-100"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="street">Logradouro (addressStreet)</Label>
              <Input
                id="street"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Av. Paulista"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Número (addressNumber)</Label>
              <Input
                id="number"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="district">Bairro (addressDistrict)</Label>
              <Input
                id="district"
                value={addressDistrict}
                onChange={(e) => setAddressDistrict(e.target.value)}
                placeholder="Bela Vista"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade (addressCity)</Label>
              <Input
                id="city"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado (addressState)</Label>
              <Input
                id="state"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
                placeholder="SP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País (addressCountry)</Label>
              <Input
                id="country"
                value={addressCountry}
                onChange={(e) => setAddressCountry(e.target.value)}
                placeholder="Brasil"
              />
            </div>
          </div>
        </div>

        {/* Observações padrão */}
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="proposalNotes">
            Observações Padrão para Propostas (defaultProposalNotes)
          </Label>
          <Textarea
            id="proposalNotes"
            rows={4}
            value={defaultProposalNotes}
            onChange={(e) => setDefaultProposalNotes(e.target.value)}
            placeholder="Valores sujeitos a alteração sem aviso prévio. Validade da proposta: 15 dias."
          />
          <p className="text-sm text-gray-500">
            Este texto será exibido por padrão em todas as novas propostas
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isUploadingLogo}>
            {(isSaving || isUploadingLogo) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
