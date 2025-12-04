import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { User, UserRoleType, UserStatus, TwoFactorType } from '../../types';
import { CompanyUserWithRoles } from '../../lib/mockDataSettings';
import { UserInviteDialog } from './UserInviteDialog';
import { UserEditDialog } from './UserEditDialog';
import { toast } from 'sonner@2.0.3';

interface UsersSettingsProps {
  currentUserId: string;
  companyUsers: CompanyUserWithRoles[];
  onAddUser: (newUser: User, roles: UserRoleType[]) => void;
  onUpdateUser: (updatedUser: User, roles: UserRoleType[]) => void;
  onDeleteUser: (userId: string) => void;
}

export function UsersSettings({
  currentUserId,
  companyUsers,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UsersSettingsProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUserWithRoles | null>(null);
  const [deletingUser, setDeletingUser] = useState<CompanyUserWithRoles | null>(null);

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

  const handleDelete = (userWithRoles: CompanyUserWithRoles) => {
    const { user, roles } = userWithRoles;

    // Validação: não pode excluir o próprio usuário
    if (user.id === currentUserId) {
      toast.error('Você não pode excluir seu próprio usuário.');
      return;
    }

    // Validação: não pode excluir o último ADMINISTRATIVO
    const isAdmin = roles.includes(UserRoleType.ADMINISTRATIVO);
    if (isAdmin) {
      const adminCount = companyUsers.filter((cu) =>
        cu.roles.includes(UserRoleType.ADMINISTRATIVO)
      ).length;

      if (adminCount <= 1) {
        toast.error('Não é possível excluir o último usuário Administrativo da empresa.');
        return;
      }
    }

    setDeletingUser(userWithRoles);
  };

  const confirmDelete = () => {
    if (deletingUser) {
      onDeleteUser(deletingUser.user.id);
      toast.success(`Usuário ${deletingUser.user.name} excluído com sucesso.`);
      setDeletingUser(null);
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
                <UserInviteDialog
                  onClose={() => setIsInviteDialogOpen(false)}
                  onInvite={onAddUser}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companyUsers.map((userWithRoles) => {
              const { user, roles } = userWithRoles;

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
                          onClick={() => setEditingUser(userWithRoles)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(userWithRoles)}
                        >
                          <Trash2 className="w-4 h-4" />
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
          userWithRoles={editingUser}
          currentUserId={currentUserId}
          allUsers={companyUsers}
          onClose={() => setEditingUser(null)}
          onUpdate={onUpdateUser}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      {deletingUser && (
        <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">
                Tem certeza que deseja excluir o usuário{' '}
                <strong>{deletingUser.user.name}</strong>?
              </p>
              <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setDeletingUser(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Excluir Usuário
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
