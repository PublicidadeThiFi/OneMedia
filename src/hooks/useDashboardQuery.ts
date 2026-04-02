import { useEffect, useRef, useState } from 'react';
import { isDashboardDiagnosticsEnabled, recordDashboardDiagnostic } from '../dashboard/diagnostics';

export type DashboardDataMode = 'backend';

export type DashboardQuerySource = 'backend';

export type DashboardQueryState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: T;
  errorMessage?: string;
  source: DashboardQuerySource;
  refetch: () => void;
};

type UseDashboardQueryArgs<T> = {
  enabled: boolean;
  mode?: DashboardDataMode;
  deps: unknown[];
  fetcher?: (signal: AbortSignal) => Promise<T>;
  queryKey?: string;
};

function errorToMessage(err: unknown): string {
  if (!err) return 'Erro inesperado';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Erro inesperado';

  const anyErr = err as any;
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message.trim();

  try {
    return JSON.stringify(err);
  } catch {
    return 'Erro inesperado';
  }
}

function stringifyDep(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return `[${value.map(stringifyDep).join(',')}]`;
  if (value instanceof Date) return value.toISOString();

  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function depsToSignature(deps: unknown[]): string {
  return deps.map(stringifyDep).join('|');
}

export function useDashboardQuery<T>(args: UseDashboardQueryArgs<T>): DashboardQueryState<T> {
  const { enabled, deps, fetcher, queryKey } = args;
  const [nonce, setNonce] = useState(0);

  const [state, setState] = useState<Omit<DashboardQueryState<T>, 'refetch'>>({
    status: enabled ? 'loading' : 'idle',
    data: undefined,
    errorMessage: undefined,
    source: 'backend',
  });

  const sourceHint: DashboardQuerySource = 'backend';
  const depsSignature = depsToSignature(deps);
  const fetcherRef = useRef<UseDashboardQueryArgs<T>['fetcher'] | undefined>(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    const debugEnabled = isDashboardDiagnosticsEnabled();
    const stableQueryKey = queryKey || 'dashboard-query';

    if (debugEnabled) {
      recordDashboardDiagnostic({
        kind: 'effect-start',
        queryKey: stableQueryKey,
        message: enabled ? 'Effect da query iniciado.' : 'Effect da query avaliado com enabled=false.',
        details: {
          enabled,
          depsSignature,
          nonce,
        },
      });
    }

    if (!enabled) {
      setState({ status: 'idle', data: undefined, errorMessage: undefined, source: sourceHint });
      return;
    }

    const activeFetcher = fetcherRef.current;
    if (!activeFetcher) {
      const message = 'Fetcher não configurado para o Dashboard.';
      setState({
        status: 'error',
        data: undefined,
        errorMessage: message,
        source: sourceHint,
      });

      if (debugEnabled) {
        recordDashboardDiagnostic({
          kind: 'warning',
          queryKey: stableQueryKey,
          message,
          details: {
            depsSignature,
          },
        });
      }
      return;
    }

    setState((s) => ({ ...s, status: 'loading', errorMessage: undefined, source: sourceHint }));

    const controller = new AbortController();

    const run = async () => {
      try {
        const data = await activeFetcher(controller.signal);
        if (controller.signal.aborted) return;
        setState({ status: 'ready', data, errorMessage: undefined, source: 'backend' });
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = errorToMessage(e);
        setState({ status: 'error', data: undefined, errorMessage: msg, source: sourceHint });
      }
    };

    run();

    return () => {
      if (debugEnabled) {
        recordDashboardDiagnostic({
          kind: 'effect-cleanup',
          queryKey: stableQueryKey,
          message: 'Cleanup do effect da query executado; abortando requisição em andamento.',
          details: {
            depsSignature,
            nonce,
          },
        });
      }
      controller.abort();
    };
  }, [enabled, nonce, sourceHint, depsSignature, queryKey]);

  return {
    ...state,
    refetch: () => setNonce((n) => n + 1),
  };
}
