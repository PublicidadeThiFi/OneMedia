import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { CashTransaction, CashFlowType } from '../types';

export interface UseCashTransactionsParams {
  search?: string;
  flowType?: CashFlowType | string;
  categoryId?: string;
  mediaPointId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPaid?: boolean;
}

// Resposta pode ser um array direto ou um objeto paginado
type CashTransactionsResponse =
  | CashTransaction[]
  | {
      data: CashTransaction[];
      total?: number;
    };

export function useCashTransactions(params: UseCashTransactionsParams = {}) {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<CashTransactionsResponse>(
        '/cash-transactions',
        { params }
      );

      const responseData = response.data as CashTransactionsResponse;

      const data: CashTransaction[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal =
        Array.isArray(responseData) ? data.length : responseData.total ?? data.length;

      setTransactions(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (payload: unknown) => {
    const response = await apiClient.post<CashTransaction>(
      '/cash-transactions',
      payload
    );
    setTransactions((prev: CashTransaction[]) => [...prev, response.data]);
    return response.data;
  };

  const updateTransaction = async (id: string, payload: unknown) => {
    const response = await apiClient.put<CashTransaction>(
      `/cash-transactions/${id}`,
      payload
    );
    setTransactions((prev: CashTransaction[]) =>
      prev.map((t: CashTransaction) => (t.id === id ? response.data : t))
    );
    return response.data;
  };

  const deleteTransaction = async (id: string) => {
    await apiClient.delete(`/cash-transactions/${id}`);
    setTransactions((prev: CashTransaction[]) =>
      prev.filter((t: CashTransaction) => t.id !== id)
    );
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.flowType,
    params.categoryId,
    params.mediaPointId,
    params.dateFrom,
    params.dateTo,
    params.isPaid,
  ]);

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
