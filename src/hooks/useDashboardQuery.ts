import { useEffect, useMemo, useState } from 'react';

export type DashboardDataMode = 'mock' | 'backend';

export type DashboardQuerySource = 'mock' | 'backend' | 'mock-fallback';

export type DashboardQueryState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: T;
  errorMessage?: string;
  source: DashboardQuerySource;
  refetch: () => void;
};

type UseDashboardQueryArgs<T> = {
  enabled: boolean;
  mode: DashboardDataMode;
  deps: unknown[];

  /**
   * Modo backend: função que busca no servidor.
   * Recebe AbortSignal para cancelar fetch.
   */
  fetcher?: (signal: AbortSignal) => Promise<T>;

  /**
   * Mock local (Etapas 1-3). Mantemos como fallback.
   */
  computeMock: () => T;

  /**
   * Quando em modo mock, simula latência.
   */
  mockDelayMs?: number;

  /**
   * Se o backend falhar, tenta voltar para mock automaticamente.
   */
  fallbackToMock?: boolean;
};

function errorToMessage(err: unknown): string {
  if (!err) return 'Erro inesperado';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Erro inesperado';

  // DashboardHttpError (services/dashboard.ts)
  const anyErr = err as any;
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message.trim();

  try {
    return JSON.stringify(err);
  } catch {
    return 'Erro inesperado';
  }
}

export function useDashboardQuery<T>(args: UseDashboardQueryArgs<T>): DashboardQueryState<T> {
  const {
    enabled,
    mode,
    deps,
    fetcher,
    computeMock,
    mockDelayMs = 220,
    fallbackToMock = true,
  } = args;

  const [nonce, setNonce] = useState(0);

  const [state, setState] = useState<Omit<DashboardQueryState<T>, 'refetch'>>({
    status: enabled ? 'loading' : 'idle',
    data: undefined,
    errorMessage: undefined,
    source: mode === 'backend' ? 'backend' : 'mock',
  });

  // Normaliza um "source" inicial (evita flicker quando alterna o mode)
  const sourceHint: DashboardQuerySource = useMemo(() => {
    return mode === 'backend' ? 'backend' : 'mock';
  }, [mode]);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: undefined, errorMessage: undefined, source: sourceHint });
      return;
    }

    setState((s) => ({ ...s, status: 'loading', errorMessage: undefined, source: sourceHint }));

    const controller = new AbortController();
    let timer: number | undefined;

    const run = async () => {
      try {
        if (mode === 'backend') {
          if (!fetcher) {
            throw new Error('Fetcher não configurado para modo backend');
          }

          const data = await fetcher(controller.signal);
          if (controller.signal.aborted) return;
          setState({ status: 'ready', data, errorMessage: undefined, source: 'backend' });
          return;
        }

        // Modo mock (simula latência)
        await new Promise<void>((resolve) => {
          timer = window.setTimeout(() => resolve(), mockDelayMs);
        });
        if (controller.signal.aborted) return;

        const data = computeMock();
        if (controller.signal.aborted) return;
        setState({ status: 'ready', data, errorMessage: undefined, source: 'mock' });
      } catch (e) {
        if (controller.signal.aborted) return;

        // Se o backend falhar, tenta fallback para mock.
        if (mode === 'backend' && fallbackToMock) {
          try {
            const data = computeMock();
            setState({ status: 'ready', data, errorMessage: undefined, source: 'mock-fallback' });
            return;
          } catch (e2) {
            // segue para erro
            const msg = errorToMessage(e2);
            setState({ status: 'error', data: undefined, errorMessage: msg, source: 'backend' });
            return;
          }
        }

        const msg = errorToMessage(e);
        setState({ status: 'error', data: undefined, errorMessage: msg, source: sourceHint });
      }
    };

    run();

    return () => {
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, nonce, sourceHint, ...deps]);

  return {
    ...state,
    refetch: () => setNonce((n) => n + 1),
  };
}
