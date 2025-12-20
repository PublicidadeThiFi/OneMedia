import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Reservation, ReservationStatus } from '../types';

export interface UseReservationsParams {
  mediaUnitId?: string;
  campaignId?: string;
  proposalId?: string;
  startDate?: string;
  endDate?: string;
  status?: ReservationStatus | string;
}

// Resposta pode ser um array direto ou um objeto com `data`
type ReservationsResponse =
  | Reservation[]
  | {
      data: Reservation[];
      total?: number;
    };

export function useReservations(params: UseReservationsParams = {}) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ReservationsResponse>('/reservations', {
        params,
      });

      const responseData = response.data as ReservationsResponse;

      const data: Reservation[] = Array.isArray(responseData) ? responseData : responseData.data;

      setReservations(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (payload: unknown) => {
    const response = await apiClient.post<Reservation>('/reservations', payload);
    setReservations((prev: Reservation[]) => [...prev, response.data]);
    return response.data;
  };

  /**
   * O backend expõe apenas PATCH /reservations/:id/status.
   * Então aqui aceitamos um payload com { status }.
   */
  const updateReservation = async (id: string, payload: { status?: ReservationStatus } | any) => {
    const status = payload?.status as ReservationStatus | undefined;

    if (!status) {
      throw new Error('status é obrigatório para atualizar a reserva');
    }

    const response = await apiClient.patch<Reservation>(`/reservations/${id}/status`, { status });

    setReservations((prev: Reservation[]) => prev.map((r: Reservation) => (r.id === id ? response.data : r)));

    return response.data;
  };

  const deleteReservation = async (id: string) => {
    await apiClient.delete(`/reservations/${id}`);
    setReservations((prev: Reservation[]) => prev.filter((r: Reservation) => r.id !== id));
  };

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mediaUnitId, params.campaignId, params.proposalId, params.startDate, params.endDate, params.status]);

  return {
    reservations,
    loading,
    error,
    refetch: fetchReservations,
    createReservation,
    updateReservation,
    deleteReservation,
  };
}
