import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Proposal, ProposalStatus } from '../types';

export interface UseProposalsParams {
  search?: string;
  status?: ProposalStatus | ProposalStatus[] | string;
  clientId?: string;
  responsibleUserId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}

// Resposta pode ser um array direto ou um objeto paginado
type ProposalsResponse =
  | Proposal[]
  | {
      data: Proposal[];
      total?: number;
    };

export function useProposals(params: UseProposalsParams = {}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ProposalsResponse>('/proposals', {
        params,
      });

      const responseData = response.data as ProposalsResponse;

      const data: Proposal[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal =
        Array.isArray(responseData) ? data.length : responseData.total ?? data.length;

      setProposals(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const getProposalById = async (id: string) => {
    const response = await apiClient.get<Proposal>(`/proposals/${id}`);
    return response.data;
  };

  const createProposal = async (payload: unknown) => {
    const response = await apiClient.post<Proposal>('/proposals', payload);
    setProposals((prev: Proposal[]) => [response.data, ...prev]);
    return response.data;
  };

  const updateProposal = async (id: string, payload: unknown) => {
    const response = await apiClient.put<Proposal>(`/proposals/${id}`, payload);
    setProposals((prev: Proposal[]) =>
      prev.map((p: Proposal) => (p.id === id ? response.data : p))
    );
    return response.data;
  };

  useEffect(() => {
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.status,
    params.clientId,
    params.responsibleUserId,
    params.createdFrom,
    params.createdTo,
    params.page,
    params.pageSize,
  ]);

  return {
    proposals,
    total,
    loading,
    error,
    refetch: fetchProposals,
    getProposalById,
    createProposal,
    updateProposal,
  };
}
