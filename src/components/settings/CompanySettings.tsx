import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Building2 } from 'lucide-react';
import { Company } from '../../types';
import { toast } from 'sonner';

interface CompanySettingsProps {
  company: Company;
  onUpdateCompany: (updatedCompany: Company) => void;
}

export function CompanySettings({ company, onUpdateCompany }: CompanySettingsProps) {
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [email, setEmail] = useState(company.email || '');
  const [site, setSite] = useState(company.site || '');
  const [primaryColor, setPrimaryColor] = useState(company.primaryColor || '#4f46e5');
  const [addressZipcode, setAddressZipcode] = useState(company.addressZipcode || '');
  const [addressStreet, setAddressStreet] = useState(company.addressStreet || '');
  const [addressNumber, setAddressNumber] = useState(company.addressNumber || '');
  const [addressDistrict, setAddressDistrict] = useState(company.addressDistrict || '');
  const [addressCity, setAddressCity] = useState(company.addressCity || '');
  const [addressState, setAddressState] = useState(company.addressState || '');
  const [addressCountry, setAddressCountry] = useState(company.addressCountry || 'Brasil');
  const [defaultProposalNotes, setDefaultProposalNotes] = useState(company.defaultProposalNotes || '');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logoUrl ?? null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      setSelectedLogoFile(file);

      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info(
        'Logo selecionada. Na versão real, o upload será via S3 com URL pré-assinada e logoUrl será salvo na Company.'
      );
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    const updatedCompany: Company = {
      ...company,
      name: name.trim(),
      cnpj: cnpj.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      site: site.trim() || undefined,
      primaryColor: primaryColor || undefined,
      addressZipcode: addressZipcode.trim() || undefined,
      addressStreet: addressStreet.trim() || undefined,
      addressNumber: addressNumber.trim() || undefined,
      addressDistrict: addressDistrict.trim() || undefined,
      addressCity: addressCity.trim() || undefined,
      addressState: addressState.trim() || undefined,
      addressCountry: addressCountry.trim() || undefined,
      defaultProposalNotes: defaultProposalNotes.trim() || undefined,
      // logoUrl seria atualizada após upload real
      updatedAt: new Date(),
    };

    onUpdateCompany(updatedCompany);
    toast.success('Dados da empresa atualizados (simulação em memória)');
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
            >
              Alterar Logo (logoUrl)
            </Button>
            {selectedLogoFile && (
              <p className="text-xs text-gray-500 mt-1">
                Arquivo: {selectedLogoFile.name}
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

        {/* Cor Primária */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor Oficial (primaryColor)</Label>
          <div className="flex items-center gap-4">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#4f46e5"
              className="flex-1"
            />
          </div>
        </div>

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
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </CardContent>
    </Card>
  );
}
