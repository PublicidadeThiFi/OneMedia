import { useEffect, useMemo, useRef, useState } from 'react';
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

export interface ProposalsStats {
  approved: number;
  sent: number;
  drafts: number;
  approvalRate: number;
  totalApprovedAmount: number;
}

// Resposta pode ser um array direto ou um objeto paginado
type ProposalsResponse =
  | Proposal[]
  | {
      data: Proposal[];
      total?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
      stats?: ProposalsStats;
    };

function normalizeProposal(p: any): Proposal {
  return {
    ...p,
    totalAmount: typeof p.totalAmount === 'string' ? Number(p.totalAmount) : p.totalAmount,
    discountAmount: typeof p.discountAmount === 'string' ? Number(p.discountAmount) : p.discountAmount,
    discountPercent: typeof p.discountPercent === 'string' ? Number(p.discountPercent) : p.discountPercent,
    startDate: p.startDate ? new Date(p.startDate) : undefined,
    endDate: p.endDate ? new Date(p.endDate) : undefined,
    validUntil: p.validUntil ? new Date(p.validUntil) : undefined,
    approvedAt: p.approvedAt ? new Date(p.approvedAt) : undefined,
    rejectedAt: p.rejectedAt ? new Date(p.rejectedAt) : undefined,
    createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
    conditionsText: typeof p.conditionsText === 'string' ? p.conditionsText.replace(/\\n/g, '\n') : p.conditionsText,
    items: Array.isArray(p.items)
      ? p.items.map((i: any) => ({
          ...i,
          unitPrice: typeof i.unitPrice === 'string' ? Number(i.unitPrice) : i.unitPrice,
          totalPrice: typeof i.totalPrice === 'string' ? Number(i.totalPrice) : i.totalPrice,
          discountAmount: typeof i.discountAmount === 'string' ? Number(i.discountAmount) : i.discountAmount,
          discountPercent: typeof i.discountPercent === 'string' ? Number(i.discountPercent) : i.discountPercent,
          startDate: i.startDate ? new Date(i.startDate) : undefined,
          endDate: i.endDate ? new Date(i.endDate) : undefined,
          createdAt: i.createdAt ? new Date(i.createdAt) : undefined,
          updatedAt: i.updatedAt ? new Date(i.updatedAt) : undefined,
        }))
      : p.items,
  } as Proposal;
}


function toIso(value: any): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return !isNaN(d.getTime()) ? d.toISOString() : undefined;
}

function cleanUuid(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function serializeProposalForApi(data: Partial<Proposal>) {
  const items = Array.isArray((data as any).items)
    ? (data as any).items
        .filter(Boolean)
        .map((i: any) => {
          const mediaUnitId = cleanUuid(i.mediaUnitId);
          const productId = mediaUnitId ? undefined : cleanUuid(i.productId);
          return stripUndefined({
            mediaUnitId,
            productId,
            mediaPointOwnerId: mediaUnitId ? cleanUuid(i.mediaPointOwnerId) : undefined,
            description: String(i.description ?? '').trim(),
            startDate: toIso(i.startDate),
            endDate: toIso(i.endDate),
            quantity: typeof i.quantity === 'number' ? i.quantity : Number(i.quantity ?? 1),
            unitPrice: typeof i.unitPrice === 'number' ? i.unitPrice : Number(i.unitPrice ?? 0),
            discountAmount: i.discountAmount === null ? null : (typeof i.discountAmount === 'number' ? i.discountAmount : (i.discountAmount !== undefined ? Number(i.discountAmount) : undefined)),
            discountPercent: i.discountPercent === null ? null : (typeof i.discountPercent === 'number' ? i.discountPercent : (i.discountPercent !== undefined ? Number(i.discountPercent) : undefined)),
          });
        })
        .filter((i: any) => !!i.description && (!!i.mediaUnitId || !!i.productId))
    : undefined;

  return stripUndefined({
    clientId: cleanUuid((data as any).clientId),
    responsibleUserId: cleanUuid((data as any).responsibleUserId),
    title: typeof (data as any).title === 'string' ? (data as any).title.trim() : undefined,
    status: (data as any).status,
    startDate: toIso((data as any).startDate),
    endDate: toIso((data as any).endDate),
    validUntil: toIso((data as any).validUntil),
    conditionsText: typeof (data as any).conditionsText === 'string' ? (data as any).conditionsText : undefined,
    discountAmount: (data as any).discountAmount,
    discountPercent: (data as any).discountPercent,
    items,
  });
}

export function useProposals(params: UseProposalsParams = {}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(params.page ?? 1);
  const [pageSize, setPageSize] = useState<number>(params.pageSize ?? 40);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<ProposalsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Mantém a última função de fetch para uso em listeners (evita closure stale)
  const fetchRef = useRef<(() => void) | null>(null);

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

      setProposals(data.map(normalizeProposal));
      setTotal(computedTotal);

      if (Array.isArray(responseData)) {
        setPage(params.page ?? 1);
        setPageSize(params.pageSize ?? data.length);
        setTotalPages(1);
        setStats(null);
      } else {
        const respPageSize = responseData.pageSize ?? params.pageSize ?? 40;
        const computedPages = responseData.totalPages ?? Math.max(1, Math.ceil(computedTotal / respPageSize));
        setPage(responseData.page ?? params.page ?? 1);
        setPageSize(respPageSize);
        setTotalPages(computedPages);
        setStats(responseData.stats ?? null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Mantém a listagem sincronizada quando o usuário volta para a aba/janela.
  // Isso resolve o caso: aprovação via link público e, ao retornar ao sistema,
  // o status ainda aparece como "Enviada" até dar refresh.
  useEffect(() => {
    fetchRef.current = () => {
      void fetchProposals();
    };
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


  // Polling leve para manter o status atualizado mesmo sem mudança de foco (ex.: aprovação em outra aba/dispositivo).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;
      fetchRef.current?.();
    }, 15000);

    return () => window.clearInterval(id);
  }, []);

  const getProposalById = async (id: string) => {
    const response = await apiClient.get<Proposal>(`/proposals/${id}`);
    return normalizeProposal(response.data);
  };

  // src/hooks/useProposals.ts

const createProposal = async (dto: any) => {
  try {
    const response = await apiClient.post<Proposal>('/proposals', dto);
    
    // Verificação de segurança: se não for objeto, a API falhou no proxy
    if (!response.data || typeof response.data !== 'object') {
      throw new Error("Resposta inválida do servidor (Proxy Error)");
    }

    const normalized = normalizeProposal(response.data);
    setProposals((prev) => [normalized, ...prev]);
    return normalized;
  } catch (error) {
    console.error("Erro ao criar proposta:", error);
    // Lançamos o erro para que o componente (Proposals.tsx) mostre o Toast de erro
    throw error; 
  }
};

const updateProposal = async (id: string, dto: any) => {
  try {
    const response = await apiClient.put<Proposal>(`/proposals/${id}`, dto);
    
    if (!response.data || typeof response.data !== 'object') {
      throw new Error("Resposta inválida do servidor");
    }

    const normalized = normalizeProposal(response.data);
    setProposals((prev) => prev.map((p) => (p.id === id ? normalized : p)));
    return normalized;
  } catch (error) {
    console.error("Erro ao atualizar proposta:", error);
    throw error;
  }
};


  const updateProposalStatus = async (id: string, status: ProposalStatus) => {
    const response = await apiClient.patch<Proposal>(`/proposals/${id}/status`, { status });
    const normalized = normalizeProposal(response.data);
    setProposals((prev) => prev.map((p) => (p.id === id ? normalized : p)));
    return normalized;
  };

  const duplicateProposal = async (id: string) => {
    const response = await apiClient.post<Proposal>(`/proposals/${id}/duplicate`);
    setProposals((prev) => [normalizeProposal(response.data), ...prev]);
    return normalizeProposal(response.data);
  };

  const approveProposal = async (id: string) => {
    const response = await apiClient.post<Proposal>(`/proposals/${id}/approve`);
    const normalized = normalizeProposal(response.data);
    setProposals((prev) => prev.map((p) => (p.id === id ? normalized : p)));
    return normalized;
  };

  const getProposalPdf = async (id: string) => {
    const response = await apiClient.get<{ id: string; fileName: string; url: string }>(`/proposals/${id}/pdf`);
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
    page,
    pageSize,
    totalPages,
    stats: stats ?? undefined,
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
