import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Client, ClientStatus } from '../../types';
import { mockUsers, BRAZILIAN_STATES } from '../../lib/mockData';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (client: Partial<Client>) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onSave }: ClientFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Client>>({
    status: ClientStatus.LEAD,
  });

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else {
      setFormData({ status: ClientStatus.LEAD });
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.contactName || !formData.status) {
      alert('Nome do contato e status são obrigatórios');
      return;
    }

    const clientData: Partial<Client> = {
      ...formData,
      id: client?.id || `cl${Date.now()}`,
      companyId: 'c1',
      createdAt: client?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSave(clientData);
    onOpenChange(false);
  };

  const handleChange = (field: keyof Client, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Atualize as informações do cliente' : 'Adicione um novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações de Contato */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Informações de Contato</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do Contato *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName || ''}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="joao@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(11) 98765-4321"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  value={formData.role || ''}
                  onChange={(e) => handleChange('role', e.target.value)}
                  placeholder="Gerente de Marketing"
                />
              </div>
            </div>
          </div>

          {/* Informações da Empresa */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Informações da Empresa</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={formData.companyName || ''}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Empresa Ltda"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          </div>

          {/* Status e Gestão */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Status e Gestão</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleChange('status', value as ClientStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClientStatus.LEAD}>Lead</SelectItem>
                    <SelectItem value={ClientStatus.PROSPECT}>Prospect</SelectItem>
                    <SelectItem value={ClientStatus.CLIENTE}>Cliente</SelectItem>
                    <SelectItem value={ClientStatus.INATIVO}>Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="origin">Origem</Label>
                <Input
                  id="origin"
                  value={formData.origin || ''}
                  onChange={(e) => handleChange('origin', e.target.value)}
                  placeholder="Indicação, Website, LinkedIn..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerUserId">Responsável Interno</Label>
              <Select 
                value={formData.ownerUserId || 'none'} 
                onValueChange={(value) => handleChange('ownerUserId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger id="ownerUserId">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Endereço</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressZipcode">CEP</Label>
                <Input
                  id="addressZipcode"
                  value={formData.addressZipcode || ''}
                  onChange={(e) => handleChange('addressZipcode', e.target.value)}
                  placeholder="01310-100"
                />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressStreet">Rua</Label>
                <Input
                  id="addressStreet"
                  value={formData.addressStreet || ''}
                  onChange={(e) => handleChange('addressStreet', e.target.value)}
                  placeholder="Avenida Paulista"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  value={formData.addressNumber || ''}
                  onChange={(e) => handleChange('addressNumber', e.target.value)}
                  placeholder="1000"
                />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressDistrict">Bairro</Label>
                <Input
                  id="addressDistrict"
                  value={formData.addressDistrict || ''}
                  onChange={(e) => handleChange('addressDistrict', e.target.value)}
                  placeholder="Bela Vista"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">Cidade</Label>
                <Input
                  id="addressCity"
                  value={formData.addressCity || ''}
                  onChange={(e) => handleChange('addressCity', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="addressState">Estado</Label>
                <Select 
                  value={formData.addressState || ''} 
                  onValueChange={(value) => handleChange('addressState', value)}
                >
                  <SelectTrigger id="addressState">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="addressCountry">País</Label>
                <Input
                  id="addressCountry"
                  value={formData.addressCountry || ''}
                  onChange={(e) => handleChange('addressCountry', e.target.value)}
                  placeholder="Brasil"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Anotações internas sobre o cliente..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {client ? 'Atualizar Cliente' : 'Salvar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}