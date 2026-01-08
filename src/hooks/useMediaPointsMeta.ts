import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';

export interface MediaPointsMeta {
  cities: string[];
  states?: string[];
}

export function useMediaPointsMeta() {
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<MediaPointsMeta>('/media-points/meta');
      setCities(Array.isArray(res.data?.cities) ? res.data.cities : []);
      setStates(Array.isArray(res.data?.states) ? (res.data.states as string[]) : []);
    } catch (e: any) {
      setError(e as Error);
      setCities([]);
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { cities, states, loading, error, refetch: fetchMeta };
}
