import { useEffect, useState } from 'react';
import apiClient from './apiClient';

export type DoohMediaPilotCapabilities = Readonly<{ uploadEnabled: boolean; processingEnabled: boolean; autoProcessingEnabled: boolean }>;
const disabled = Object.freeze({ uploadEnabled: false, processingEnabled: false, autoProcessingEnabled: false });

/** Server is authoritative: neither env flags nor DOOH FULL alone enable writes. */
export function useDoohMediaPilotCapabilities(companyId: string, contextKey: string, enabled: boolean): DoohMediaPilotCapabilities {
  const [result, setResult] = useState<{ key: string; data: DoohMediaPilotCapabilities } | null>(null);
  useEffect(() => {
    if (!enabled || !companyId) { setResult(null); return; }
    const abort = new AbortController();
    setResult(null);
    void apiClient.get<unknown>('/dooh/media/capabilities', { signal: abort.signal })
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        const response = data && typeof data === 'object' && !Array.isArray(data)
          ? data as Record<string, unknown> : {};
        const valid = typeof response.uploadEnabled === 'boolean' &&
          typeof response.processingEnabled === 'boolean';
        setResult({ key: contextKey, data: valid ? {
          uploadEnabled: response.uploadEnabled as boolean,
          processingEnabled: response.processingEnabled as boolean,
          autoProcessingEnabled: response.autoProcessingEnabled === true && response.processingEnabled === true,
        } : disabled });
      })
      .catch(() => { if (!abort.signal.aborted) setResult({ key: contextKey, data: disabled }); });
    return () => abort.abort();
  }, [companyId, contextKey, enabled]);
  return result?.key === contextKey && enabled ? result.data : disabled;
}
