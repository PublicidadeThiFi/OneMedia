import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User, UserRoleType, UserStatus, TwoFactorType } from '../../types';
import { CompanyUserWithRoles } from '../../lib/mockDataSettings';
import { toast } from 'sonner@2.0.3';

interface UserEditDialogProps {
  userWithRoles: CompanyUserWithRoles;
  currentUserId: string;
  allUsers: CompanyUserWithRoles[];
  onClose: () => void;
  onUpdate: (updatedUser: User, roles: UserRoleType[]) => void;
}

export function UserEditDialog({
  userWithRoles,
  currentUserId,
  allUsers,
  onClose,
  onUpdate,
}: UserEditDialogProps) {
  const { user, roles: initialRoles } = userWithRoles;

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [status, setStatus] = useState(user.status);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled);
  const [twoFactorType, setTwoFactorType] = useState<TwoFactorType>(
    user.twoFactorType || TwoFactorType.TOTP
  );
  const [selectedRoles, setSelectedRoles] = useState<UserRoleType[]>(initialRoles);

  const allRoleOptions = [
    {
      value: UserRoleType.ADMINISTRATIVO,
      label: 'Administrativo',
      desc: 'Acesso total',
    },
    {
      value: UserRoleType.FINANCEIRO,
      label: 'Financeiro',
      desc: 'Cobranças e Fluxo de Caixa',
    },
    {
      value: UserRoleType.COMERCIAL,
      label: 'Comercial',
      desc: 'Propostas e Clientes',
    },
    {
      value: UserRoleType.TI,
      label: 'TI',
      desc: 'Integrações e APIs',
    },
  ];

  const toggleRole = (role: UserRoleType) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = () => {
    // Validações
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error('Selecione pelo menos um perfil');
      return;
    }

    // Validação: não pode remover ADMINISTRATIVO se for o último admin
    const hadAdmin = initialRoles.includes(UserRoleType.ADMINISTRATIVO);
    const hasAdmin = selectedRoles.includes(UserRoleType.ADMINISTRATIVO);

    if (hadAdmin && !hasAdmin) {
      const adminCount = allUsers.filter((cu) =>
        cu.roles.includes(UserRoleType.ADMINISTRATIVO)
      ).length;

      if (adminCount <= 1) {
        toast.error(
          'Não é possível remover o perfil Administrativo do último usuário com esse perfil.'
        );
        return;
      }
    }

    const updatedUser: User = {
      ...user,
      name: name.trim(),
      phone: phone.trim() || null,
      status,
      twoFactorEnabled,
      twoFactorType: twoFactorEnabled ? twoFactorType : null,
      twoFactorSecret: twoFactorEnabled ? user.twoFactorSecret || 'secret_new' : null,
      updatedAt: new Date(),
    };

    onUpdate(updatedUser, selectedRoles);
    toast.success(`Usuário ${updatedUser.name} atualizado com sucesso.`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nome Completo (name) *</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefone (phone)</Label>
              <Input
                id="editPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="editEmail">Email (email) - Não editável</Label>
            <Input id="editEmail" value={user.email} disabled />
            <p className="text-xs text-gray-500">Email não pode ser alterado</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="editStatus">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
              <SelectTrigger id="editStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserStatus.ACTIVE}>Ativo</SelectItem>
                <SelectItem value={UserStatus.INACTIVE}>Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Perfis */}
          <div className="space-y-2">
            <Label>Perfis (UserRole) * - Selecione um ou mais</Label>
            <div className="space-y-2">
              {allRoleOptions.map((role) => (
                <div key={role.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                    className="rounded"
                  />
                  <Label
                    htmlFor={`edit-role-${role.value}`}
                    className="cursor-pointer flex-1"
                  >
                    <span className="text-gray-900">{role.label}</span>
                    <span className="text-gray-500 text-sm ml-2">- {role.desc}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 2FA */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-gray-900 mb-1">2FA Habilitado (twoFactorEnabled)</p>
                <p className="text-sm text-gray-600">Autenticação de 2 Fatores</p>
              </div>
              <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
            </div>

            {twoFactorEnabled && (
              <div className="space-y-2">
                <Label htmlFor="editTwoFactorType">Tipo de 2FA (twoFactorType)</Label>
                <Select
                  value={twoFactorType}
                  onValueChange={(v) => setTwoFactorType(v as TwoFactorType)}
                >
                  <SelectTrigger id="editTwoFactorType">
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
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
