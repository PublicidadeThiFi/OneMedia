import { useEffect, useMemo, useState } from 'react';

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

export function useDashboardQuery<T>(args: UseDashboardQueryArgs<T>): DashboardQueryState<T> {
  const { enabled, deps, fetcher } = args;
  const [nonce, setNonce] = useState(0);

  const [state, setState] = useState<Omit<DashboardQueryState<T>, 'refetch'>>({
    status: enabled ? 'loading' : 'idle',
    data: undefined,
    errorMessage: undefined,
    source: 'backend',
  });

  const sourceHint: DashboardQuerySource = useMemo(() => 'backend', []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: undefined, errorMessage: undefined, source: sourceHint });
      return;
    }

    if (!fetcher) {
      setState({
        status: 'error',
        data: undefined,
        errorMessage: 'Fetcher não configurado para o Dashboard.',
        source: sourceHint,
      });
      return;
    }

    setState((s) => ({ ...s, status: 'loading', errorMessage: undefined, source: sourceHint }));

    const controller = new AbortController();

    const run = async () => {
      try {
        const data = await fetcher(controller.signal);
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
      controller.abort();
    };
  }, [enabled, nonce, sourceHint, fetcher, ...deps]);

  return {
    ...state,
    refetch: () => setNonce((n) => n + 1),
  };
}
