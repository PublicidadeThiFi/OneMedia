import { useEffect, useState } from 'react';

type CacheEntry<T> = { value: T; ts: number };

const MAX_ENTRIES = 50;
const lru = new Map<string, CacheEntry<any>>();

function touch<T>(key: string, entry: CacheEntry<T>) {
  // LRU: delete + set moves key to the end
  if (lru.has(key)) lru.delete(key);
  lru.set(key, entry);

  // Evict oldest
  while (lru.size > MAX_ENTRIES) {
    const firstKey = lru.keys().next().value as string | undefined;
    if (!firstKey) break;
    lru.delete(firstKey);
  }
}

export function clearDashboardCache(prefix?: string) {
  if (!prefix) {
    lru.clear();
    return;
  }
  for (const k of Array.from(lru.keys())) {
    if (k.startsWith(prefix)) lru.delete(k);
  }
}

/**
 * Keeps the last successful data for a given key.
 * Useful to avoid flicker on refetches and when switching tabs.
 */
export function useCachedQueryData<T>(
  cacheKey: string,
  query: { status?: string; data?: T | null | undefined },
): T | undefined {
  const [cached, setCached] = useState<T | undefined>(() => {
    const hit = lru.get(cacheKey);
    return hit?.value as T | undefined;
  });

  // When the key changes, try to hydrate from cache immediately.
  useEffect(() => {
    const hit = lru.get(cacheKey);
    setCached(hit?.value as T | undefined);
  }, [cacheKey]);

  // Persist successful data.
  useEffect(() => {
    if (query?.status !== 'ready') return;
    if (query.data === undefined || query.data === null) return;

    const entry: CacheEntry<T> = { value: query.data, ts: Date.now() };
    touch(cacheKey, entry);
    setCached(query.data);
  }, [cacheKey, query?.status, query?.data]);

  return (query?.data ?? cached) as T | undefined;
}
