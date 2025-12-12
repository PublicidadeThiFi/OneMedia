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
type BillingInvoicesResponse = BillingInvoice[] | {
  data: BillingInvoice[];
  total?: number;
};

export function useBillingInvoices(params: UseBillingInvoicesParams = {}) {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<BillingInvoicesResponse>(
        '/billing-invoices',
        { params }
      );

      const responseData = response.data as BillingInvoicesResponse;

      const data: BillingInvoice[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal =
        Array.isArray(responseData)
          ? data.length
          : responseData.total ?? data.length;

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
    setInvoices((prev: BillingInvoice[]) => [...prev, response.data]);
    return response.data;
  };

  const updateInvoice = async (id: string, payload: unknown) => {
    const response = await apiClient.put<BillingInvoice>(`/billing-invoices/${id}`, payload);
    setInvoices((prev: BillingInvoice[]) =>
      prev.map((i: BillingInvoice) => (i.id === id ? response.data : i))
    );
    return response.data;
  };

  const markAsPaid = async (id: string) => {
    const response = await apiClient.patch<BillingInvoice>(
      `/billing-invoices/${id}/mark-paid`
    );
    setInvoices((prev: BillingInvoice[]) =>
      prev.map((i: BillingInvoice) => (i.id === id ? response.data : i))
    );
    return response.data;
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
