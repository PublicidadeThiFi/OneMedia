import { Badge } from '../ui/badge';
import { ProposalStatus } from '../../types';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.APROVADA:
        return 'bg-green-100 text-green-800';
      case ProposalStatus.ENVIADA:
        return 'bg-blue-100 text-blue-800';
      case ProposalStatus.RASCUNHO:
        return 'bg-gray-100 text-gray-800';
      case ProposalStatus.REPROVADA:
        return 'bg-red-100 text-red-800';
      case ProposalStatus.EXPIRADA:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getStatusLabel = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.APROVADA:
        return 'Aprovada';
      case ProposalStatus.ENVIADA:
        return 'Enviada';
      case ProposalStatus.RASCUNHO:
        return 'Rascunho';
      case ProposalStatus.REPROVADA:
        return 'Reprovada';
      case ProposalStatus.EXPIRADA:
        return 'Expirada';
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
