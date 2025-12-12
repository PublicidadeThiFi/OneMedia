import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { MediaUnit } from '../types';

export interface UseMediaUnitsOptions {
  mediaPointId?: string | null;
}

// Resposta pode ser um array direto ou um objeto com `data`
type MediaUnitsResponse =
  | MediaUnit[]
  | {
      data: MediaUnit[];
    };

export function useMediaUnits({ mediaPointId }: UseMediaUnitsOptions) {
  const [units, setUnits] = useState<MediaUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnits = async () => {
    if (!mediaPointId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<MediaUnitsResponse>(
        `/media-points/${mediaPointId}/units`
      );

      const responseData = response.data as MediaUnitsResponse;

      const data: MediaUnit[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setUnits(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createUnit = async (payload: Partial<MediaUnit>) => {
    if (!mediaPointId) throw new Error('mediaPointId é obrigatório');

    const response = await apiClient.post<MediaUnit>(
      `/media-points/${mediaPointId}/units`,
      payload
    );

    setUnits((prev: MediaUnit[]) => [...prev, response.data]);
    return response.data;
  };

  const updateUnit = async (id: string, payload: Partial<MediaUnit>) => {
    const response = await apiClient.put<MediaUnit>(`/media-units/${id}`, payload);

    setUnits((prev: MediaUnit[]) =>
      prev.map((u: MediaUnit) => (u.id === id ? response.data : u))
    );

    return response.data;
  };

  const deleteUnit = async (id: string) => {
    await apiClient.delete(`/media-units/${id}`);

    setUnits((prev: MediaUnit[]) => prev.filter((u: MediaUnit) => u.id !== id));
  };

  const uploadUnitImage = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ imageUrl: string }>(
      `/media-units/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    setUnits((prev: MediaUnit[]) =>
      prev.map((u: MediaUnit) =>
        u.id === id ? { ...u, imageUrl: response.data.imageUrl } : u
      )
    );

    return response.data;
  };

  useEffect(() => {
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPointId]);

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    uploadUnitImage,
  };
}
