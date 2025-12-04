import { Reservation, UnitType, MediaType } from '../../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import {
  getClientById,
  getProposalById,
  getMediaUnitById,
  getMediaPointByMediaUnit,
  getAmountForReservation,
} from '../../lib/mockData';

interface ReservationDayCardProps {
  reservation: Reservation & { estimatedAmount?: number };
  onClick?: () => void;
}

export function ReservationDayCard({ reservation, onClick }: ReservationDayCardProps) {
  const unit = getMediaUnitById(reservation.mediaUnitId);
  const point = unit ? getMediaPointByMediaUnit(unit.id) : undefined;
  const proposal = reservation.proposalId ? getProposalById(reservation.proposalId) : undefined;
  const client = proposal ? getClientById(proposal.clientId) : undefined;

  // Tipo de unidade
  const unitTypeLabel = unit?.unitType === UnitType.FACE ? 'Face' : 'Tela';

  // Filtrar apenas OOH
  const isOOH = point?.type === MediaType.OOH;
  if (!isOOH) return null; // Não renderizar se não for OOH

  return (
    <div
      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-gray-900">
          {client?.companyName || client?.contactName || 'Cliente não identificado'}
        </p>
        <ReservationStatusBadge status={reservation.status as any} />
      </div>

      <p className="text-gray-600 text-sm mb-1">{point?.name || 'Ponto não encontrado'}</p>

      <p className="text-gray-500 text-xs mb-2">
        {unit?.label || 'Unidade não encontrada'} • {unitTypeLabel}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {new Date(reservation.startDate).toLocaleDateString('pt-BR')} -{' '}
          {new Date(reservation.endDate).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-gray-900">
          R$ {getAmountForReservation(reservation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {reservation.proposalId && (
        <p className="text-gray-500 text-xs mt-2">Proposta: ...{reservation.proposalId.slice(-6)}</p>
      )}
      {reservation.campaignId && (
        <p className="text-gray-500 text-xs">Campanha: ...{reservation.campaignId.slice(-6)}</p>
      )}
    </div>
  );
}
