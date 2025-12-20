import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { BillingInvoice, BillingStatus } from '../types';

export interface UseBillingInvoicesParams {
  search?: string;
  status?: BillingStatus | string;
  clientId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

// Resposta pode ser um array direto ou um objeto paginado
type BillingInvoicesResponse =
  | BillingInvoice[]
  | {
      data: BillingInvoice[];
      total?: number;
    };

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeInvoice(raw: any): BillingInvoice {
  // Mantém os campos extras que o backend já devolve (clientName, proposalTitle, campaignName)
  return {
    ...raw,
    dueDate: toDate(raw?.dueDate) ?? new Date(),
    paidAt: toDate(raw?.paidAt),
    createdAt: toDate(raw?.createdAt) ?? new Date(),
    updatedAt: toDate(raw?.updatedAt) ?? new Date(),
  } as BillingInvoice;
}

function pickUpdatePayload(payload: Partial<BillingInvoice>) {
  // Evita enviar campos que não existem no DTO do backend
  const out: any = {};
  if (payload.amountCents !== undefined) out.amountCents = payload.amountCents;
  if (payload.dueDate !== undefined) out.dueDate = payload.dueDate;
  if (payload.status !== undefined) out.status = payload.status;
  if (payload.paymentMethod !== undefined) out.paymentMethod = payload.paymentMethod;
  if (payload.gatewayInvoiceId !== undefined) out.gatewayInvoiceId = payload.gatewayInvoiceId;
  if (payload.generateNf !== undefined) out.generateNf = payload.generateNf;
  return out;
}

export function useBillingInvoices(params: UseBillingInvoicesParams = {}) {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<BillingInvoicesResponse>('/billing-invoices', { params });
      const responseData = response.data as BillingInvoicesResponse;

      const rawData: BillingInvoice[] = Array.isArray(responseData) ? responseData : responseData.data;
      const data = rawData.map(normalizeInvoice);

      const computedTotal = Array.isArray(responseData) ? data.length : responseData.total ?? data.length;

      setInvoices(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (payload: unknown) => {
    const response = await apiClient.post<BillingInvoice>('/billing-invoices', payload);
    const created = normalizeInvoice(response.data);
    setInvoices((prev) => [...prev, created]);
    return created;
  };

  const updateInvoice = async (id: string, payload: Partial<BillingInvoice>) => {
    const response = await apiClient.put<BillingInvoice>(`/billing-invoices/${id}`, pickUpdatePayload(payload));
    const updated = normalizeInvoice(response.data);
    setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  const markAsPaid = async (id: string) => {
    const response = await apiClient.patch<BillingInvoice>(`/billing-invoices/${id}/mark-paid`);
    const updated = normalizeInvoice(response.data);
    setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search, params.status, params.clientId, params.dueDateFrom, params.dueDateTo]);

  return {
    invoices,
    total,
    loading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    markAsPaid,
  };
}
