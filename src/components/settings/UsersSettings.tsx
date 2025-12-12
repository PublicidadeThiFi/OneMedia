import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Plus, Edit } from 'lucide-react';
import { User, UserRoleType, UserStatus, TwoFactorType } from '../../types';
import { UserInviteDialog } from './UserInviteDialog';
import { UserEditDialog } from './UserEditDialog';
import { toast } from 'sonner';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';

export function UsersSettings() {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { users, loading, error, refetch, inviteUser, updateUser, updateUserStatus, updateUserRoles } = useUsers({ search: debouncedSearch });
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserRoles, setEditingUserRoles] = useState<UserRoleType[]>([]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const getRoleColor = (role: UserRoleType): string => {
    switch (role) {
      case UserRoleType.ADMINISTRATIVO:
        return 'bg-red-100 text-red-800';
      case UserRoleType.FINANCEIRO:
        return 'bg-green-100 text-green-800';
      case UserRoleType.COMERCIAL:
        return 'bg-blue-100 text-blue-800';
      case UserRoleType.TI:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const getRoleLabel = (role: UserRoleType): string => {
    switch (role) {
      case UserRoleType.ADMINISTRATIVO:
        return 'Administrativo';
      case UserRoleType.FINANCEIRO:
        return 'Financeiro';
      case UserRoleType.COMERCIAL:
        return 'Comercial';
      case UserRoleType.TI:
        return 'TI';
    }
  };

  const getTwoFactorTypeLabel = (type?: TwoFactorType): string => {
    if (!type) return '-';
    switch (type) {
      case TwoFactorType.TOTP:
        return 'TOTP';
      case TwoFactorType.EMAIL:
        return 'Email';
      case TwoFactorType.SMS:
        return 'SMS';
    }
  };

  const handleInviteSave = async (data: { user: Partial<User>; roles: UserRoleType[] }) => {
    try {
      if (!data.user.name || !data.user.email) {
        toast.error('Nome e email são obrigatórios');
        return;
      }
      if (!data.roles || data.roles.length === 0) {
        toast.error('Selecione pelo menos um perfil');
        return;
      }
      const created = await inviteUser(data.user);
      if (data.roles && data.roles.length > 0) {
        await updateUserRoles(created.id, data.roles);
      }
      toast.success('Convite enviado com sucesso.');
      setIsInviteDialogOpen(false);
      await refetch();
    } catch (e) {
      toast.error('Falha ao convidar usuário.');
    }
  };

  const handleEditSave = async (
    payload: { updates: Partial<User>; status?: UserStatus; roles: UserRoleType[] }
  ) => {
    try {
      if (!editingUser) return;
      const targetId = editingUser.id;

      // Last-admin guard: prevent removing ADMINISTRATIVO if it would leave zero
      const previousHadAdmin = editingUserRoles.includes(UserRoleType.ADMINISTRATIVO);
      const nextHasAdmin = payload.roles.includes(UserRoleType.ADMINISTRATIVO);
      if (previousHadAdmin && !nextHasAdmin) {
        const adminCount = users.reduce((acc, u) => {
          const roles: UserRoleType[] = (((u as unknown) as any).roles || []) as UserRoleType[];
          return acc + (roles.includes(UserRoleType.ADMINISTRATIVO) ? 1 : 0);
        }, 0);
        if (adminCount <= 1) {
          toast.error('Não é possível remover o último usuário Administrativo da empresa.');
          return;
        }
      }

      if (payload.status && payload.status !== editingUser.status) {
        if (targetId === currentUserId && payload.status === UserStatus.INACTIVE) {
          toast.error('Você não pode desativar seu próprio usuário.');
          return;
        }
        await updateUserStatus(targetId, payload.status);
      }

      const { updates } = payload;
      if (updates && Object.keys(updates).length > 0) {
        await updateUser(targetId, updates);
      }

      if (payload.roles) {
        await updateUserRoles(targetId, payload.roles);
      }

      toast.success('Usuário atualizado com sucesso.');
      setEditingUser(null);
      await refetch();
    } catch (e) {
      toast.error('Falha ao atualizar usuário.');
    }
  };

  const toggleUserStatus = async (u: User) => {
    try {
      if (u.id === currentUserId && u.status === UserStatus.ACTIVE) {
        toast.error('Você não pode desativar seu próprio usuário.');
        return;
      }
      const newStatus = u.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
      await updateUserStatus(u.id, newStatus);
      toast.success(`Usuário ${newStatus === UserStatus.ACTIVE ? 'ativado' : 'desativado'}.`);
      await refetch();
    } catch (e) {
      toast.error('Falha ao alterar status do usuário.');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuários da Empresa (User + UserRole)</CardTitle>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Usuário</DialogTitle>
                </DialogHeader>
                <UserInviteDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} onSave={handleInviteSave} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Buscar por nome ou email"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          {loading && (
            <div className="p-3 mb-4 rounded bg-gray-50 text-gray-700">Carregando usuários...</div>
          )}
          {error && (
            <div className="p-3 mb-4 rounded bg-red-50 text-red-700">Erro ao carregar usuários.</div>
          )}
          <div className="space-y-4">
            {users.map((user) => {
              const roles: UserRoleType[] = (((user as unknown) as any).roles || []) as UserRoleType[];

              return (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-gray-900">{user.name}</h4>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            {user.phone && (
                              <p className="text-sm text-gray-500">{user.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600">Perfis (UserRole):</span>
                          {roles.map((role) => (
                            <Badge key={role} className={getRoleColor(role)}>
                              {getRoleLabel(role)}
                            </Badge>
                          ))}
                          {roles.length === 0 && (
                            <span className="text-sm text-gray-500">Sem perfis definidos</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Status: </span>
                            <Badge
                              className={
                                user.status === UserStatus.ACTIVE
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {user.status === UserStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-600">2FA: </span>
                            {user.twoFactorEnabled ? (
                              <Badge className="bg-green-100 text-green-800">
                                Habilitado ({getTwoFactorTypeLabel(user.twoFactorType)})
                              </Badge>
                            ) : (
                              <Badge variant="outline">Desabilitado</Badge>
                            )}
                          </div>
                        </div>

                        {user.lastLoginAt && (
                          <p className="text-xs text-gray-500">
                            Último acesso:{' '}
                            {new Date(user.lastLoginAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingUser(user); setEditingUserRoles(roles); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleUserStatus(user)}>
                          {user.status === UserStatus.ACTIVE ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">💡 Perfis de Usuário (UserRole)</p>
            <p className="text-sm text-blue-700">
              <strong>ADMINISTRATIVO:</strong> Configura empresa, inventário, Mídia Kit, gerencia
              usuários
              <br />
              <strong>FINANCEIRO:</strong> Acesso total ao módulo Financeiro (Cobranças, Fluxo de
              Caixa, Relatórios)
              <br />
              <strong>COMERCIAL:</strong> Propostas, Clientes, Campanhas, Mensagens, Reservas
              <br />
              <strong>TI:</strong> Integrações (API, Webhooks, WhatsApp), logs técnicos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      {editingUser && (
        <UserEditDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          currentRoles={((((editingUser as unknown) as any).roles) || []) as UserRoleType[]}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}
