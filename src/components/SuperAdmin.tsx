import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Building, DollarSign, FileText, TrendingUp, Search, Plus, Eye, Edit } from 'lucide-react';
import { CompanySubscriptionStatus, PlatformSubscriptionStatus } from '../types';

interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  plan: string;
  pointsLimit: number;
  pointsUsed: number;
  subscriptionStatus: CompanySubscriptionStatus;
  trialEndsAt?: Date;
  monthlyAmount: number;
}

const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'OOH Mídia SP',
    cnpj: '12.345.678/0001-90',
    email: 'contato@oohmidiasp.com',
    plan: 'Profissional',
    pointsLimit: 150,
    pointsUsed: 87,
    subscriptionStatus: CompanySubscriptionStatus.ACTIVE,
    monthlyAmount: 699,
  },
  {
    id: '2',
    name: 'Digital Out RJ',
    cnpj: '98.765.432/0001-10',
    email: 'contato@digitaloutrj.com',
    plan: 'Básico',
    pointsLimit: 50,
    pointsUsed: 45,
    subscriptionStatus: CompanySubscriptionStatus.TRIAL,
    trialEndsAt: new Date('2024-04-15'),
    monthlyAmount: 299,
  },
  {
    id: '3',
    name: 'Mega Painéis',
    cnpj: '11.222.333/0001-44',
    email: 'contato@megapaineis.com',
    plan: 'Enterprise',
    pointsLimit: 500,
    pointsUsed: 320,
    subscriptionStatus: CompanySubscriptionStatus.ACTIVE,
    monthlyAmount: 1499,
  },
];

export function SuperAdmin() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCompanies = mockCompanies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.cnpj?.includes(searchQuery) ?? false) ||
    (company.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getStatusColor = (status: CompanySubscriptionStatus) => {
    switch (status) {
      case CompanySubscriptionStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case CompanySubscriptionStatus.TRIAL: return 'bg-blue-100 text-blue-800';
      case CompanySubscriptionStatus.PAST_DUE: return 'bg-orange-100 text-orange-800';
      case CompanySubscriptionStatus.CANCELED: return 'bg-red-100 text-red-800';
    }
  };

  const getStatusLabel = (status: CompanySubscriptionStatus) => {
    switch (status) {
      case CompanySubscriptionStatus.ACTIVE: return 'Ativa';
      case CompanySubscriptionStatus.TRIAL: return 'Trial';
      case CompanySubscriptionStatus.PAST_DUE: return 'Em Atraso';
      case CompanySubscriptionStatus.CANCELED: return 'Cancelada';
    }
  };

  const totalMRR = mockCompanies
    .filter(c => c.subscriptionStatus === CompanySubscriptionStatus.ACTIVE)
    .reduce((sum, c) => sum + c.monthlyAmount, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-red-100 text-red-600 p-2 rounded-lg">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-gray-900">Super Admin</h1>
            <p className="text-gray-600">Gestão da Plataforma SaaS</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Empresas Ativas</p>
            </div>
            <p className="text-gray-900">
              {mockCompanies.filter(c => c.subscriptionStatus === CompanySubscriptionStatus.ACTIVE).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">MRR Total</p>
            </div>
            <p className="text-gray-900">R$ {totalMRR.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">Em Trial</p>
            </div>
            <p className="text-gray-900">
              {mockCompanies.filter(c => c.subscriptionStatus === CompanySubscriptionStatus.TRIAL).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-gray-600 text-sm">NFs Emitidas (Mês)</p>
            </div>
            <p className="text-gray-900">12</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="invoices">Cobranças</TabsTrigger>
          <TabsTrigger value="nf">Notas Fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Empresas Cadastradas</CardTitle>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Empresa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, CNPJ ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Empresa</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Contato</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Plano</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Pontos</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Valor/Mês</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-900">{company.name}</p>
                            {company.cnpj && (
                              <p className="text-gray-500 text-sm">{company.cnpj}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 text-sm">{company.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{company.plan}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">
                              {company.pointsUsed} / {company.pointsLimit}
                            </span>
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{
                                  width: `${(company.pointsUsed / company.pointsLimit) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(company.subscriptionStatus)}>
                            {getStatusLabel(company.subscriptionStatus)}
                          </Badge>
                          {company.subscriptionStatus === CompanySubscriptionStatus.TRIAL && company.trialEndsAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expira em {new Date(company.trialEndsAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">
                            R$ {company.monthlyAmount.toLocaleString('pt-BR')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos da Plataforma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Básico', minPoints: 0, maxPoints: 50, price: 299 },
                  { name: 'Profissional', minPoints: 50, maxPoints: 150, price: 699 },
                  { name: 'Enterprise', minPoints: 150, maxPoints: 500, price: 1499 },
                ].map((plan) => (
                  <Card key={plan.name}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-gray-900 mb-1">{plan.name}</h3>
                          <p className="text-gray-600 text-sm">
                            {plan.minPoints === 0 ? 'Até' : `${plan.minPoints} -`} {plan.maxPoints} pontos
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900">
                            R$ {plan.price.toLocaleString('pt-BR')}<span className="text-gray-600 text-sm">/mês</span>
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Cobranças da Plataforma</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-12">
                Lista de cobranças (PlatformInvoice) das empresas assinantes
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nf">
          <Card>
            <CardHeader>
              <CardTitle>Notas Fiscais da Plataforma</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-12">
                NFs da plataforma emitidas para empresas (PlatformNf)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
