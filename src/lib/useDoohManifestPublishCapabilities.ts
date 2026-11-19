import { useEffect, useState } from 'react';
import apiClient from './apiClient';

/** Backend is authoritative for each company/user session. Any network error denies writes. */
export function useDoohManifestPublishCapabilities(companyId: string, contextKey: string, enabled: boolean) {
  const [result, setResult] = useState<{ key: string; value: { materializeEnabled: boolean; mode: 'QA' | 'PILOT' | 'DISABLED' } } | null>(null);
  useEffect(() => {
    if (!enabled || !companyId) { setResult(null); return; }
    const abort = new AbortController();
    setResult(null);
    void apiClient.get<unknown>('/dooh/manifests/publish-capabilities', { signal: abort.signal })
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        const response = data && typeof data === 'object' && !Array.isArray(data)
          ? data as Record<string, unknown> : {};
        const valid = typeof response.materializeEnabled === 'boolean' && ['QA', 'PILOT', 'DISABLED'].includes(String(response.mode)) &&
          response.materializeEnabled === (response.mode !== 'DISABLED');
        setResult({ key: contextKey, value: valid ? { materializeEnabled: response.materializeEnabled as boolean, mode: response.mode as 'QA' | 'PILOT' | 'DISABLED' } : { materializeEnabled: false, mode: 'DISABLED' as const } });
      })
      .catch(() => { if (!abort.signal.aborted) setResult({ key: contextKey, value: { materializeEnabled: false, mode: 'DISABLED' as const } }); });
    return () => abort.abort();
  }, [companyId, contextKey, enabled]);
  return enabled && result?.key === contextKey ? result.value : { materializeEnabled: false, mode: 'DISABLED' as const };
}
