import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Campaign, CampaignStatus } from '../types';
import { useCampaigns } from '../hooks/useCampaigns';
import { CampaignList } from './campaigns/CampaignList';
import { CampaignInstallationsView } from './campaigns/CampaignInstallationsView';
import { CampaignDetailsDrawer } from './campaigns/CampaignDetailsDrawer';
import { CampaignCheckInDialog } from './campaigns/CampaignCheckInDialog';
import { CampaignReportDialog } from './campaigns/CampaignReportDialog';
import { CampaignBillingDrawer } from './campaigns/CampaignBillingDrawer';

export function Campaigns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { campaigns, total, loading, error, refetch, createCampaign, updateCampaign } = useCampaigns({
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as CampaignStatus | string),
  });

  // Dialogs e Drawers
  const [detailsDrawerCampaign, setDetailsDrawerCampaign] = useState<Campaign | null>(null);
  const [detailsDrawerTab, setDetailsDrawerTab] = useState<string>('summary');
  const [checkInDialogCampaign, setCheckInDialogCampaign] = useState<Campaign | null>(null);
  const [reportDialogCampaign, setReportDialogCampaign] = useState<Campaign | null>(null);
  const [billingDrawerCampaign, setBillingDrawerCampaign] = useState<Campaign | null>(null);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const emVeiculacao = campaigns.filter((c) => c.status === CampaignStatus.EM_VEICULACAO);
    const emInstalacao = campaigns.filter((c) => c.status === CampaignStatus.EM_INSTALACAO);
    
    const finalizadasMes = campaigns.filter((c) => {
      if (c.status !== CampaignStatus.FINALIZADA) return false;
      const endDate = new Date(c.endDate);
      return endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear;
    });

    const valorEmVeiculacao = emVeiculacao.reduce((sum, c) => {
      const valor = c.totalAmountCents ? c.totalAmountCents / 100 : 0;
      return sum + valor;
    }, 0);

    return {
      emVeiculacao: emVeiculacao.length,
      emInstalacao: emInstalacao.length,
      finalizadasMes: finalizadasMes.length,
      valorEmVeiculacao,
    };
  }, [campaigns]);

  // Campanhas por status
  const activeCampaigns = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.status === CampaignStatus.EM_INSTALACAO ||
          c.status === CampaignStatus.EM_VEICULACAO ||
          c.status === CampaignStatus.ATIVA
      ),
    [campaigns]
  );

  const finishedCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === CampaignStatus.FINALIZADA),
    [campaigns]
  );
  
  const cancelledCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === CampaignStatus.CANCELADA),
    [campaigns]
  );

  // Handlers
  const handleViewDetails = (campaign: Campaign, tab: string = 'summary') => {
    setDetailsDrawerCampaign(campaign);
    setDetailsDrawerTab(tab);
  };

  const handleCheckIn = (campaign: Campaign) => {
    setCheckInDialogCampaign(campaign);
  };

  const handleGenerateReport = (campaign: Campaign) => {
    setReportDialogCampaign(campaign);
  };

  const handleViewBilling = (campaign: Campaign) => {
    setBillingDrawerCampaign(campaign);
  };

  return (
    <div className="p-8">
      {loading && <div>Carregando campanhas...</div>}
      {!loading && error && <div>Erro ao carregar campanhas.</div>}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Campanhas</h1>
        <p className="text-gray-600">
          Acompanhe campanhas em execução (Campaign + CampaignItem)
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Em Veiculação</p>
            <p className="text-gray-900">{stats.emVeiculacao}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Em Instalação</p>
            <p className="text-gray-900">{stats.emInstalacao}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Finalizadas (Mês)</p>
            <p className="text-gray-900">{stats.finalizadasMes}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Valor em Veiculação</p>
            <p className="text-gray-900">
              R${' '}
              {stats.valorEmVeiculacao.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Em Andamento</TabsTrigger>
          <TabsTrigger value="finished">Finalizadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          <TabsTrigger value="installations">Instalações OOH</TabsTrigger>
        </TabsList>

        {/* Tab: Em Andamento */}
        <TabsContent value="active">
          <CampaignList
            campaigns={activeCampaigns}
            showAllActions={true}
            onViewDetails={handleViewDetails}
            onCheckIn={handleCheckIn}
            onGenerateReport={handleGenerateReport}
            onViewBilling={handleViewBilling}
          />
        </TabsContent>

        {/* Tab: Finalizadas */}
        <TabsContent value="finished">
          <CampaignList
            campaigns={finishedCampaigns}
            showAllActions={false}
            onViewDetails={handleViewDetails}
            onGenerateReport={handleGenerateReport}
          />
        </TabsContent>

        {/* Tab: Canceladas */}
        <TabsContent value="cancelled">
          <CampaignList
            campaigns={cancelledCampaigns}
            showAllActions={false}
            onViewDetails={handleViewDetails}
            onGenerateReport={handleGenerateReport}
          />
        </TabsContent>

        {/* Tab: Instalações OOH */}
        <TabsContent value="installations">
          <CampaignInstallationsView
            campaigns={campaigns}
            onViewDetails={(campaign) => handleViewDetails(campaign, 'installations')}
            onCheckIn={handleCheckIn}
          />
        </TabsContent>
      </Tabs>

      {/* Info do Fluxo */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 Fluxo de Campanhas</p>
        <p className="text-sm text-blue-700">
          Campanha é criada automaticamente quando Proposta é aprovada. Status:{' '}
          <strong>EM_INSTALACAO</strong> (OOH sendo instalado) → <strong>EM_VEICULACAO</strong> (no
          ar) → <strong>FINALIZADA</strong> (ou <strong>CANCELADA</strong> por inadimplência)
        </p>
      </div>

      {/* Dialogs e Drawers */}
      <CampaignDetailsDrawer
        open={!!detailsDrawerCampaign}
        onOpenChange={(open) => !open && setDetailsDrawerCampaign(null)}
        campaign={detailsDrawerCampaign}
        defaultTab={detailsDrawerTab}
        onRequestCheckIn={handleCheckIn}
      />

      <CampaignCheckInDialog
        open={!!checkInDialogCampaign}
        onOpenChange={(open) => !open && setCheckInDialogCampaign(null)}
        campaign={checkInDialogCampaign}
        onCheckInComplete={() => {
          // atualização suave: refetch da listagem e dos drawers
          refetch();
        }}
      />

      <CampaignReportDialog
        open={!!reportDialogCampaign}
        onOpenChange={(open) => !open && setReportDialogCampaign(null)}
        campaign={reportDialogCampaign}
      />

      <CampaignBillingDrawer
        open={!!billingDrawerCampaign}
        onOpenChange={(open) => !open && setBillingDrawerCampaign(null)}
        campaign={billingDrawerCampaign}
      />
    </div>
  );
}
