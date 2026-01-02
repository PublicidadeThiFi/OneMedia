import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Campaign, CampaignStatus } from '../types';

export interface UseCampaignsParams {
  search?: string;
  status?: CampaignStatus | CampaignStatus[] | string;
  clientId?: string;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
  page?: number;
  pageSize?: number;
}

type CampaignsResponse =
  | Campaign[]
  | {
      data: Campaign[];
      total?: number;
    };

export function useCampaigns(params: UseCampaignsParams = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refetch automático ao retornar para a aba/janela (sincroniza com aprovações de propostas)
  const fetchRef = useRef<(() => void) | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<CampaignsResponse>('/campaigns', {
        params,
      });

      const responseData = response.data;
      const data: Campaign[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal = Array.isArray(responseData)
        ? data.length
        : responseData.total ?? data.length;

      setCampaigns(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Atualiza referência da função de fetch para evitar closure stale
  useEffect(() => {
    fetchRef.current = () => {
      void fetchCampaigns();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.status,
    params.clientId,
    params.startFrom,
    params.startTo,
    params.endFrom,
    params.endTo,
    params.page,
    params.pageSize,
  ]);

  useEffect(() => {
    let lastRun = 0;
    const trigger = () => {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRun < 800) return;
      lastRun = now;
      fetchRef.current?.();
    };

    window.addEventListener('focus', trigger);
    document.addEventListener('visibilitychange', trigger);

    return () => {
      window.removeEventListener('focus', trigger);
      document.removeEventListener('visibilitychange', trigger);
    };
  }, []);

  const getCampaignById = async (id: string) => {
    const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  };

  const createCampaign = async (payload: unknown) => {
    const response = await apiClient.post<Campaign>('/campaigns', payload);
    setCampaigns((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateCampaign = async (id: string, payload: unknown) => {
    const response = await apiClient.put<Campaign>(`/campaigns/${id}`, payload);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? response.data : c)),
    );
    return response.data;
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.status,
    params.clientId,
    params.startFrom,
    params.startTo,
    params.endFrom,
    params.endTo,
    params.page,
    params.pageSize,
  ]);

  return {
    campaigns,
    total,
    loading,
    error,
    refetch: fetchCampaigns,
    getCampaignById,
    createCampaign,
    updateCampaign,
  };
}
