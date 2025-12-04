import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { User, UserRoleType, UserStatus } from '../../types';
import { CURRENT_COMPANY_ID } from '../../lib/mockDataSettings';
import { toast } from 'sonner@2.0.3';

interface UserInviteDialogProps {
  onClose: () => void;
  onInvite: (newUser: User, roles: UserRoleType[]) => void;
}

export function UserInviteDialog({ onClose, onInvite }: UserInviteDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRoleType[]>([]);

  const allRoles = [
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

  const handleInvite = () => {
    // Validações
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('Email válido é obrigatório');
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error('Selecione pelo menos um perfil');
      return;
    }

    // Criar novo usuário (INACTIVE até primeiro acesso)
    const newUser: User = {
      id: `u${Date.now()}`, // ID temporário
      companyId: CURRENT_COMPANY_ID,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: 'pending', // Será definido no primeiro acesso
      phone: phone.trim() || null,
      isSuperAdmin: false,
      twoFactorEnabled: false,
      twoFactorType: null,
      twoFactorSecret: null,
      status: UserStatus.INACTIVE, // Fica inativo até aceitar o convite
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onInvite(newUser, selectedRoles);
    toast.success(
      'Convite enviado (simulação). Usuário aparecerá como Ativo somente após primeiro acesso.'
    );
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inviteName">Nome Completo (name) *</Label>
        <Input
          id="inviteName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="João Silva"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteEmail">Email (email) * - Será usado para login</Label>
        <Input
          id="inviteEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao@empresa.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invitePhone">Telefone (phone)</Label>
        <Input
          id="invitePhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 98765-4321"
        />
      </div>

      <div className="space-y-2">
        <Label>Perfis (UserRole) * - Selecione um ou mais</Label>
        <div className="space-y-2">
          {allRoles.map((role) => (
            <div key={role.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`invite-role-${role.value}`}
                checked={selectedRoles.includes(role.value)}
                onChange={() => toggleRole(role.value)}
                className="rounded"
              />
              <Label
                htmlFor={`invite-role-${role.value}`}
                className="cursor-pointer flex-1"
              >
                <span className="text-gray-900">{role.label}</span>
                <span className="text-gray-500 text-sm ml-2">- {role.desc}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        Um email de convite será enviado com instruções para criar senha. O usuário ficará com
        status INATIVO até realizar o primeiro acesso.
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleInvite}>Enviar Convite</Button>
      </div>
    </div>
  );
}
