import { useCallback, useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { OwnerCompany } from '../types';

export function useOwnerCompanies(autoLoad: boolean = true) {
  const [ownerCompanies, setOwnerCompanies] = useState<OwnerCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<OwnerCompany[]>('/owner-companies');
      setOwnerCompanies(res.data ?? []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || 'Erro ao carregar empresas proprietárias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) fetchOwnerCompanies();
  }, [autoLoad, fetchOwnerCompanies]);

  const createOwnerCompany = useCallback(async (payload: Partial<OwnerCompany>) => {
    const res = await apiClient.post<OwnerCompany>('/owner-companies', {
      name: payload.name,
      document: payload.document ?? undefined,
      email: payload.email ?? undefined,
      phone: payload.phone ?? undefined,
    });
    await fetchOwnerCompanies();
    return res.data;
  }, [fetchOwnerCompanies]);

  const updateOwnerCompany = useCallback(async (id: string, payload: Partial<OwnerCompany>) => {
    const res = await apiClient.put<OwnerCompany>(`/owner-companies/${id}`, {
      name: payload.name ?? undefined,
      document: payload.document ?? undefined,
      email: payload.email ?? undefined,
      phone: payload.phone ?? undefined,
    });
    await fetchOwnerCompanies();
    return res.data;
  }, [fetchOwnerCompanies]);

  const deleteOwnerCompany = useCallback(async (id: string) => {
    await apiClient.delete(`/owner-companies/${id}`);
    await fetchOwnerCompanies();
  }, [fetchOwnerCompanies]);

  return {
    ownerCompanies,
    loading,
    error,
    refetch: fetchOwnerCompanies,
    createOwnerCompany,
    updateOwnerCompany,
    deleteOwnerCompany,
  };
}
