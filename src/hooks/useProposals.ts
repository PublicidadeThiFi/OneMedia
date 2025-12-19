import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Proposal, ProposalStatus } from '../types';

export interface UseProposalsParams {
  search?: string;
  status?: ProposalStatus | ProposalStatus[] | string;
  clientId?: string;
  responsibleUserId?: string;
  createdFrom?: string;
  createdTo?: string;
  orderBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
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

  const cleanedParams = useMemo(() => {
    const p: Record<string, unknown> = { ...params };

    if (p.status === 'all') delete p.status;
    if (Array.isArray(p.status) && p.status.length === 0) delete p.status;
    if (typeof p.search === 'string' && !p.search.trim()) delete p.search;

    return p;
  }, [params]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ProposalsResponse>('/proposals', {
        params: cleanedParams,
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

  const createProposal = async (data: Partial<Proposal>) => {
    const response = await apiClient.post<Proposal>('/proposals', data);
    // Não assume que o backend retorna no mesmo formato da lista; então só refetch no final do fluxo.
    setProposals((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateProposal = async (id: string, data: Partial<Proposal>) => {
    const response = await apiClient.put<Proposal>(`/proposals/${id}`, data);
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...response.data } : p)));
    return response.data;
  };

  const updateProposalStatus = async (id: string, status: ProposalStatus) => {
    const response = await apiClient.patch<Proposal>(`/proposals/${id}/status`, { status });
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...response.data } : p)));
    return response.data;
  };

  const duplicateProposal = async (id: string) => {
    const response = await apiClient.post<Proposal>(`/proposals/${id}/duplicate`);
    setProposals((prev) => [response.data, ...prev]);
    return response.data;
  };

  const approveProposal = async (id: string) => {
    const response = await apiClient.post<Proposal>(`/proposals/${id}/approve`);
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...response.data } : p)));
    return response.data;
  };

  const getProposalPdf = async (id: string) => {
    const response = await apiClient.get<{ id: string; fileName: string; url: string }>(
      `/proposals/${id}/pdf`
    );
    return response.data;
  };

  useEffect(() => {
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cleanedParams.search,
    cleanedParams.status,
    cleanedParams.clientId,
    cleanedParams.responsibleUserId,
    cleanedParams.createdFrom,
    cleanedParams.createdTo,
    cleanedParams.orderBy,
    cleanedParams.sortOrder,
    cleanedParams.page,
    cleanedParams.pageSize,
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
    updateProposalStatus,
    duplicateProposal,
    approveProposal,
    getProposalPdf,
  };
}
