import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Campaign, CampaignStatus } from '../types';
import { useCampaigns } from '../hooks/useCampaigns';
import { CampaignList } from './campaigns/CampaignList';
import { CampaignInstallationsView } from './campaigns/CampaignInstallationsView';
import { CampaignDetailsDrawer } from './campaigns/CampaignDetailsDrawer';
import { CampaignCheckInDialog } from './campaigns/CampaignCheckInDialog';
import CampaignReportDialog from './campaigns/CampaignReportDialog';
import { CampaignBillingDrawer } from './campaigns/CampaignBillingDrawer';
import { formatBRL, safeDate } from '../lib/format';
import { useTutorial } from '../contexts/TutorialContext';

export function Campaigns() {
  const { activeTutorial, maybeOpenModuleTutorial, openModuleTutorial } = useTutorial();
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
      const endDate = safeDate((c as any).endDate);
      if (!endDate) return false;
      return endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear;
    });

    const valorEmVeiculacao = emVeiculacao.reduce((sum, c) => {
      const cents = Number((c as any).totalAmountCents || 0);
      const valor = cents > 0 ? cents / 100 : 0;
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



  useEffect(() => {
    if (activeTutorial) return;
    void maybeOpenModuleTutorial('campaigns-create-flow');
  }, [activeTutorial, maybeOpenModuleTutorial]);

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
      <div className="mb-8" data-tour="campaigns-overview">
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
              {formatBRL(stats.valorEmVeiculacao)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList data-tour="campaigns-filters">
          <TabsTrigger value="active">Em Andamento</TabsTrigger>
          <TabsTrigger value="finished">Finalizadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          <TabsTrigger value="installations">Instalações OOH</TabsTrigger>
        </TabsList>

        {/* Tab: Em Andamento */}
        <TabsContent value="active" data-tour="campaigns-tracking">
          <div className="sr-only" data-tour="campaigns-create-destination">Lista de campanhas geradas</div>
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-blue-900 mb-2" data-tour="campaigns-create">💡 Fluxo de Campanhas</p>
            <p className="text-sm text-blue-700" data-tour="campaigns-reports">
              Campanha é criada automaticamente quando Proposta é aprovada. Status:{' '}
              <strong>EM_INSTALACAO</strong> (OOH sendo instalado) → <strong>EM_VEICULACAO</strong> (no
              ar) → <strong>FINALIZADA</strong> (ou <strong>CANCELADA</strong> por inadimplência)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openModuleTutorial('campaigns-create-flow')}
            className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100"
          >
            Tutorial rápido
          </Button>
        </div>
      </div>

      {/* Dialogs e Drawers */}
      <CampaignDetailsDrawer
        open={!!detailsDrawerCampaign}
        onOpenChange={(open: boolean) => !open && setDetailsDrawerCampaign(null)}
        campaign={detailsDrawerCampaign}
        defaultTab={detailsDrawerTab}
        onRequestCheckIn={handleCheckIn}
      />

      <CampaignCheckInDialog
        open={!!checkInDialogCampaign}
        onOpenChange={(open: boolean) => !open && setCheckInDialogCampaign(null)}
        campaign={checkInDialogCampaign}
        onCheckInComplete={() => {
          // atualização suave: refetch da listagem e dos drawers
          refetch();
        }}
      />

      <CampaignReportDialog
        open={!!reportDialogCampaign}
        onOpenChange={(open: boolean) => !open && setReportDialogCampaign(null)}
        campaign={reportDialogCampaign}
      />

      <CampaignBillingDrawer
        open={!!billingDrawerCampaign}
        onOpenChange={(open: boolean) => !open && setBillingDrawerCampaign(null)}
        campaign={billingDrawerCampaign}
      />
    </div>
  );
}
