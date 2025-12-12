import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { TransactionCategory } from '../types';

// Resposta pode ser um array direto ou um objeto com `data`
type TransactionCategoriesResponse =
  | TransactionCategory[]
  | {
      data: TransactionCategory[];
      total?: number;
    };

export function useTransactionCategories() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<TransactionCategoriesResponse>(
        '/transaction-categories'
      );

      const responseData = response.data as TransactionCategoriesResponse;

      const data: TransactionCategory[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setCategories(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (payload: Partial<TransactionCategory>) => {
    const response = await apiClient.post<TransactionCategory>(
      '/transaction-categories',
      payload
    );
    setCategories((prev: TransactionCategory[]) => [...prev, response.data]);
    return response.data;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
  };
}
