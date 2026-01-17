import { useEffect, useMemo, useRef } from 'react';

export type WidgetQueryState = {
  status?: 'idle' | 'loading' | 'ready' | 'error' | string;
  source?: string;
  errorMessage?: string;
};

export type WidgetMetricsContext = {
  companyId?: string;
  tab?: string;
  backendQs?: string;
};

function isEnabled(): boolean {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('dashboardMetrics');
    if (qp === '1' || qp === 'true') return true;
    return window.localStorage.getItem('dashboard.metrics') === '1';
  } catch {
    return false;
  }
}

/**
 * Logs widget timing from loading -> ready/error.
 * Enable via:
 * - localStorage.setItem('dashboard.metrics','1')
 * - ?dashboardMetrics=1
 */
export function useWidgetMetrics(widgetKey: string, q: WidgetQueryState, ctx: WidgetMetricsContext) {
  const enabled = useMemo(() => (typeof window !== 'undefined' ? isEnabled() : false), []);
  const startRef = useRef<number | null>(null);
  const lastSigRef = useRef<string>('');

  const ctxSig = `${ctx.companyId || ''}|${ctx.tab || ''}|${ctx.backendQs || ''}`;

  useEffect(() => {
    if (!enabled) return;

    if (q.status === 'loading') {
      startRef.current = performance.now();
      return;
    }

    if ((q.status === 'ready' || q.status === 'error') && startRef.current != null) {
      const ms = Math.max(0, Math.round(performance.now() - startRef.current));
      const sig = `${widgetKey}|${ctxSig}|${q.status}|${q.source || ''}|${ms}`;
      if (sig === lastSigRef.current) {
        startRef.current = null;
        return;
      }
      lastSigRef.current = sig;

      const payload = {
        widgetKey,
        status: q.status,
        ms,
        source: q.source,
        companyId: ctx.companyId,
        tab: ctx.tab,
        backendQs: ctx.backendQs,
        error: q.status === 'error' ? q.errorMessage || 'unknown' : undefined,
      };

      if (ms >= 1500) {
        console.warn('[dashboard][widget]', payload);
      } else {
        console.info('[dashboard][widget]', payload);
      }

      startRef.current = null;
    }
  }, [enabled, widgetKey, ctxSig, q.status, q.source, q.errorMessage, ctx.companyId, ctx.tab, ctx.backendQs]);
}
