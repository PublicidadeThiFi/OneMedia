import { useEffect, useState } from 'react';
import apiClient from './apiClient';

/** Only the server capability can enable publication in this company/session context. */
export function useDoohPlaylistPublishCapabilities(companyId: string, contextKey: string, enabled: boolean): boolean {
  const [answer, setAnswer] = useState<{ key: string; enabled: boolean } | null>(null);
  useEffect(() => {
    if (!enabled || !companyId) { setAnswer(null); return; }
    const controller = new AbortController();
    setAnswer(null);
    void apiClient.get<unknown>('/dooh/playlists/publish-capabilities', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const allowed = Boolean(data && typeof data === 'object' && !Array.isArray(data) &&
          (data as Record<string, unknown>).publishEnabled === true);
        setAnswer({ key: contextKey, enabled: allowed });
      })
      .catch(() => { if (!controller.signal.aborted) setAnswer({ key: contextKey, enabled: false }); });
    return () => controller.abort();
  }, [companyId, contextKey, enabled]);
  return enabled && answer?.key === contextKey && answer.enabled === true;
}
