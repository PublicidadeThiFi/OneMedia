import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { MediaPoint, MediaType } from '../types';

export interface UseMediaPointsParams {
  search?: string;
  type?: MediaType | string;
  city?: string;
  state?: string;
  showInMediaKit?: boolean;
  page?: number;
  pageSize?: number;
}

// Resposta pode ser um array direto ou um objeto paginado
type MediaPointsResponse =
  | MediaPoint[]
  | {
      data: MediaPoint[];
      total?: number;
    };

export function useMediaPoints(params: UseMediaPointsParams = {}) {
  const [mediaPoints, setMediaPoints] = useState<MediaPoint[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMediaPoints = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<MediaPointsResponse>('/media-points', {
        params,
      });

      const responseData = response.data as MediaPointsResponse;

      const data: MediaPoint[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal =
        Array.isArray(responseData) ? data.length : responseData.total ?? data.length;

      setMediaPoints(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createMediaPoint = async (payload: Partial<MediaPoint>) => {
    const response = await apiClient.post<MediaPoint>('/media-points', payload);
    setMediaPoints((prev: MediaPoint[]) => [...prev, response.data]);
    return response.data;
  };

  const updateMediaPoint = async (id: string, payload: Partial<MediaPoint>) => {
    const response = await apiClient.put<MediaPoint>(`/media-points/${id}`, payload);
    setMediaPoints((prev: MediaPoint[]) =>
      prev.map((p: MediaPoint) => (p.id === id ? response.data : p))
    );
    return response.data;
  };

  const deleteMediaPoint = async (id: string) => {
    await apiClient.delete(`/media-points/${id}`);
    setMediaPoints((prev: MediaPoint[]) =>
      prev.filter((p: MediaPoint) => p.id !== id)
    );
  };

  const uploadMediaPointImage = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<MediaPoint>(
      `/media-points/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    setMediaPoints((prev: MediaPoint[]) =>
      prev.map((p: MediaPoint) =>
        p.id === id ? { ...p, mainImageUrl: response.data.mainImageUrl } : p
      )
    );

    return response.data;
  };

  useEffect(() => {
    fetchMediaPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.type,
    params.city,
    params.state,
    params.showInMediaKit,
    params.page,
    params.pageSize,
  ]);

  return {
    mediaPoints,
    total,
    loading,
    error,
    refetch: fetchMediaPoints,
    createMediaPoint,
    updateMediaPoint,
    deleteMediaPoint,
    uploadMediaPointImage,
  };
}
