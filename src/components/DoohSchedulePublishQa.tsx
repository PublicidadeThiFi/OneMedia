import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useDoohSchedulePublishCapabilities } from '../lib/useDoohSchedulePublishCapabilities';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohSchedule, parseDoohScheduleTargets,
  type DoohScheduleSummary, type DoohScheduleTargetInventory } from '../lib/doohScheduleCatalogContract';
import { buildSchedulePublishCas, canPublishDoohSchedule, parseSchedulePublishReceipt,
  publishSnapshotMatches, schedulePublishError } from '../lib/doohSchedulePublishCasContract';

const qaUiEnabled = import.meta.env.MODE === 'qa' && import.meta.env.VITE_DOOH_SCHEDULE_PUBLISH_QA_ENABLED === 'true';
const shortId = (value: string) => `${value.slice(0, 8)}…`;
const targetNames = { PLAYER: 'Tela', GROUP: 'Grupo', MEDIA_UNIT: 'Tela do Marketplace', MEDIA_POINT: 'Ponto do Marketplace' } as const;
interface Props { companyId: string; summary: DoohScheduleSummary; inventory: DoohScheduleTargetInventory; onChanged: () => void }

/** Reviewed CAS publication in isolated QA or an approved three-tenant pilot. No runtime delivery. */
const PRIORITY: Record<string, string> = { TAKEOVER: 'Prioritária', STANDARD: 'Padrão', FALLBACK: 'Reserva' };
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const when = (iso: string | null) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'sem data';
const hhmm = (minute: number | null) => minute === null ? '—' : `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function DoohSchedulePublishQa({ companyId, summary, inventory, onChanged }: Props) {
  const { ask, confirmUi } = useInlineConfirm();
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const moduleAccess = snapshot?.modules.DOOH;
  const allowed = user?.companyId === companyId && canPublishDoohSchedule(companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, user?.roles ?? []);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, [...(user?.roles ?? [])].sort(), summary.id,
    summary.updatedAt, inventory.updatedAt, inventory.targets]);
  const backend = useDoohSchedulePublishCapabilities(companyId, contextKey, allowed);
  const publishUiEnabled = backend.publishEnabled && (!backend.qaOnly || qaUiEnabled);
  const latestKey = useRef(contextKey); latestKey.current = contextKey;
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    pending.current?.abort(); setBusy(false); setError(''); setNotice('');
    return () => pending.current?.abort();
  }, [contextKey]);
  const body = buildSchedulePublishCas(summary, inventory);
  const ready = allowed && publishUiEnabled && !busy && body !== null;

  async function publish() {
    if (!ready || !body) return;
    // F13: a summary box replaces typing "PUBLICAR AGENDA"; the server still checks every version before publishing.
    if (!await ask(`Publicar a agenda "${summary.name}"?\n` +
      `${inventory.targets.length} tela(s) · prioridade ${PRIORITY[summary.priority]} · ${when(summary.startsAt)} até ${when(summary.endsAt)}.\n` +
      'Depois, envie para cada TV em Minhas telas.', 'Publicar agenda')) return;
    const controller = new AbortController(); pending.current = controller;
    const key = contextKey;
    const valid = () => !controller.signal.aborted && latestKey.current === key;
    setBusy(true); setError(''); setNotice('');
    try {
      const detail = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}`, { signal: controller.signal });
      if (!valid()) return;
      const freshSchedule = parseDoohSchedule(detail.data, companyId);
      if (!freshSchedule || freshSchedule.id !== summary.id || JSON.stringify(freshSchedule) !== JSON.stringify(summary)) {
        setError('Esta programação mudou. Atualize e confira de novo.'); return;
      }
      const links = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/targets`, { signal: controller.signal });
      if (!valid()) return;
      const freshTargets = parseDoohScheduleTargets(links.data, companyId, freshSchedule);
      if (!freshTargets || !publishSnapshotMatches(summary, freshSchedule, inventory, freshTargets)) {
        setError('As telas mudaram. Atualize e confira de novo.'); return;
      }
      const response = await apiClient.post<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/publish-cas`, body,
        { signal: controller.signal });
      if (!valid()) return;
      const receipt = parseSchedulePublishReceipt(response.data, summary);
      if (!receipt) { setError('Não conseguimos confirmar a publicação. Atualize a agenda para conferir.'); return; }
      setNotice(`Agenda publicada em ${new Date(receipt.publishedAt).toLocaleString('pt-BR')}. ` +
        `${receipt.activePlayerCount} aparelho(s) ativo(s) nas telas escolhidas. Nada foi enviado às TVs ainda.`);
      onChanged();
    } catch (cause: unknown) { if (valid()) setError(schedulePublishError(cause)); }
    finally { if (pending.current === controller) pending.current = null; if (valid()) setBusy(false); }
  }

  if (!allowed) return <p className="text-xs text-gray-600">Só administradores com acesso completo podem publicar.</p>;
  if (summary.status !== 'DRAFT') return null;
  return <section aria-label="Publicar agenda" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/40 p-4">
    <h4 className="text-sm font-semibold text-gray-900">Publicar horários e telas</h4>
    <p className="text-xs text-amber-900">Publicar confirma os horários e as telas. Depois, envie para cada TV em Minhas telas.</p>
    <div className="grid gap-1 text-xs text-gray-700">
      <p><strong>Agenda:</strong> {summary.name} · <strong>Prioridade:</strong> {PRIORITY[summary.priority]}</p>
      <p><strong>Período:</strong> {when(summary.startsAt)} até {when(summary.endsAt)} ({summary.timezone})</p>
      <p><strong>Horário diário:</strong> {summary.dailyStartMinute === null ? 'o dia todo' : `${hhmm(summary.dailyStartMinute)} às ${hhmm(summary.dailyEndMinute)}`} · <strong>Dias:</strong> {summary.weekdays.length ? summary.weekdays.map(d => DAYS[d - 1]).join(', ') : 'todos'}</p>
      <p><strong>Telas:</strong> {inventory.targets.length}</p>
    </div>
    <ul className="max-h-36 overflow-auto space-y-1 text-xs text-gray-700">
      {inventory.targets.map((target) => <li key={target.id}>{targetNames[target.targetType]} · {shortId(target.targetId)}</li>)}
    </ul>
    {!body && <p role="status" className="text-xs text-amber-900">Confira o período (com data final) e as telas, e atualize antes de publicar.</p>}
    {!publishUiEnabled && <p className="text-xs text-amber-900">A publicação não está liberada para a sua empresa.</p>}
    <Button type="button" disabled={!ready} onClick={() => { void publish(); }}>{busy ? 'Conferindo…' : 'Publicar agenda'}</Button>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
    {confirmUi}
  </section>;
}
