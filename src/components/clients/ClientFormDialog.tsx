import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
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
import { Client, ClientStatus } from '../../types';
import { mockUsers, BRAZILIAN_STATES } from '../../lib/mockData';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (client: Partial<Client>) => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
}: ClientFormDialogProps) {
  const form = useForm<Client>({
    defaultValues: client || {
      status: ClientStatus.LEAD,
      contactName: '',
      email: '',
      phone: '',
      role: '',
      companyName: '',
      cnpj: '',
      origin: '',
      ownerUserId: undefined,
      addressZipcode: '',
      addressStreet: '',
      addressNumber: '',
      addressDistrict: '',
      addressCity: '',
      addressState: '',
      addressCountry: 'Brasil',
      notes: '',
    },
  });

  useEffect(() => {
    if (client) {
      form.reset(client);
    } else {
      form.reset({ status: ClientStatus.LEAD } as any);
    }
  }, [client, form]);

  const handleSubmit = async (data: Partial<Client>) => {
    try {
      let savedClient: Client;

      if (client?.id) {
        const response = await apiClient.put<Client>(
          `/clients/${client.id}`,
          data
        );
        savedClient = response.data;
        toast.success('Cliente atualizado!');
      } else {
        const response = await apiClient.post<Client>('/clients', data);
        savedClient = response.data;
        toast.success('Cliente criado!');
      }

      onSave(savedClient);
      onOpenChange(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Erro ao salvar cliente';
      toast.error(message);
    }
  };

  const handleChange = (field: keyof Client, value: unknown) => {
    form.setValue(field as any, value as any, { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client
              ? 'Atualize as informações do cliente'
              : 'Adicione um novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          {/* Informações de Contato */}
          <div className="space-y-4">
            <h3 className="text-gray-900">Informações de Contato</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do Contato *</Label>
                <Input
                  id="contactName"
                  {...form.register('contactName', { required: true })}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="joao@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  {...form.register('role')}
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
                  {...form.register('companyName')}
                  placeholder="Empresa Ltda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  {...form.register('cnpj')}
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
                  value={form.watch('status') || ClientStatus.LEAD}
                  onValueChange={(value: string) =>
                    handleChange('status', value as ClientStatus)
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClientStatus.LEAD}>Lead</SelectItem>
                    <SelectItem value={ClientStatus.PROSPECT}>
                      Prospect
                    </SelectItem>
                    <SelectItem value={ClientStatus.CLIENTE}>
                      Cliente
                    </SelectItem>
                    <SelectItem value={ClientStatus.INATIVO}>
                      Inativo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Origem</Label>
                <Input
                  id="origin"
                  {...form.register('origin')}
                  placeholder="Indicação, Website, LinkedIn..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerUserId">Responsável Interno</Label>
              <Select
                value={form.watch('ownerUserId') || 'none'}
                onValueChange={(value: string) =>
                  handleChange(
                    'ownerUserId',
                    value === 'none' ? undefined : value
                  )
                }
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
                  {...form.register('addressZipcode')}
                  placeholder="01310-100"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressStreet">Rua</Label>
                <Input
                  id="addressStreet"
                  {...form.register('addressStreet')}
                  placeholder="Avenida Paulista"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  {...form.register('addressNumber')}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressDistrict">Bairro</Label>
                <Input
                  id="addressDistrict"
                  {...form.register('addressDistrict')}
                  placeholder="Bela Vista"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">Cidade</Label>
                <Input
                  id="addressCity"
                  {...form.register('addressCity')}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressState">Estado</Label>
                <Select
                  value={form.watch('addressState') || ''}
                  onValueChange={(value: string) =>
                    handleChange('addressState', value)
                  }
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
                  {...form.register('addressCountry')}
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
              {...form.register('notes')}
              placeholder="Anotações internas sobre o cliente..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
