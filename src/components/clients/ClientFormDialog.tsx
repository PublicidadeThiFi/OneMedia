import { useEffect, useMemo } from 'react';
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
import { BRAZILIAN_STATES } from '../../lib/mockData';
import apiClient from '../../lib/apiClient';
import { toast } from 'sonner';
import { useClientOwners } from '../../hooks/useClientOwners';

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
  const { owners, loading: ownersLoading } = useClientOwners();

  const defaultValues = useMemo(
    () => ({
      status: ClientStatus.LEAD,
      contactName: '',
      email: '',
      phone: '',
      role: '',
      companyName: '',
      cnpj: '',
      origin: '',
      ownerUserId: undefined as string | undefined,
      addressZipcode: '',
      addressStreet: '',
      addressNumber: '',
      addressDistrict: '',
      addressCity: '',
      addressState: '',
      addressCountry: 'Brasil',
      notes: '',
    }),
    [],
  );

  const form = useForm<Client>({
    defaultValues: (client as any) || (defaultValues as any),
  });

  useEffect(() => {
    if (client) form.reset(client as any);
    else form.reset(defaultValues as any);
  }, [client, form, defaultValues]);

  const handleChange = (field: keyof Client, value: unknown) => {
    form.setValue(field as any, value as any, { shouldDirty: true });
  };

  const toOptionalString = (v: unknown) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v !== 'string') return String(v);
    const t = v.trim();
    return t.length ? t : undefined;
  };

  const normalizePayload = (data: Partial<Client>) => {
    const contactName = toOptionalString((data as any).contactName ?? (data as any).name);
    if (!contactName) throw new Error('Informe o Nome do Contato.');

    const payload: any = {
      contactName,
      name: contactName, // compat
      status: (data as any).status ?? ClientStatus.LEAD,

      email: toOptionalString((data as any).email),
      phone: toOptionalString((data as any).phone),
      role: toOptionalString((data as any).role),
      companyName: toOptionalString((data as any).companyName),
      cnpj: toOptionalString((data as any).cnpj),
      origin: toOptionalString((data as any).origin),
      notes: toOptionalString((data as any).notes),

      addressZipcode: toOptionalString((data as any).addressZipcode),
      addressStreet: toOptionalString((data as any).addressStreet),
      addressNumber: toOptionalString((data as any).addressNumber),
      addressDistrict: toOptionalString((data as any).addressDistrict),
      addressCity: toOptionalString((data as any).addressCity),
      addressState: toOptionalString((data as any).addressState),
      addressCountry: toOptionalString((data as any).addressCountry) ?? 'Brasil',

      ownerUserId: toOptionalString((data as any).ownerUserId),
    };

    // remove undefined
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    return payload;
  };

  const onSubmit = async (data: Partial<Client>) => {
    try {
      const payload = normalizePayload(data);

      let savedClient: Client;

      if (client?.id) {
        const response = await apiClient.put<Client>(`/clients/${client.id}`, payload);
        savedClient = response.data;
        toast.success('Cliente atualizado!');
      } else {
        const response = await apiClient.post<Client>('/clients', payload);
        savedClient = response.data;
        toast.success('Cliente criado!');
      }

      onSave(savedClient);
      onOpenChange(false);
    } catch (error: any) {
      const apiMsg = error?.response?.data?.message;
      const msg =
        Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg || error?.message || 'Erro ao salvar cliente';
      toast.error(msg);
      // eslint-disable-next-line no-console
      console.error('Erro ao salvar cliente:', error?.response?.data || error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {client ? 'Atualize as informações do cliente' : 'Adicione um novo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Input id="phone" {...form.register('phone')} placeholder="(11) 98765-4321" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input id="role" {...form.register('role')} placeholder="Gerente de Marketing" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900">Informações da Empresa</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input id="companyName" {...form.register('companyName')} placeholder="Empresa Ltda" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" {...form.register('cnpj')} placeholder="00.000.000/0000-00" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900">Status e Gestão</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={(form.watch('status') as any) || ClientStatus.LEAD}
                  onValueChange={(value: string) =>
                    handleChange('status', value as ClientStatus)
                  }
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
                <Input id="origin" {...form.register('origin')} placeholder="Indicação, Website..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerUserId">Responsável Interno</Label>
              <Select
                value={(form.watch('ownerUserId') as any) || 'none'}
                onValueChange={(value: string) =>
                  handleChange('ownerUserId', value === 'none' ? undefined : value)
                }
              >
                <SelectTrigger id="ownerUserId">
                  <SelectValue placeholder={ownersLoading ? 'Carregando...' : 'Selecione um responsável'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {owners.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900">Endereço</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressZipcode">CEP</Label>
                <Input id="addressZipcode" {...form.register('addressZipcode')} placeholder="01310-100" />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressStreet">Rua</Label>
                <Input id="addressStreet" {...form.register('addressStreet')} placeholder="Av. Paulista" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input id="addressNumber" {...form.register('addressNumber')} placeholder="1000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressDistrict">Bairro</Label>
                <Input id="addressDistrict" {...form.register('addressDistrict')} placeholder="Bela Vista" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressCity">Cidade</Label>
                <Input id="addressCity" {...form.register('addressCity')} placeholder="São Paulo" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressState">Estado</Label>
                <Select
                  value={(form.watch('addressState') as any) || ''}
                  onValueChange={(value: string) => handleChange('addressState', value)}
                >
                  <SelectTrigger id="addressState">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressCountry">País</Label>
                <Input id="addressCountry" {...form.register('addressCountry')} placeholder="Brasil" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea id="notes" {...form.register('notes')} placeholder="Anotações internas..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Salvando...'
                : client
                  ? 'Atualizar Cliente'
                  : 'Salvar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
