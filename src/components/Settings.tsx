import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useCompany } from '../contexts/CompanyContext';
import { CompanySettings } from './settings/CompanySettings';
import { OwnerCompaniesSettings } from './settings/OwnerCompaniesSettings';
import { SubscriptionSettings } from './settings/SubscriptionSettings';
import { UserProfileSettings } from './settings/UserProfileSettings';
import { usePlatformPlans } from '../hooks/usePlatformPlans';

const getInitialTab = () => {
  if (typeof window === 'undefined') return 'company';
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'subscription' || tab === 'company' || tab === 'profile') return tab;
  return 'company';
};

export function Settings() {
  const { company, subscription, pointsUsed, updateCompanyData, updateSubscriptionData, refreshCompanyData, isLoading } = useCompany();
  const { plans, loading: plansLoading, error: plansError } = usePlatformPlans();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const currentSearch = typeof window === 'undefined' ? '' : window.location.search;

  useEffect(() => {
    const tab = new URLSearchParams(currentSearch).get('tab');
    if (tab === 'subscription' || tab === 'company' || tab === 'profile') {
      setActiveTab(tab);
    }
  }, [currentSearch]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando configurações...
        </CardContent>
      </Card>
    );
  }

  if (!company || !subscription) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Não foi possível carregar os dados da empresa.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="subscription">Assinatura</TabsTrigger>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="mt-6">
              <div className="space-y-6">
                <CompanySettings company={company} onUpdateCompany={updateCompanyData} onRefreshCompany={refreshCompanyData} />
                <OwnerCompaniesSettings />
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="mt-6">
              {plansError && (
                <div className="text-sm text-red-600 mb-3">{String(plansError)}</div>
              )}
              <SubscriptionSettings
                company={company}
                subscription={subscription}
                plans={plans}
                plansLoading={plansLoading}
                pointsUsed={pointsUsed}
                onUpdateSubscription={async (updates) => {
                  await updateSubscriptionData(updates as any);
                }}
              />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <UserProfileSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
