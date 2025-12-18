import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';

export interface ClientOwnerOption {
  id: string;
  name: string;
  email: string;
}

let ownersCache: ClientOwnerOption[] | null = null;
let ownersPromise: PromiseLike<ClientOwnerOption[]> | null = null;

function fetchOwners(): PromiseLike<ClientOwnerOption[]> {
  if (ownersCache) return Promise.resolve(ownersCache);
  if (ownersPromise) return ownersPromise;

  ownersPromise = apiClient
    .get<ClientOwnerOption[]>('/clients/owners')
    .then((res) => {
      ownersCache = res.data ?? [];
      return ownersCache;
    })
    .then(
      (data) => {
        ownersPromise = null;
        return data;
      },
      (err) => {
        ownersPromise = null;
        throw err;
      }
    );

  return ownersPromise;
}

export function useClientOwners() {
  const [owners, setOwners] = useState<ClientOwnerOption[]>(ownersCache ?? []);
  const [loading, setLoading] = useState<boolean>(!ownersCache);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      ownersCache = null;
      ownersPromise = null;

      const data = await fetchOwners();
      setOwners(data as ClientOwnerOption[]);
      return data as ClientOwnerOption[];
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(!ownersCache);
        setError(null);

        const data = await fetchOwners();
        if (!cancelled) setOwners(data as ClientOwnerOption[]);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const ownersById = useMemo(() => {
    const map = new Map<string, ClientOwnerOption>();
    for (const o of owners) map.set(o.id, o);
    return map;
  }, [owners]);

  return { owners, ownersById, loading, error, refetch };
}
