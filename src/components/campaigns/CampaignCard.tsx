import { Eye, FileText, DollarSign, Camera, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Campaign } from '../../types';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { toNumber } from '../../lib/number';

interface CampaignCardProps {
  campaign: Campaign;
  showAllActions?: boolean;
  onViewDetails: (campaign: Campaign) => void;
  onCheckIn?: (campaign: Campaign) => void;
  onGenerateReport: (campaign: Campaign) => void;
  onViewBilling?: (campaign: Campaign) => void;
}

export function CampaignCard({
  campaign,
  showAllActions = true,
  onViewDetails,
  onCheckIn,
  onGenerateReport,
  onViewBilling,
}: CampaignCardProps) {
  const client = campaign.client;

  const unitsCount =
    (typeof campaign.reservedUnitsCount === 'number' ? campaign.reservedUnitsCount : undefined) ??
    (typeof campaign.campaignItemsCount === 'number' ? campaign.campaignItemsCount : undefined) ??
    (typeof campaign.reservationsCount === 'number' ? campaign.reservationsCount : undefined) ??
    (campaign.items || []).filter((item) => item.mediaUnitId).length;

  const handleCopyProposalId = async () => {
    try {
      await navigator.clipboard.writeText(campaign.proposalId);
      toast.success('ID da proposta copiado');
    } catch {
      toast.error('Não foi possível copiar o ID');
    }
  };
  const totalValor = toNumber(campaign.totalAmountCents, 0) / 100;
  const hasCheckIn = !!campaign.checkInAt;
  const deadline = campaign.checkInDeadlineAt ? new Date(campaign.checkInDeadlineAt as any) : null;
  const start = campaign.startDate ? new Date(campaign.startDate as any) : null;
  const end = campaign.endDate ? new Date(campaign.endDate as any) : null;

  const periodLabel = hasCheckIn
    ? `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`
    : deadline
    ? `Check-in até ${deadline.toLocaleDateString('pt-BR')}`
    : `${start ? start.toLocaleDateString('pt-BR') : '-'} - ${end ? end.toLocaleDateString('pt-BR') : '-'}`;

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
              <span className="inline-flex items-center gap-1">
                <span>Proposta ID:</span>
                <button
                  type="button"
                  className="font-mono text-gray-700 hover:text-gray-900"
                  title={campaign.proposalId}
                  onClick={handleCopyProposalId}
                >
                  ...{campaign.proposalId.slice(-6)}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Copiar ID"
                  onClick={handleCopyProposalId}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </span>
              <span>•</span>
              <span>{periodLabel}</span>
              <span>•</span>
              <span>{unitsCount} {unitsCount === 1 ? 'unidade' : 'unidades'}</span>
            </div>
          </div>
          <div className="text-right">
              <p className="text-gray-900">
                R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
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

          {showAllActions && onCheckIn && campaign.status === 'EM_INSTALACAO' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onCheckIn(campaign)}
            >
              <Camera className="w-4 h-4" />
              Check-in
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
