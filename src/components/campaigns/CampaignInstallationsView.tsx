import { MapPin, Wrench, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Campaign, CampaignStatus } from '../../types';
import { formatDateBR, safeDate } from '../../lib/format';

interface CampaignInstallationsViewProps {
  campaigns: Campaign[];
  onViewDetails: (campaign: Campaign) => void;
  onCheckIn?: (campaign: Campaign) => void;
}

/**
 * Aba "Instalações OOH" na listagem de campanhas.
 *
 * Obs: este componente **não** é o Drawer de detalhes.
 * Ele recebe uma lista de campanhas e filtra as que estão em EM_INSTALACAO.
 */
export function CampaignInstallationsView({ campaigns, onViewDetails, onCheckIn }: CampaignInstallationsViewProps) {
  const installationCampaigns = (campaigns || []).filter((c) => c.status === CampaignStatus.EM_INSTALACAO);

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wrench className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-900">Instalações OOH</h3>
            <p className="text-sm text-orange-700 mt-1">
              Acompanhe campanhas em fase de instalação. Ao concluir a instalação, realize o <b>check-in</b> com 1 foto por face.
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
            const deadline = safeDate(campaign.checkInDeadlineAt as any);
            const start = safeDate(campaign.startDate as any);
            const end = safeDate(campaign.endDate as any);
            const unitsCount =
              (typeof campaign.reservedUnitsCount === 'number' ? campaign.reservedUnitsCount : undefined) ??
              (typeof campaign.campaignItemsCount === 'number' ? campaign.campaignItemsCount : undefined) ??
              (typeof campaign.reservationsCount === 'number' ? campaign.reservationsCount : undefined) ??
              (campaign.items?.length ?? 0);
            const clientName = campaign.client?.contactName || campaign.client?.companyName || campaign.clientName || '—';

            const handleCopyProposalId = async () => {
              try {
                await navigator.clipboard.writeText(campaign.proposalId);
                toast.success('ID da proposta copiado');
              } catch {
                toast.error('Não foi possível copiar o ID');
              }
            };

            return (
              <div key={campaign.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{clientName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        {deadline
                          ? `Check-in até ${formatDateBR(deadline)}`
                          : start && end
                          ? `${formatDateBR(start)} - ${formatDateBR(end)}`
                          : '-'}
                      </span>
                      <span>•</span>
                      <span>{unitsCount} unidades</span>
                    </div>
                    {campaign.proposalId && (
                      <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                        <span>Proposta ID:</span>
                        <button
                          type="button"
                          className="font-mono text-gray-600 hover:text-gray-900"
                          title={campaign.proposalId}
                          onClick={handleCopyProposalId}
                        >
                          ...{campaign.proposalId.slice(-6)}
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100"
                          title="Copiar ID"
                          onClick={handleCopyProposalId}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onViewDetails(campaign)}>
                      Ver detalhes
                    </Button>

                    {onCheckIn && (
                      <Button onClick={() => onCheckIn(campaign)}>
                        Check-in
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
