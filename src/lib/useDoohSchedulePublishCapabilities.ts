import { useEffect, useState } from 'react';
import apiClient from './apiClient';

/** Backend is authoritative for each company/user session. Any network error denies writes. */
export function useDoohSchedulePublishCapabilities(companyId: string, contextKey: string, enabled: boolean) {
  const [result, setResult] = useState<{ key: string; value: { publishEnabled: boolean; qaOnly: boolean } } | null>(null);
  useEffect(() => {
    if (!enabled || !companyId) { setResult(null); return; }
    const abort = new AbortController();
    setResult(null);
    void apiClient.get<unknown>('/dooh/schedules/publish-capabilities', { signal: abort.signal })
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        const response = data && typeof data === 'object' && !Array.isArray(data)
          ? data as Record<string, unknown> : {};
        const valid = typeof response.publishEnabled === 'boolean' && typeof response.qaOnly === 'boolean';
        setResult({ key: contextKey, value: valid ? { publishEnabled: response.publishEnabled as boolean, qaOnly: response.qaOnly as boolean } : { publishEnabled: false, qaOnly: true } });
      })
      .catch(() => { if (!abort.signal.aborted) setResult({ key: contextKey, value: { publishEnabled: false, qaOnly: true } }); });
    return () => abort.abort();
  }, [companyId, contextKey, enabled]);
  return enabled && result?.key === contextKey ? result.value : { publishEnabled: false, qaOnly: true };
}
