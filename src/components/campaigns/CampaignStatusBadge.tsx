import { Badge } from '../ui/badge';
import { CampaignStatus } from '../../types';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.EM_VEICULACAO:
        return 'bg-green-100 text-green-800';
      case CampaignStatus.EM_INSTALACAO:
        return 'bg-yellow-100 text-yellow-800';
      case CampaignStatus.FINALIZADA:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.EM_VEICULACAO:
        return 'Em veiculação';
      case CampaignStatus.EM_INSTALACAO:
        return 'Em instalação';
      case CampaignStatus.FINALIZADA:
        return 'Finalizada';
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
