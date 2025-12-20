import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { CashTransaction } from '../types';

export interface UseCashTransactionsParams {
  search?: string;
  flowType?: string;
  categoryId?: string;
  /** formato YYYY-MM-DD */
  dateFrom?: string;
  /** formato YYYY-MM-DD */
  dateTo?: string;
}

// Resposta pode ser um array direto ou um objeto paginado
type CashTransactionsResponse =
  | CashTransaction[]
  | {
      data: CashTransaction[];
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

function normalizeTransaction(raw: any): CashTransaction {
  return {
    ...raw,
    date: toDate(raw?.date) ?? new Date(),
    createdAt: toDate(raw?.createdAt) ?? new Date(),
    updatedAt: toDate(raw?.updatedAt) ?? new Date(),
  } as CashTransaction;
}

function pickPayload(payload: Partial<CashTransaction>) {
  // Evita enviar campos que não existem no DTO do backend
  return {
    date: payload.date,
    description: payload.description,
    partnerName: payload.partnerName,
    categoryId: payload.categoryId,
    tags: payload.tags,
    amount: payload.amount,
    flowType: payload.flowType,
    paymentType: payload.paymentType,
    paymentMethod: payload.paymentMethod,
    isPaid: payload.isPaid,
    billingInvoiceId: payload.billingInvoiceId,
    mediaPointId: payload.mediaPointId,
  };
}

export function useCashTransactions(params: UseCashTransactionsParams = {}) {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<CashTransactionsResponse>('/cash-transactions', { params });
      const responseData = response.data as CashTransactionsResponse;

      const rawData = Array.isArray(responseData) ? responseData : responseData.data;
      const data = (rawData ?? []).map(normalizeTransaction);

      setTransactions(data);
      setTotal(Array.isArray(responseData) ? data.length : responseData.total ?? data.length);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search, params.flowType, params.categoryId, params.dateFrom, params.dateTo]);

  const createTransaction = async (payload: Partial<CashTransaction>) => {
    const response = await apiClient.post<CashTransaction>('/cash-transactions', pickPayload(payload));
    const created = normalizeTransaction(response.data);
    setTransactions((prev) => [created, ...prev]);
    setTotal((prev) => prev + 1);
    return created;
  };

  const updateTransaction = async (id: string, payload: Partial<CashTransaction>) => {
    const response = await apiClient.put<CashTransaction>(`/cash-transactions/${id}`, pickPayload(payload));
    const updated = normalizeTransaction(response.data);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTransaction = async (id: string) => {
    await apiClient.delete(`/cash-transactions/${id}`);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  return {
    transactions,
    total,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
