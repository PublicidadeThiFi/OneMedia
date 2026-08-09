import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import type { AssistantAutomation, AssistantAutomationExecution } from '../../types/assistant';
import {
  AutomationBlockedCard,
  AutomationExecutionResultCard,
  AutomationListCard,
  AutomationPreviewCard,
} from './AutomationCards';

export function AutomationPanel() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AssistantAutomation | null>(null);
  const [items, setItems] = useState<AssistantAutomation[]>([]);
  const [execution, setExecution] = useState<AssistantAutomationExecution | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const refresh = useCallback(async () => {
    const { data } = await apiClient.get<AssistantAutomation[]>('/assistant/automations');
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (open) void refresh().catch(() => setError('Não foi possível carregar as automações.'));
  }, [open, refresh]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (reason: unknown) {
      const response = typeof reason === 'object' && reason !== null && 'response' in reason
        ? reason.response
        : null;
      const data = typeof response === 'object' && response !== null && 'data' in response
        ? response.data
        : null;
      const message = typeof data === 'object' && data !== null && 'message' in data
        ? String(data.message || '')
        : '';
      setError(message || 'Não foi possível concluir a operação.');
    } finally { setBusy(false); }
  };

  const createDraft = () => act(async () => {
    const { data } = await apiClient.post('/assistant/automations/draft', { message: prompt, timezone });
    setClarification(data.clarification || null);
    setDraft(data.draft || null);
    setExecution(null);
  });

  const confirm = () => draft && act(async () => {
    const confirmation = await apiClient.post('/assistant/automations/confirm', {
      automationReference: draft.automationReference,
    });
    await apiClient.post('/assistant/automations/create', {
      automationReference: draft.automationReference,
      confirmationId: confirmation.data.confirmationId,
    });
    setDraft(null);
    setPrompt('');
    await refresh();
  });

  const command = (item: AssistantAutomation, action: 'pause' | 'resume' | 'run' | 'delete', test = false) =>
    act(async () => {
      if (action === 'delete' && !window.confirm(`Excluir a automação “${item.title}”?`)) return;
      const suffix = action === 'delete' ? { confirmed: true } : action === 'run' ? { test } : {};
      const { data } = await apiClient.post(`/assistant/automations/${action}`, { automationReference: item.automationReference, ...suffix });
      if (action === 'run') setExecution(data.execution || data);
      await refresh();
    });

  return <section className="mb-3 rounded-xl border border-indigo-100 bg-white p-3">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-indigo-700">
      <span>Automações do assistente</span><span>{open ? 'Fechar' : `${items.length} ativas`}</span>
    </button>
    {open ? <div className="mt-3 space-y-3">
      <p className="text-xs text-slate-500">Descreva uma rotina de consulta. Ela nunca altera dados operacionais e, neste incremento, é temporária e executada manualmente.</p>
      <div className="flex gap-2">
        <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: todo dia às 8h, resumir reservas vencendo" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs" />
        <button type="button" disabled={busy || !prompt.trim()} onClick={() => void createDraft()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-50">Revisar</button>
      </div>
      {clarification ? <AutomationBlockedCard message={clarification} /> : null}
      {error ? <AutomationBlockedCard message={error} /> : null}
      {draft ? <AutomationPreviewCard automation={draft} onConfirm={() => void confirm()} onCancel={() => setDraft(null)} busy={busy} /> : null}
      {execution ? <AutomationExecutionResultCard execution={execution} /> : null}
      <AutomationListCard items={items} busy={busy} onPause={(a) => void command(a, 'pause')} onResume={(a) => void command(a, 'resume')} onRun={(a, test) => void command(a, 'run', test)} onDelete={(a) => void command(a, 'delete')} />
    </div> : null}
  </section>;
}
