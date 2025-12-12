import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { PlatformPlan } from '../types';

// Resposta pode ser um array direto ou um objeto com `data`
type PlatformPlansResponse =
  | PlatformPlan[]
  | {
      data: PlatformPlan[];
      total?: number;
    };

export function usePlatformPlans() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<PlatformPlansResponse>('/platform-plans');

      const responseData = response.data as PlatformPlansResponse;

      const data: PlatformPlan[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setPlans(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
  };
}
