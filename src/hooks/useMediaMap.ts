import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import type { MediaMapDetails, MediaMapPoint } from '../types';

export interface UseMediaMapPointsParams {
  bbox?: string; // "west,south,east,north"
  zoom?: number;
  at?: string; // ISO
}

export function useMediaMapPoints(params: UseMediaMapPointsParams = {}) {
  const [points, setPoints] = useState<MediaMapPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const key = useMemo(() => {
    return `${params.bbox ?? ''}|${params.zoom ?? ''}|${params.at ?? ''}`;
  }, [params.bbox, params.zoom, params.at]);

  const fetchPoints = async () => {
    try {
      if (!params.bbox) {
        setPoints([]);
        return;
      }

      setLoading(true);
      setError(null);

      const res = await apiClient.get<MediaMapPoint[]>('/media-points/map', {
        params: {
          bbox: params.bbox,
          zoom: params.zoom,
          at: params.at,
        },
      });

      setPoints(res.data ?? []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { points, loading, error, refetch: fetchPoints };
}

export async function fetchMediaMapDetails(mediaPointId: string, at?: string) {
  const res = await apiClient.get<MediaMapDetails>(`/media-points/${mediaPointId}/details`, {
    params: { at },
  });
  return res.data;
}
