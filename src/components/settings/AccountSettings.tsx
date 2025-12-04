import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User, Shield } from 'lucide-react';
import { TwoFactorType, User as UserType } from '../../types';
import { toast } from 'sonner@2.0.3';

interface AccountSettingsProps {
  currentUser: UserType;
  onUpdateUser: (updatedUser: UserType) => void;
}

export function AccountSettings({ currentUser, onUpdateUser }: AccountSettingsProps) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentUser.twoFactorEnabled);
  const [twoFactorType, setTwoFactorType] = useState<TwoFactorType>(
    currentUser.twoFactorType || TwoFactorType.TOTP
  );
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      setSelectedPhotoFile(file);
      
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.info(
        'Foto selecionada. Na versão real, o upload será via S3 com URL pré-assinada (backend gera pre-signed URL, front não acessa chaves S3).'
      );
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const updatedUser: UserType = {
      ...currentUser,
      name: name.trim(),
      phone: phone.trim() || null,
      twoFactorEnabled,
      twoFactorType: twoFactorEnabled ? twoFactorType : null,
      twoFactorSecret: twoFactorEnabled ? currentUser.twoFactorSecret || 'secret_new' : null,
      updatedAt: new Date(),
    };

    onUpdateUser(updatedUser);
    toast.success('Dados da conta atualizados (simulação em memória)');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações da Conta (User)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Foto de perfil */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12" />
            )}
          </div>
          <div>
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              Alterar Foto
            </Button>
            {selectedPhotoFile && (
              <p className="text-xs text-gray-500 mt-1">
                Arquivo: {selectedPhotoFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Dados básicos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo (name) *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (phone)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
        </div>

        {/* Email (readonly) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email (email) - Não editável</Label>
          <Input id="email" value={currentUser.email} disabled />
          <p className="text-sm text-gray-500">Email não pode ser alterado</p>
        </div>

        {/* 2FA */}
        <div className="border-t pt-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança - Autenticação de 2 Fatores (2FA)
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-gray-900 mb-1">2FA Habilitado (twoFactorEnabled)</p>
                <p className="text-sm text-gray-600">
                  Adicione uma camada extra de segurança
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>

            {twoFactorEnabled && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorType">Tipo de 2FA (twoFactorType)</Label>
                <Select value={twoFactorType} onValueChange={(v) => setTwoFactorType(v as TwoFactorType)}>
                  <SelectTrigger id="twoFactorType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TwoFactorType.TOTP}>
                      App Autenticador (TOTP)
                    </SelectItem>
                    <SelectItem value={TwoFactorType.EMAIL}>Email</SelectItem>
                    <SelectItem value={TwoFactorType.SMS}>SMS</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {twoFactorType === TwoFactorType.TOTP &&
                    'Recomendado: Use Google Authenticator, Microsoft Authenticator ou similar. Após login com email/senha, será solicitado código de 6 dígitos gerado pelo app.'}
                  {twoFactorType === TwoFactorType.EMAIL &&
                    'Um código de 6 dígitos será enviado para seu email a cada login.'}
                  {twoFactorType === TwoFactorType.SMS &&
                    'Um código de 6 dígitos será enviado via SMS para seu telefone a cada login.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </CardContent>
    </Card>
  );
}
