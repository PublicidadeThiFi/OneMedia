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


async function runWithConcurrency<TInput, TResult>(
  items: TInput[],
  worker: (item: TInput) => Promise<TResult>,
  concurrency = 2,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  });

  await Promise.all(runners);
  return results;
}

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
        `/media-points/${mediaPointId}/units`,
        { params: { detailed: false } }
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


  const getUnitById = async (id: string) => {
    const response = await apiClient.get<MediaUnit>(`/media-units/${id}`);
    return response.data;
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

  const uploadUnitImage = async (
    id: string,
    file: File,
    onProgress?: (progress: { loaded: number; total: number }) => void,
    options?: { signal?: AbortSignal },
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadConfig = {
      signal: options?.signal,
      onUploadProgress: (event: ProgressEvent) => {
        const loaded = Number(event.loaded ?? 0);
        const total = Number(event.total ?? file.size ?? 0);
        onProgress?.({ loaded, total: total > 0 ? total : file.size });
      },
    } as any;

    const response = await apiClient.post<MediaUnit>(`/media-units/${id}/image`, formData, uploadConfig);

    setUnits((prev: MediaUnit[]) =>
      prev.map((u: MediaUnit) =>
        u.id === id
          ? {
              ...u,
              ...response.data,
              imageUrl: response.data.imageUrl ?? u.imageUrl,
            }
          : u
      )
    );

    return response.data;
  };

  const uploadManyUnitImages = async (id: string, files: File[]) => {
    if (!files.length) return null;
    const results = await runWithConcurrency(files, (file) => uploadUnitImage(id, file), 3);
    return results.at(-1) ?? null;
  };

  const uploadManyUnitVideos = async (id: string, files: File[]) => {
    if (!files.length) return null;
    const results = await runWithConcurrency(files, (file) => uploadUnitVideo(id, file), 2);
    return results.at(-1) ?? null;
  };

  const uploadUnitVideo = async (
    id: string,
    file: File,
    onProgress?: (progress: { loaded: number; total: number }) => void,
    options?: { signal?: AbortSignal },
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadConfig = {
      signal: options?.signal,
      onUploadProgress: (event: ProgressEvent) => {
        const loaded = Number(event.loaded ?? 0);
        const total = Number(event.total ?? file.size ?? 0);
        onProgress?.({ loaded, total: total > 0 ? total : file.size });
      },
    } as any;

    const response = await apiClient.post<MediaUnit>(`/media-units/${id}/video`, formData, uploadConfig);

    setUnits((prev: MediaUnit[]) =>
      prev.map((u: MediaUnit) =>
        u.id === id
          ? {
              ...u,
              ...response.data,
              videoUrl: response.data.videoUrl ?? u.videoUrl,
            }
          : u
      )
    );

    return response.data;
  };


  const deleteUnitAsset = async (id: string, assetId: string) => {
    const response = await apiClient.delete<MediaUnit>(`/media-units/${id}/assets/${assetId}`);

    setUnits((prev: MediaUnit[]) =>
      prev.map((u: MediaUnit) => (u.id === id ? response.data : u))
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
    getUnitById,
    updateUnit,
    deleteUnit,
    uploadUnitImage,
    uploadUnitVideo,
    uploadManyUnitImages,
    uploadManyUnitVideos,
    deleteUnitAsset,
  };
}
