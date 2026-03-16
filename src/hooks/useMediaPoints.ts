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
  summary?: boolean;
}

// Resposta pode ser um array direto ou um objeto paginado
type MediaPointsResponse =
  | MediaPoint[]
  | {
      data: MediaPoint[];
      total?: number;
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
        params: { summary: true, ...params },
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

  const uploadMediaPointImage = async (
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

    const response = await apiClient.post<MediaPoint>(`/media-points/${id}/image`, formData, uploadConfig);

    setMediaPoints((prev: MediaPoint[]) =>
      prev.map((p: MediaPoint) =>
        p.id === id
          ? {
              ...p,
              ...response.data,
              mainImageUrl: response.data.mainImageUrl ?? response.data.imageUrl ?? p.mainImageUrl,
              imageUrl: response.data.imageUrl ?? response.data.mainImageUrl ?? (p as any).imageUrl,
            }
          : p
      )
    );

    return response.data;
  };

  const uploadManyMediaPointImages = async (id: string, files: File[]) => {
    if (!files.length) return null;
    const results = await runWithConcurrency(files, (file) => uploadMediaPointImage(id, file), 3);
    return results.at(-1) ?? null;
  };

  const uploadManyMediaPointVideos = async (id: string, files: File[]) => {
    if (!files.length) return null;
    const results = await runWithConcurrency(files, (file) => uploadMediaPointVideo(id, file), 2);
    return results.at(-1) ?? null;
  };

  const uploadMediaPointVideo = async (
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

    const response = await apiClient.post<MediaPoint>(`/media-points/${id}/video`, formData, uploadConfig);

    setMediaPoints((prev: MediaPoint[]) =>
      prev.map((p: MediaPoint) =>
        p.id === id
          ? {
              ...p,
              ...response.data,
              mainVideoUrl: response.data.mainVideoUrl ?? response.data.videoUrl ?? p.mainVideoUrl,
              videoUrl: response.data.videoUrl ?? response.data.mainVideoUrl ?? (p as any).videoUrl,
            }
          : p
      )
    );

    return response.data;
  };


  const deleteMediaPointAsset = async (id: string, assetId: string) => {
    const response = await apiClient.delete<MediaPoint>(`/media-points/${id}/assets/${assetId}`);

    setMediaPoints((prev: MediaPoint[]) =>
      prev.map((p: MediaPoint) => (p.id === id ? response.data : p))
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
    uploadMediaPointVideo,
    uploadManyMediaPointImages,
    uploadManyMediaPointVideos,
    deleteMediaPointAsset,
  };
}
