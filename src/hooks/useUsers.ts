import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { User, UserStatus, UserRoleType } from '../types';

export interface UseUsersParams {
  search?: string;
}

// Resposta pode ser um array direto ou um objeto com `data`
type UsersResponse =
  | User[]
  | {
      data: User[];
      total?: number;
    };

export function useUsers(params: UseUsersParams = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<UsersResponse>('/users', { params });

      const responseData = response.data as UsersResponse;

      const data: User[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setUsers(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (payload: unknown) => {
    const response = await apiClient.post<User>('/users', payload);
    setUsers((prev: User[]) => [...prev, response.data]);
    return response.data;
  };

  const updateUser = async (id: string, payload: unknown) => {
    const response = await apiClient.put<User>(`/users/${id}`, payload);
    setUsers((prev: User[]) =>
      prev.map((u: User) => (u.id === id ? response.data : u))
    );
    return response.data;
  };

  const updateUserStatus = async (id: string, status: UserStatus | string) => {
    const response = await apiClient.patch<User>(`/users/${id}/status`, { status });
    setUsers((prev: User[]) =>
      prev.map((u: User) => (u.id === id ? response.data : u))
    );
    return response.data;
  };

  const updateUserRoles = async (id: string, roles: UserRoleType[] | string[]) => {
    const response = await apiClient.patch<User>(`/users/${id}/roles`, { roles });
    setUsers((prev: User[]) =>
      prev.map((u: User) => (u.id === id ? response.data : u))
    );
    return response.data;
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    inviteUser,
    updateUser,
    updateUserStatus,
    updateUserRoles,
  };
}
