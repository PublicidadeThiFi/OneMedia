import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { User, Company, PlatformSubscription } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { getPlatformPlans } from '../lib/mockDataSettings';
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

  // Users are now managed inside UsersSettings via useUsers hook

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

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    try {
      // Update via mock (in production: API call)
      await mockUpdateUser(id, updates);

      // Refresh auth context if this is the current user
      // In production, the AuthContext would also refresh from API
      console.log('[Settings] User updated:', { id, updates });

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

  // Users handlers removed: now handled by useUsers inside UsersSettings

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
          <UsersSettings />
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