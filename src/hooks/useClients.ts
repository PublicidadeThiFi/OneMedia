import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Client, ClientStatus } from '../types';

export interface UseClientsParams {
  search?: string;
  status?: string | ClientStatus;
  ownerUserId?: string;
  page?: number;
  pageSize?: number;

  /**
   * No backend, o parâmetro se chama "orderBy" e aceita "name" | "createdAt".
   * Mantemos "sortBy" aqui por compatibilidade com componentes já existentes.
   */
  sortBy?: 'name' | 'createdAt' | string;
  sortOrder?: 'asc' | 'desc';
}

// Resposta pode ser um array direto ou um objeto paginado
type ClientsResponse = Client[] | { data: Client[]; total?: number };

export function useClients(params: UseClientsParams = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiParams: any = {
        search: params.search,
        status: params.status,
        ownerUserId: params.ownerUserId,
        page: params.page,
        pageSize: params.pageSize,
        orderBy: params.sortBy,
        sortOrder: params.sortOrder,
      };

      // compat: alguns lugares usam "contactName" como sortBy
      if (apiParams.orderBy === 'contactName') apiParams.orderBy = 'name';

      const response = await apiClient.get<ClientsResponse>('/clients', {
        params: apiParams,
      });

      const responseData = response.data;

      const data: Client[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal = Array.isArray(responseData)
        ? data.length
        : responseData.total ?? data.length;

      setClients(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (data: Partial<Client>) => {
    const response = await apiClient.post<Client>('/clients', data);
    setClients((prev: Client[]) => [...prev, response.data]);
    return response.data;
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    const response = await apiClient.put<Client>(`/clients/${id}`, data);
    setClients((prev: Client[]) =>
      prev.map((c: Client) => (c.id === id ? response.data : c)),
    );
    return response.data;
  };

  const deleteClient = async (id: string) => {
    await apiClient.delete(`/clients/${id}`);
    setClients((prev: Client[]) => prev.filter((c: Client) => c.id !== id));
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.status,
    params.ownerUserId,
    params.page,
    params.pageSize,
    params.sortBy,
    params.sortOrder,
  ]);

  return {
    clients,
    total,
    loading,
    error,
    refetch: fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}
