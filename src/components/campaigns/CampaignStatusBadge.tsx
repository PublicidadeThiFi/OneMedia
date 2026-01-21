import { Badge } from '../ui/badge';
import { CampaignStatus } from '../../types';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.CANCELADA:
        return 'bg-red-100 text-red-800';
      case CampaignStatus.EM_VEICULACAO:
        return 'bg-green-100 text-green-800';
      case CampaignStatus.EM_INSTALACAO:
        return 'bg-yellow-100 text-yellow-800';
      case CampaignStatus.ATIVA:
      case CampaignStatus.APROVADA:
        return 'bg-blue-100 text-blue-800';
      case CampaignStatus.AGUARDANDO_MATERIAL:
        return 'bg-orange-100 text-orange-800';
      case CampaignStatus.FINALIZADA:
        return 'bg-gray-100 text-gray-800';
      case CampaignStatus.RASCUNHO:
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.CANCELADA:
        return 'Cancelada';
      case CampaignStatus.EM_VEICULACAO:
        return 'Em veiculação';
      case CampaignStatus.EM_INSTALACAO:
        return 'Em instalação';
      case CampaignStatus.ATIVA:
        return 'Ativa';
      case CampaignStatus.APROVADA:
        return 'Aprovada';
      case CampaignStatus.AGUARDANDO_MATERIAL:
        return 'Aguardando material';
      case CampaignStatus.FINALIZADA:
        return 'Finalizada';
      case CampaignStatus.RASCUNHO:
      default:
        return 'Rascunho';
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
