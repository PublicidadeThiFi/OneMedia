import { Eye, FileText, DollarSign, FileDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Campaign } from '../../types';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { getClientById, getProposalById, getItemsForProposal } from '../../lib/mockData';

interface CampaignCardProps {
  campaign: Campaign;
  showAllActions?: boolean;
  onViewDetails: (campaign: Campaign) => void;
  onGenerateBooking?: (campaign: Campaign) => void;
  onGenerateReport: (campaign: Campaign) => void;
  onViewBilling?: (campaign: Campaign) => void;
}

export function CampaignCard({
  campaign,
  showAllActions = true,
  onViewDetails,
  onGenerateBooking,
  onGenerateReport,
  onViewBilling,
}: CampaignCardProps) {
  const client = getClientById(campaign.clientId);
  const proposal = getProposalById(campaign.proposalId);
  const proposalItems = proposal ? getItemsForProposal(proposal.id) : [];
  const unitsCount = proposalItems.filter(item => item.mediaUnitId).length;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-gray-900">{campaign.name}</h3>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="text-gray-600 text-sm mb-2">
              {client?.companyName || client?.contactName || 'Cliente não encontrado'}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Proposta ID: ...{campaign.proposalId.slice(-6)}</span>
              <span>•</span>
              <span>
                {new Date(campaign.startDate).toLocaleDateString('pt-BR')} -{' '}
                {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
              </span>
              <span>•</span>
              <span>{unitsCount} {unitsCount === 1 ? 'unidade' : 'unidades'}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-900">
              R$ {(proposal?.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {proposal?.discountPercent && proposal.discountPercent > 0 && (
              <p className="text-green-600 text-xs">
                -{proposal.discountPercent}% desconto
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onViewDetails(campaign)}
          >
            <Eye className="w-4 h-4" />
            Ver Detalhes
          </Button>

          {showAllActions && onGenerateBooking && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onGenerateBooking(campaign)}
            >
              <FileDown className="w-4 h-4" />
              Gerar Booking
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onGenerateReport(campaign)}
          >
            <FileText className="w-4 h-4" />
            Relatório
          </Button>

          {showAllActions && onViewBilling && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onViewBilling(campaign)}
            >
              <DollarSign className="w-4 h-4" />
              Faturamento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
