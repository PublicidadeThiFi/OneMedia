import { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import type {
  MediaMapDetails,
  MediaMapPoint,
  MediaMapSuggestion,
  MediaType,
  MediaUnitAvailabilityStatus,
} from '../types';

export interface UseMediaMapPointsParams {
  bbox?: string; // "west,south,east,north"
  zoom?: number;
  at?: string; // ISO

  // filtros (Etapa 2)
  type?: MediaType;
  city?: string;
  state?: string;
  district?: string;
  showInMediaKit?: boolean;
  availability?: MediaUnitAvailabilityStatus | MediaUnitAvailabilityStatus[];
}

const POINTS_CACHE = new Map<string, { ts: number; data: MediaMapPoint[] }>();
const POINTS_INFLIGHT = new Map<string, Promise<MediaMapPoint[]>>();
const POINTS_CACHE_TTL_MS = 20_000;

const SUGGEST_CACHE = new Map<string, { ts: number; data: MediaMapSuggestion[] }>();
const SUGGEST_INFLIGHT = new Map<string, Promise<MediaMapSuggestion[]>>();
const SUGGEST_CACHE_TTL_MS = 30_000;

function normStr(v?: string) {
  const t = String(v ?? '').trim();
  return t.length ? t : undefined;
}

function normAvailability(v?: UseMediaMapPointsParams['availability']) {
  if (!v) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const clean = arr.filter(Boolean);
  if (!clean.length) return undefined;
  return [...clean].sort();
}

function buildPointsKey(params: UseMediaMapPointsParams) {
  const availability = normAvailability(params.availability)?.join(',') ?? '';
  return [
    params.bbox ?? '',
    String(params.zoom ?? ''),
    params.at ?? '',
    params.type ?? '',
    normStr(params.city) ?? '',
    normStr(params.state) ?? '',
    normStr(params.district) ?? '',
    typeof params.showInMediaKit === 'boolean' ? String(params.showInMediaKit) : '',
    availability,
  ].join('|');
}

async function requestMapPoints(params: UseMediaMapPointsParams, signal?: AbortSignal): Promise<MediaMapPoint[]> {
  if (!params.bbox) return [];

  const res = await apiClient.get<MediaMapPoint[]>('/media-points/map', {
    params: {
      bbox: params.bbox,
      zoom: params.zoom,
      at: params.at,
      type: params.type,
      city: normStr(params.city),
      state: normStr(params.state),
      district: normStr(params.district),
      showInMediaKit: params.showInMediaKit,
      availability: normAvailability(params.availability),
    },
    signal,
  } as any);

  return (res.data ?? []) as any;
}

export function useMediaMapPoints(params: UseMediaMapPointsParams = {}) {
  const [points, setPoints] = useState<MediaMapPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const key = useMemo(() => buildPointsKey(params), [
    params.bbox,
    params.zoom,
    params.at,
    params.type,
    params.city,
    params.state,
    params.district,
    params.showInMediaKit,
    params.availability,
  ]);

  const fetchPoints = async () => {
    try {
      if (!params.bbox) {
        abortRef.current?.abort();
        setPoints([]);
        setLoading(false);
        setError(null);
        return [] as MediaMapPoint[];
      }

      const now = Date.now();
      const cached = POINTS_CACHE.get(key);
      if (cached && now - cached.ts < POINTS_CACHE_TTL_MS) {
        setPoints(cached.data);
        setLoading(false);
        setError(null);
        return cached.data;
      }

      // Dedup inflight
      const inflight = POINTS_INFLIGHT.get(key);
      if (inflight) {
        setLoading(true);
        const data = await inflight;
        setPoints(data);
        setLoading(false);
        setError(null);
        return data;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const promise = requestMapPoints(params, controller.signal)
        .then((data) => {
          POINTS_CACHE.set(key, { ts: Date.now(), data });
          return data;
        })
        .finally(() => {
          POINTS_INFLIGHT.delete(key);
        });

      POINTS_INFLIGHT.set(key, promise);

      const data = await promise;
      setPoints(data);
      return data;
    } catch (err: any) {
      // Abort do Axios (v1) pode vir como DOMException ou AxiosError
      const msg = String(err?.message ?? '');
      if (msg.includes('canceled') || msg.includes('abort')) {
        return points;
      }
      setError(err as Error);
      return [] as MediaMapPoint[];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Primeiro tenta cache síncrono para ficar "liso"
    const cached = POINTS_CACHE.get(key);
    if (cached && Date.now() - cached.ts < POINTS_CACHE_TTL_MS) {
      setPoints(cached.data);
      setError(null);
      setLoading(false);
    }

    const t = window.setTimeout(() => {
      if (!mounted) return;
      fetchPoints();
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
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

export interface FetchMediaMapSuggestionsParams {
  q: string;
  limit?: number;
  type?: MediaType;
  city?: string;
  state?: string;
  district?: string;
  showInMediaKit?: boolean;
  bbox?: string;
}

function buildSuggestKey(params: FetchMediaMapSuggestionsParams) {
  const q = String(params.q || '').trim().toLowerCase();
  return [
    q,
    String(params.limit ?? ''),
    params.type ?? '',
    normStr(params.city) ?? '',
    normStr(params.state) ?? '',
    normStr(params.district) ?? '',
    typeof params.showInMediaKit === 'boolean' ? String(params.showInMediaKit) : '',
    params.bbox ?? '',
  ].join('|');
}

export async function fetchMediaMapSuggestions(
  params: FetchMediaMapSuggestionsParams,
  signal?: AbortSignal
): Promise<MediaMapSuggestion[]> {
  const q = String(params.q || '').trim();
  if (q.length < 2) return [];

  const key = buildSuggestKey(params);
  const now = Date.now();

  const cached = SUGGEST_CACHE.get(key);
  if (cached && now - cached.ts < SUGGEST_CACHE_TTL_MS) return cached.data;

  const inflight = SUGGEST_INFLIGHT.get(key);
  if (inflight) return inflight;

  const promise = apiClient
    .get<MediaMapSuggestion[]>('/media-points/suggestions', {
      params: {
        q,
        limit: params.limit,
        type: params.type,
        city: normStr(params.city),
        state: normStr(params.state),
        district: normStr(params.district),
        showInMediaKit: params.showInMediaKit,
        bbox: params.bbox,
      },
      signal,
    } as any)
    .then((res) => {
      const data = (res.data ?? []) as any;
      SUGGEST_CACHE.set(key, { ts: Date.now(), data });
      return data;
    })
    .finally(() => {
      SUGGEST_INFLIGHT.delete(key);
    });

  SUGGEST_INFLIGHT.set(key, promise);
  return promise;
}
