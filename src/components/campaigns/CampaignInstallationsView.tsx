import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Campaign, CampaignStatus } from '../../types';

interface CampaignInstallationsViewProps {
  campaigns: Campaign[];
  onViewDetails: (campaign: Campaign) => void;
}

export function CampaignInstallationsView({
  campaigns,
  onViewDetails,
}: CampaignInstallationsViewProps) {
  const oohCampaigns = campaigns.filter((campaign) => {
    const items = campaign.items || [];
    const hasUnits = items.some((item) => !!item.mediaUnitId);
    return hasUnits;
  });

  // Calcular estatísticas
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const stats = {
    total: oohCampaigns.length,
    active: oohCampaigns.filter(
      (c) => c.status === CampaignStatus.EM_VEICULACAO || c.status === CampaignStatus.EM_INSTALACAO
    ).length,
    next7Days: oohCampaigns.filter(
      (c) => new Date(c.startDate) >= now && new Date(c.startDate) <= sevenDaysFromNow
    ).length,
    finishedThisMonth: oohCampaigns.filter((c) => {
      const endDate = new Date(c.endDate);
      return (
        c.status === CampaignStatus.FINALIZADA &&
        endDate >= startOfMonth &&
        endDate <= endOfMonth
      );
    }).length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronograma de Instalações OOH</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total de Instalações</p>
            <p className="text-gray-900">{stats.total}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Instalações Ativas</p>
            <p className="text-gray-900">{stats.active}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Próximas 7 dias</p>
            <p className="text-gray-900">{stats.next7Days}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Encerradas no mês</p>
            <p className="text-gray-900">{stats.finishedThisMonth}</p>
          </div>
        </div>

        {/* Lista de instalações */}
        {oohCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma instalação OOH encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {oohCampaigns.map((campaign) => {
              const client = campaign.client;
              const items = campaign.items || [];
              const unitsCount = items.filter((item) => item.mediaUnitId).length;

              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-gray-900 mb-1">{campaign.name}</p>
                    <p className="text-gray-600 text-sm">
                      Cliente: {client?.companyName || client?.contactName || '-'} • {unitsCount}{' '}
                      {unitsCount === 1 ? 'unidade' : 'unidades'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-gray-600">Período</p>
                      <p className="text-gray-900">
                        {new Date(campaign.startDate).toLocaleDateString('pt-BR')} -{' '}
                        {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onViewDetails(campaign)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
