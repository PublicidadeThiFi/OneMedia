import { MapPin, Wrench } from 'lucide-react';

import { Button } from '../ui/button';
import { Campaign, CampaignStatus } from '../../types';

interface CampaignInstallationsViewProps {
  campaigns: Campaign[];
  onViewDetails: (campaign: Campaign) => void;
}

/**
 * Aba "Instalações OOH" na listagem de campanhas.
 *
 * Obs: este componente **não** é o Drawer de detalhes.
 * Ele recebe uma lista de campanhas e filtra as que estão em EM_INSTALACAO.
 */
export function CampaignInstallationsView({ campaigns, onViewDetails }: CampaignInstallationsViewProps) {
  const installationCampaigns = (campaigns || []).filter((c) => c.status === CampaignStatus.EM_INSTALACAO);

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wrench className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-900">Instalações OOH</h3>
            <p className="text-sm text-orange-700 mt-1">
              Acompanhe campanhas que estão em fase de instalação. Abra os detalhes para gerenciar reservas e o status.
            </p>
          </div>
        </div>
      </div>

      {installationCampaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Nenhuma instalação em andamento</p>
          <p className="text-sm">Quando uma campanha estiver em EM_INSTALACAO, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {installationCampaigns.map((campaign) => {
            const start = new Date(campaign.startDate);
            const end = new Date(campaign.endDate);
            const unitsCount =
              typeof campaign.reservedUnitsCount === 'number'
                ? campaign.reservedUnitsCount
                : campaign.items?.length ?? 0;
            const clientName = campaign.client?.contactName || campaign.client?.companyName || campaign.clientName || '—';

            return (
              <div key={campaign.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{clientName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        {start.toLocaleDateString('pt-BR')} - {end.toLocaleDateString('pt-BR')}
                      </span>
                      <span>•</span>
                      <span>{unitsCount} unidades</span>
                    </div>
                    {campaign.proposalId && (
                      <div className="text-xs text-gray-500 mt-1">Proposta ID: ...{campaign.proposalId.slice(-6)}</div>
                    )}
                  </div>

                  <Button variant="outline" onClick={() => onViewDetails(campaign)}>
                    Ver detalhes
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
