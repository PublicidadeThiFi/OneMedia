import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { ActivityLog, ActivityResourceType } from '../types';

export interface UseActivityLogsParams {
  resourceType?: ActivityResourceType | string;
  resourceId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Resposta pode ser um array direto ou um objeto com paginação
type ActivityLogsResponse = ActivityLog[] | { data: ActivityLog[]; total?: number };

export function useActivityLogs(params: UseActivityLogsParams = {}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ActivityLogsResponse>('/activity-logs', {
        params,
      });

      // Força o TS a entender o formato da resposta
      const responseData = response.data as ActivityLogsResponse;

      const data: ActivityLog[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      const computedTotal =
        Array.isArray(responseData)
          ? data.length
          : responseData.total ?? data.length;

      setLogs(data);
      setTotal(computedTotal);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.resourceType, params.resourceId, params.userId, params.dateFrom, params.dateTo]);

  return {
    logs,
    total,
    loading,
    error,
    refetch: fetchLogs,
  };
}
