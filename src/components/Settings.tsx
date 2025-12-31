import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useCompany } from '../contexts/CompanyContext';
import { CompanySettings } from './settings/CompanySettings';
import { SubscriptionSettings } from './settings/SubscriptionSettings';
import { UserProfileSettings } from './settings/UserProfileSettings';
import { usePlatformPlans } from '../hooks/usePlatformPlans';

export function Settings() {
  const { company, subscription, pointsUsed, updateCompanyData, updateSubscriptionData, isLoading } = useCompany();
  const { plans, loading: plansLoading, error: plansError } = usePlatformPlans();
  const [activeTab, setActiveTab] = useState('company');

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
              <CompanySettings company={company} onUpdateCompany={updateCompanyData} />
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
