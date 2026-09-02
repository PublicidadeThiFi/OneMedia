import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useCompany } from '../contexts/CompanyContext';
import { CompanyEntitySettings } from './settings/CompanyEntitySettings';
import { SubscriptionSettings } from './settings/SubscriptionSettings';
import { UserProfileSettings } from './settings/UserProfileSettings';
import { usePublicPricingCatalog } from '../hooks/usePublicPricingCatalog';

const getInitialTab = () => {
  if (typeof window === 'undefined') return 'company';
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'subscription' || tab === 'company' || tab === 'profile') return tab;
  return 'company';
};

export function Settings() {
  const { company, subscription, pointsUsed, updateCompanyData, refreshCompanyData, isLoading } = useCompany();
  const { catalog: pricingCatalog, loading: pricingCatalogLoading, error: pricingCatalogError } = usePublicPricingCatalog();
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
      <Card data-tour="settings-preferences">
        <CardHeader data-tour="settings-users">
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company" data-tour="settings-company">Empresa</TabsTrigger>
              <TabsTrigger value="subscription" data-tour="settings-subscription">Assinatura</TabsTrigger>
              <TabsTrigger value="profile" data-tour="settings-profile">Perfil</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="mt-6">
              <div className="space-y-6">
                <CompanyEntitySettings company={company} onUpdateCompany={updateCompanyData} onRefreshCompany={refreshCompanyData} />
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="mt-6">
              <SubscriptionSettings
                company={company}
                subscription={subscription}
                pointsUsed={pointsUsed}
                pricingCatalog={pricingCatalog}
                pricingCatalogLoading={pricingCatalogLoading}
                pricingCatalogError={pricingCatalogError}
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
