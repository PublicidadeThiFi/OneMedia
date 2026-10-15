import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohSchedule, parseDoohScheduleTargets,
  type DoohScheduleSummary, type DoohScheduleTargetInventory } from '../lib/doohScheduleCatalogContract';
import { buildSchedulePublishCas, canPublishDoohSchedule, parseSchedulePublishReceipt,
  publishSnapshotMatches, schedulePublishError } from '../lib/doohSchedulePublishCasContract';

const qaUiEnabled = import.meta.env.MODE === 'qa' && import.meta.env.VITE_DOOH_SCHEDULE_PUBLISH_QA_ENABLED === 'true';
const shortId = (value: string) => `${value.slice(0, 8)}…`;
const targetNames = { PLAYER: 'Player', GROUP: 'Grupo', MEDIA_UNIT: 'Tela', MEDIA_POINT: 'Ponto' } as const;
interface Props { companyId: string; summary: DoohScheduleSummary; inventory: DoohScheduleTargetInventory; onChanged: () => void }

/** QA-only publication of one verified DRAFT. Nothing is activated or sent to a device. */
export function DoohSchedulePublishQa({ companyId, summary, inventory, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const moduleAccess = snapshot?.modules.DOOH;
  const allowed = user?.companyId === companyId && canPublishDoohSchedule(companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, user?.roles ?? []);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, [...(user?.roles ?? [])].sort(), summary.id,
    summary.updatedAt, inventory.updatedAt, inventory.targets]);
  const latestKey = useRef(contextKey); latestKey.current = contextKey;
  const pending = useRef<AbortController | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    pending.current?.abort(); setBusy(false); setConfirmation(''); setError(''); setNotice('');
    return () => pending.current?.abort();
  }, [contextKey]);
  const body = buildSchedulePublishCas(summary, inventory);
  const ready = allowed && qaUiEnabled && !busy && body !== null && confirmation === 'PUBLICAR AGENDA';

  async function publish() {
    if (!ready || !body) return;
    if (!window.confirm(`PUBLICAÇÃO QA da agenda "${summary.name}"?\n` +
      `${summary.targetCount} destino(s), prioridade ${summary.priority}, janela ${summary.startsAt} — ${summary.endsAt}.\n` +
      'Esta operação grava PUBLISHED no banco. NÃO distribui manifest ou ativa players.')) return;
    const controller = new AbortController(); pending.current = controller;
    const key = contextKey;
    const valid = () => !controller.signal.aborted && latestKey.current === key;
    setBusy(true); setError(''); setNotice('');
    try {
      const detail = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}`, { signal: controller.signal });
      if (!valid()) return;
      const freshSchedule = parseDoohSchedule(detail.data, companyId);
      if (!freshSchedule || freshSchedule.id !== summary.id || JSON.stringify(freshSchedule) !== JSON.stringify(summary)) {
        setError('Agenda alterada desde a revisão. Atualize o catálogo.'); return;
      }
      const links = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/targets`, { signal: controller.signal });
      if (!valid()) return;
      const freshTargets = parseDoohScheduleTargets(links.data, companyId, freshSchedule);
      if (!freshTargets || !publishSnapshotMatches(summary, freshSchedule, inventory, freshTargets)) {
        setError('Destinos alterados desde a revisão. Atualize o catálogo.'); return;
      }
      const response = await apiClient.post<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/publish-cas`, body,
        { signal: controller.signal });
      if (!valid()) return;
      const receipt = parseSchedulePublishReceipt(response.data, summary);
      if (!receipt) { setError('Resposta não confirmada. Consulte a agenda antes de repetir.'); return; }
      setConfirmation('');
      setNotice(`Agenda registrada como PUBLISHED em ${new Date(receipt.publishedAt).toLocaleString('pt-BR')}. ` +
        `Players alcançados na validação: ${receipt.activePlayerCount}. Nenhum manifest foi distribuído.`);
      onChanged();
    } catch (cause: unknown) { if (valid()) setError(schedulePublishError(cause)); }
    finally { if (pending.current === controller) pending.current = null; if (valid()) setBusy(false); }
  }

  if (!allowed) return <p className="text-xs text-gray-600">Publicação QA requer DOOH FULL, empresa correta e papel técnico.</p>;
  if (summary.status !== 'DRAFT') return null;
  return <section aria-label="Publicação QA de agenda D15D-05" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/40 p-4">
    <h4 className="text-sm font-semibold text-gray-900">Revisão de publicação — QA somente</h4>
    <p className="text-xs text-amber-900">A publicação altera o estado persistido da agenda. Não gera manifests, não atualiza players e não comprova reprodução. Operação bloqueada em produção.</p>
    <div className="grid gap-1 text-xs text-gray-700">
      <p><strong>Agenda:</strong> {summary.name} · {shortId(summary.id)}</p>
      <p><strong>Playlist:</strong> {shortId(summary.playlistVersionId)} · <strong>Prioridade:</strong> {summary.priority}</p>
      <p><strong>Fuso:</strong> {summary.timezone} · <strong>Janela:</strong> {summary.startsAt ?? 'Sem início'} → {summary.endsAt ?? 'Sem fim'}</p>
      <p><strong>Faixa diária:</strong> {summary.dailyStartMinute ?? '—'} — {summary.dailyEndMinute ?? '—'} · <strong>Dias ISO:</strong> {summary.weekdays.join(', ') || 'Todos'}</p>
      <p><strong>Destinos:</strong> {inventory.targets.length} vínculo(s) revisado(s)</p>
    </div>
    <ul className="max-h-36 overflow-auto space-y-1 text-xs text-gray-700">
      {inventory.targets.map((target) => <li key={target.id}>{targetNames[target.targetType]} · {shortId(target.targetId)}</li>)}
    </ul>
    {!body && <p role="status" className="text-xs text-amber-900">Publicação indisponível: agenda deve ter janela finita e destinos consistentes. Recarregue antes de revisar.</p>}
    {!qaUiEnabled && <p className="text-xs text-amber-900">Publicação desabilitada neste build. Não ative variáveis de QA.</p>}
    <label className="block text-xs text-gray-800">Digite PUBLICAR AGENDA para confirmar
      <input aria-label="Confirmação textual de publicação de agenda" value={confirmation} maxLength={20}
        onChange={(event) => setConfirmation(event.target.value)} disabled={busy || !qaUiEnabled || !body}
        className="mt-1 block w-full rounded-md border bg-white p-2" />
    </label>
    <Button type="button" disabled={!ready} onClick={() => { void publish(); }}>{busy ? 'Conferindo…' : 'Publicar agenda em QA'}</Button>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
  </section>;
}
