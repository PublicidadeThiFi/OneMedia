import { Badge } from '../ui/badge';
import { ReservationStatus } from '../../types';

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.CONFIRMADA:
        return 'bg-green-100 text-green-800';
      case ReservationStatus.RESERVADA:
        return 'bg-yellow-100 text-yellow-800';
      case ReservationStatus.CANCELADA:
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusLabel = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.CONFIRMADA:
        return 'Confirmada';
      case ReservationStatus.RESERVADA:
        return 'Em negociação';
      case ReservationStatus.CANCELADA:
        return 'Cancelada';
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
