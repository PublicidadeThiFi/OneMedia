import { Reservation, UnitType } from '../../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';

interface ReservationDayCardProps {
  reservation: Reservation & { estimatedAmount?: number };
  clientName?: string;
  unitLabel?: string;
  pointName?: string;
  amount?: number;
  onClick?: () => void;
}

export function ReservationDayCard({ reservation, clientName, unitLabel, pointName, amount, onClick }: ReservationDayCardProps) {
  const unitType = (reservation as any).mediaUnitType as UnitType | undefined;

  return (
    <div
      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-gray-900">{clientName || 'Cliente'}</p>
        <ReservationStatusBadge status={reservation.status as any} />
      </div>

      <p className="text-gray-600 text-sm mb-1">{pointName || 'Unidade de Mídia'}</p>

      <p className="text-gray-500 text-xs mb-2">
        {unitLabel || (reservation as any).mediaUnitLabel || 'Unidade'} • {unitType === UnitType.FACE ? 'Face' : unitType === UnitType.SCREEN ? 'Tela' : '-'}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {new Date(reservation.startDate).toLocaleDateString('pt-BR')} -{' '}
          {new Date(reservation.endDate).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-gray-900">{typeof amount === 'number' ? `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ -'}</span>
      </div>

      {(reservation as any).proposalTitle && (
        <p className="text-gray-500 text-xs mt-2">Proposta: {(reservation as any).proposalTitle}</p>
      )}
      {!((reservation as any).proposalTitle) && reservation.proposalId && (
        <p className="text-gray-500 text-xs mt-2">Proposta: ...{reservation.proposalId.slice(-6)}</p>
      )}
      {(reservation as any).campaignName && (
        <p className="text-gray-500 text-xs">Campanha: {(reservation as any).campaignName}</p>
      )}
      {!((reservation as any).campaignName) && reservation.campaignId && (
        <p className="text-gray-500 text-xs">Campanha: ...{reservation.campaignId.slice(-6)}</p>
      )}
    </div>
  );
}
