import { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import type {
  MediaMapDetails,
  MediaMapPoint,
  MediaMapSuggestion,
  MediaType,
  MediaUnitAvailabilityStatus,
} from '../types';

// =====================
// Mídia Map (Etapas 1-3)
// =====================

export type MediaMapLayer = 'mine' | 'favorites' | 'campaign' | 'proposal';

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

  // camadas (Etapa 3)
  layers?: MediaMapLayer[];
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

function normLayers(layers?: MediaMapLayer[]) {
  if (!layers || !layers.length) return undefined;
  return [...layers].sort();
}

function buildPointsKey(params: UseMediaMapPointsParams) {
  const availability = normAvailability(params.availability)?.join(',') ?? '';
  const layers = normLayers(params.layers)?.join(',') ?? '';
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
    layers,
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
      layers: normLayers(params.layers)?.join(',') ?? undefined,
    },
    signal,
  } as any);

  return (res.data ?? []) as any;
}

export function invalidateMediaMapCaches() {
  POINTS_CACHE.clear();
  SUGGEST_CACHE.clear();
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
    (params.layers ?? []).join('|'),
  ]);

  const fetchPoints = async (force = false) => {
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
      if (!force && cached && now - cached.ts < POINTS_CACHE_TTL_MS) {
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
      void fetchPoints(false);
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { points, loading, error, refetch: (force = true) => fetchPoints(force) };
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
  layers?: MediaMapLayer[];
}

function buildSuggestKey(params: FetchMediaMapSuggestionsParams) {
  const q = String(params.q || '').trim().toLowerCase();
  const layers = normLayers(params.layers)?.join(',') ?? '';
  return [
    q,
    String(params.limit ?? ''),
    params.type ?? '',
    normStr(params.city) ?? '',
    normStr(params.state) ?? '',
    normStr(params.district) ?? '',
    typeof params.showInMediaKit === 'boolean' ? String(params.showInMediaKit) : '',
    params.bbox ?? '',
    layers,
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

  const promise = Promise.resolve(
    apiClient
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
          layers: normLayers(params.layers)?.join(',') ?? undefined,
        },
        signal,
      } as any)
  )
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

// =====================
// Favoritos (Etapa 3)
// =====================

export async function setMediaPointFavorite(mediaPointId: string, favorite: boolean): Promise<{ favorite: boolean }> {
  if (favorite) {
    const res = await apiClient.put<{ favorite: boolean }>(`/media-points/${mediaPointId}/favorite`);
    return res.data;
  }
  const res = await apiClient.delete<{ favorite: boolean }>(`/media-points/${mediaPointId}/favorite`);
  return res.data;
}
