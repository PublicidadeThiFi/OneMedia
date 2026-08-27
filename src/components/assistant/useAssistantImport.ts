import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import apiClient from '../../lib/apiClient';
import type { AssistantImportSession } from '../../types/assistant';
import { ASSISTANT_ANY_PERSISTENT_IMPORTS_ENABLED } from './assistant-import-flags';

const ACTIVE_SESSION_KEY = 'assistant:persistent-client-import-session';

export function useAssistantImport(
  session: AssistantImportSession | null,
  setSession: Dispatch<SetStateAction<AssistantImportSession | null>>,
) {
  const busyRef = useRef(false);

  const refresh = useCallback(
    async (sessionId: string) => {
      const { data } = await apiClient.get<AssistantImportSession>('/assistant/imports/sessions', {
        params: { sessionId },
      });
      setSession(data);
      return data;
    },
    [setSession],
  );

  useEffect(() => {
    if (!ASSISTANT_ANY_PERSISTENT_IMPORTS_ENABLED || session) return;
    const sessionId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!sessionId) return;
    void refresh(sessionId).catch(() => {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    });
  }, [refresh, session]);

  useEffect(() => {
    if (!ASSISTANT_ANY_PERSISTENT_IMPORTS_ENABLED || !session?.sessionId) return;
    window.localStorage.setItem(ACTIVE_SESSION_KEY, session.sessionId);
  }, [session?.sessionId]);

  useEffect(() => {
    if (session?.status !== 'executing') return;
    const timer = window.setInterval(() => {
      void refresh(session.sessionId).catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refresh, session?.sessionId, session?.status]);

  const runExclusive = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    try {
      return await operation();
    } finally {
      busyRef.current = false;
    }
  }, []);

  const editImportRow = useCallback(async (rowId: string, field: string, value: unknown) => {
    if (!session) return;
    await runExclusive(async () => {
      const { data } = await apiClient.post('/assistant/imports/rows/edit', {
        sessionId: session.sessionId,
        rowId,
        field,
        value,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  const selectImportRows = useCallback(async (rowIds: string[], selected: boolean) => {
    if (!session) return;
    await runExclusive(async () => {
      const { data } = await apiClient.post('/assistant/imports/rows/select', {
        sessionId: session.sessionId,
        rowIds,
        selected,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  const removeImportRow = useCallback(async (rowId: string, deleted: boolean) => {
    if (!session) return;
    await runExclusive(async () => {
      const { data } = await apiClient.post('/assistant/imports/rows/remove', {
        sessionId: session.sessionId,
        rowId,
        deleted,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  const confirmImport = useCallback(async () => {
    if (!session) return;
    const summary = [
      'Confirmar importação',
      '',
      `Tipo: ${session.importType}`,
      `Arquivo: ${session.sourceFile.name}`,
      `Registros: ${session.summary.total}`,
      `Selecionados: ${session.summary.selected}`,
      `Inválidos: ${session.summary.invalid}`,
      '',
      'A execução usa somente actions oficiais, pode ter sucesso parcial e não oferece rollback.',
    ].join('\n');
    if (!window.confirm(summary)) return;
    await runExclusive(async () => {
      const confirmation = await apiClient.post('/assistant/imports/confirm', {
        sessionId: session.sessionId,
      });
      const { data } = await apiClient.post('/assistant/imports/execute', {
        sessionId: session.sessionId,
        confirmationId: confirmation.data.confirmationId,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  const cancelImport = useCallback(async () => {
    if (!session) return;
    await runExclusive(async () => {
      const { data } = await apiClient.post('/assistant/imports/cancel', {
        sessionId: session.sessionId,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  const retryImport = useCallback(async () => {
    if (!session) return;
    await runExclusive(async () => {
      const { data } = await apiClient.post('/assistant/imports/retry', {
        sessionId: session.sessionId,
      });
      setSession(data);
    });
  }, [runExclusive, session, setSession]);

  return {
    editImportRow,
    selectImportRows,
    removeImportRow,
    confirmImport,
    cancelImport,
    retryImport,
  };
}
