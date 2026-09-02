import { useCallback, useEffect, useState } from 'react';
import { fetchPublicPricingCatalog } from '../lib/publicPricingCatalog';
import type { PublicPricingCatalogResponse } from '../types/pricingCatalog';

let cachedCatalog: PublicPricingCatalogResponse | null = null;
let catalogRequest: Promise<PublicPricingCatalogResponse> | null = null;

async function loadCatalog(force = false): Promise<PublicPricingCatalogResponse> {
  if (!force && cachedCatalog) return cachedCatalog;

  if (!force && catalogRequest) return catalogRequest;

  catalogRequest = fetchPublicPricingCatalog()
    .then((catalog) => {
      cachedCatalog = catalog;
      return catalog;
    })
    .finally(() => {
      catalogRequest = null;
    });

  return catalogRequest;
}

export function usePublicPricingCatalog() {
  const [catalog, setCatalog] = useState<PublicPricingCatalogResponse | null>(cachedCatalog);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [error, setError] = useState<Error | null>(null);

  const fetchCatalog = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const next = await loadCatalog(force);
      setCatalog(next);
      return next;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Não foi possível carregar os planos.');
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (cachedCatalog) {
      setCatalog(cachedCatalog);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void loadCatalog()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Não foi possível carregar os planos.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalog,
    plans: catalog?.plans ?? [],
    loading,
    error,
    refetch: () => fetchCatalog(true),
  };
}
