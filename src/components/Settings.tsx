import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { User, UserRoleType, Company, PlatformSubscription } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyUsersWithRoles,
  getPlatformPlans,
  CompanyUserWithRoles,
  mockUsers,
  mockUserRoles,
} from '../lib/mockDataSettings';
import { updateUser as mockUpdateUser } from '../lib/mockDataCentral';
import { AccountSettings } from './settings/AccountSettings';
import { CompanySettings } from './settings/CompanySettings';
import { UsersSettings } from './settings/UsersSettings';
import { SubscriptionSettings } from './settings/SubscriptionSettings';

export function Settings() {
  // Use global contexts as single source of truth
  const { user: currentUser } = useAuth();
  const {
    company,
    subscription,
    plan,
    pointsUsed,
    updateCompanyData,
    updateSubscriptionData,
    refreshCompanyData,
  } = useCompany();

  // Local state for users management (will be moved to context later if needed)
  const [companyUsers, setCompanyUsers] = useState<CompanyUserWithRoles[]>(() =>
    company ? getCompanyUsersWithRoles(company.id) : []
  );

  const platformPlans = useMemo(() => getPlatformPlans(), []);

  // If not loaded yet, show loading
  if (!currentUser || !company || !subscription) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // Handlers - Minha Conta
  // ========================================

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      // Update via mock (in production: API call)
      await mockUpdateUser(updatedUser.id, updatedUser);

      // Update in users list
      setCompanyUsers((prev) =>
        prev.map((cu) =>
          cu.user.id === updatedUser.id ? { ...cu, user: updatedUser } : cu
        )
      );

      // Refresh auth context if this is the current user
      // In production, the AuthContext would also refresh from API
      console.log('[Settings] User updated:', updatedUser);

      // Force refresh to get updated data
      await refreshCompanyData();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  // ========================================
  // Handlers - Dados da Empresa
  // ========================================

  const handleUpdateCompany = async (updatedCompany: Partial<Company>) => {
    try {
      // Update via CompanyContext - this will propagate to all components
      await updateCompanyData(updatedCompany);
      console.log('[Settings] Company updated:', updatedCompany);
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };

  // ========================================
  // Handlers - Usuários
  // ========================================

  const handleAddUser = (newUser: User, roles: UserRoleType[]) => {
    // Add user to mock global
    mockUsers.push(newUser);

    // Add roles to mock global
    roles.forEach((role) => {
      mockUserRoles.push({ userId: newUser.id, role });
    });

    // Update local state
    setCompanyUsers((prev) => [...prev, { user: newUser, roles }]);

    // In production: API call
    console.log('[Settings] User added:', newUser, 'Roles:', roles);
  };

  const handleUpdateUserWithRoles = (updatedUser: User, roles: UserRoleType[]) => {
    // Update user in mock global
    const userIndex = mockUsers.findIndex((u) => u.id === updatedUser.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = updatedUser;
    }

    // Update roles in mock global
    const oldRoleIndexes: number[] = [];
    mockUserRoles.forEach((ur, index) => {
      if (ur.userId === updatedUser.id) {
        oldRoleIndexes.push(index);
      }
    });
    oldRoleIndexes.reverse().forEach((index) => {
      mockUserRoles.splice(index, 1);
    });

    // Add new roles
    roles.forEach((role) => {
      mockUserRoles.push({ userId: updatedUser.id, role });
    });

    // Update local state
    setCompanyUsers((prev) =>
      prev.map((cu) =>
        cu.user.id === updatedUser.id ? { user: updatedUser, roles } : cu
      )
    );

    // If this is the logged user, also update via handleUpdateUser
    if (updatedUser.id === currentUser.id) {
      handleUpdateUser(updatedUser);
    }

    // In production: API call
    console.log('[Settings] User updated:', updatedUser, 'Roles:', roles);
  };

  const handleDeleteUser = (userId: string) => {
    // Remove user from mock global
    const userIndex = mockUsers.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      mockUsers.splice(userIndex, 1);
    }

    // Remove roles from mock global
    const roleIndexes: number[] = [];
    mockUserRoles.forEach((ur, index) => {
      if (ur.userId === userId) {
        roleIndexes.push(index);
      }
    });
    roleIndexes.reverse().forEach((index) => {
      mockUserRoles.splice(index, 1);
    });

    // Update local state
    setCompanyUsers((prev) => prev.filter((cu) => cu.user.id !== userId));

    // In production: API call
    console.log('[Settings] User deleted:', userId);
  };

  // ========================================
  // Handlers - Assinatura
  // ========================================

  const handleUpdateSubscription = async (
    updatedCompanyData: Partial<Company>,
    updatedSubscriptionData: Partial<PlatformSubscription>
  ) => {
    try {
      // Update both company and subscription via contexts
      // This will propagate changes to sidebar, dashboard, etc.
      await updateCompanyData(updatedCompanyData);
      await updateSubscriptionData(updatedSubscriptionData);

      console.log('[Settings] Subscription updated:', {
        company: updatedCompanyData,
        subscription: updatedSubscriptionData,
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie conta, empresa, usuários e assinatura</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">Minha Conta</TabsTrigger>
          <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettings currentUser={currentUser} onUpdateUser={handleUpdateUser} />
        </TabsContent>

        <TabsContent value="company">
          <CompanySettings company={company} onUpdateCompany={handleUpdateCompany} />
        </TabsContent>

        <TabsContent value="users">
          <UsersSettings
            currentUserId={currentUser.id}
            companyUsers={companyUsers}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUserWithRoles}
            onDeleteUser={handleDeleteUser}
          />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionSettings
            company={company}
            subscription={subscription}
            plans={platformPlans}
            pointsUsed={pointsUsed}
            onUpdateSubscription={handleUpdateSubscription}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}