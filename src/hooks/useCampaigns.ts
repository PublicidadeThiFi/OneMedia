import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Campaign, CampaignStatus } from '../types';

export interface UseCampaignsParams {
  search?: string;
  status?: CampaignStatus | string;
  clientId?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

// Resposta pode ser um array direto ou um objeto com paginação
type CampaignsResponse = Campaign[] | {
  data: Campaign[];
  total?: number;
};

export function useCampaigns(params: UseCampaignsParams = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<CampaignsResponse>('/campaigns', { params });
      const responseData = response.data as CampaignsResponse;

      const data: Campaign[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setCampaigns(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const getCampaignById = async (id: string) => {
    const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  };

  const createCampaign = async (payload: unknown) => {
    const response = await apiClient.post<Campaign>('/campaigns', payload);
    setCampaigns((prev: Campaign[]) => [response.data, ...prev]);
    return response.data;
  };

  const updateCampaign = async (id: string, payload: unknown) => {
    const response = await apiClient.put<Campaign>(`/campaigns/${id}`, payload);
    setCampaigns((prev: Campaign[]) =>
      prev.map((c: Campaign) => (c.id === id ? response.data : c))
    );
    return response.data;
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search, params.status, params.clientId, params.startDateFrom, params.startDateTo]);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    getCampaignById,
    createCampaign,
    updateCampaign,
  };
}
