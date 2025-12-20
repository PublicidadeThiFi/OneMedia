import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { TransactionCategory } from '../types';

// Resposta pode ser um array direto ou um objeto paginado
type TransactionCategoriesResponse = TransactionCategory[] | { data: TransactionCategory[]; total?: number };

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeCategory(raw: any): TransactionCategory {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt) ?? new Date(),
    updatedAt: toDate(raw.updatedAt) ?? new Date(),
  } as TransactionCategory;
}

function pickPayload(payload: Partial<TransactionCategory>) {
  const out: any = {};
  if (payload.name !== undefined) out.name = payload.name;
  return out;
}

export function useTransactionCategories() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<TransactionCategoriesResponse>('/transaction-categories');
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setCategories((data ?? []).map(normalizeCategory));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const createCategory = async (payload: Partial<TransactionCategory>) => {
    try {
      setError(null);
      const response = await apiClient.post('/transaction-categories', pickPayload(payload));
      setCategories((prev) => [normalizeCategory(response.data), ...prev]);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar categoria');
      throw err;
    }
  };

  const updateCategory = async (id: string, payload: Partial<TransactionCategory>) => {
    try {
      setError(null);
      const response = await apiClient.put(`/transaction-categories/${id}`, pickPayload(payload));
      setCategories((prev) => prev.map((c) => (c.id === id ? normalizeCategory(response.data) : c)));
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar categoria');
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setError(null);
      await apiClient.delete(`/transaction-categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar categoria');
      throw err;
    }
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
