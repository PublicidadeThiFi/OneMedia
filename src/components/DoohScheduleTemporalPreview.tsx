import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohSchedulePlayerPicker } from './DoohSchedulePlayerPicker';
import { type DoohScheduleSummary } from '../lib/doohScheduleCatalogContract';
import { buildPreviewRequest, canPreviewDoohSchedules, doohPreviewError, parseInstantPreview,
  parseTimelinePreview, type InstantPreview, type TimelinePreview, type PreviewMode } from '../lib/doohSchedulePreviewContract';

interface Props { companyId: string; schedules: readonly DoohScheduleSummary[]; catalogRevision: string; }
const labelStatus = { READY: 'Agenda resolvida', CONFLICT: 'Conflito de prioridade', NO_MATCH: 'Nenhuma agenda aplicável' };
const labelPriority = { TAKEOVER: 'Prioritária', STANDARD: 'Padrão', FALLBACK: 'Reserva' };
const pretty = (date: string) => new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
// F13: <input type="datetime-local"> gives local wall time; the API expects ISO-8601 with the local offset.
const pad = (n: number) => String(n).padStart(2, '0');
export function localInputToIso(value: string): string {
  const ms = Date.parse(value);
  if (!value || !Number.isFinite(ms)) return '';
  const d = new Date(ms), off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', abs = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
const toLocalInput = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** D15D-04: GET only. Preview is sampled and NEVER authorizes publishing, manifest or player commands. */
export function DoohScheduleTemporalPreview({ companyId, schedules, catalogRevision }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const access = snapshot?.modules.DOOH;
  const allowed = companyId === user?.companyId && canPreviewDoohSchedules(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, user?.roles ?? []);
  const contextKey = JSON.stringify([companyId, user?.id, user?.companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...(user?.roles ?? [])].sort(), catalogRevision]);
  const [mode, setMode] = useState<PreviewMode>('timeline');
  const [playerId, setPlayerId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [at, setAt] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<InstantPreview | TimelinePreview | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const drafts = schedules.filter(s => s.status === 'DRAFT');
  const draftIds = drafts.map(s => s.id);
  const liveKey = JSON.stringify([contextKey, mode, playerId, draftId, at, from, to]);
  const liveKeyRef = useRef(liveKey); liveKeyRef.current = liveKey;
  useEffect(() => {
    abortRef.current?.abort(); abortRef.current = null;
    setLoading(false); setResult(null); setError('');
    setPlayerId(''); setDraftId(''); setAt(''); setFrom(''); setTo('');
    return () => abortRef.current?.abort();
  }, [contextKey]);
  function invalidate() {
    abortRef.current?.abort(); abortRef.current = null;
    setResult(null); setError(''); setLoading(false);
  }
  const candidate = buildPreviewRequest(mode, playerId, draftId, { at: localInputToIso(at), from: localInputToIso(from), to: localInputToIso(to) }, draftIds);
  async function preview(event: FormEvent) {
    event.preventDefault();
    if (!allowed || !candidate || loading) return;
    const controller = new AbortController(); abortRef.current = controller;
    const startKey = liveKey;
    const valid = () => !controller.signal.aborted && liveKeyRef.current === startKey;
    setLoading(true); setError(''); setResult(null);
    try {
      const params = mode === 'instant'
        ? { playerId: candidate.playerId, at: candidate.at, ...(candidate.draftScheduleId ? { draftScheduleId: candidate.draftScheduleId } : {}) }
        : { playerId: candidate.playerId, from: candidate.from, to: candidate.to, ...(candidate.draftScheduleId ? { draftScheduleId: candidate.draftScheduleId } : {}) };
      const endpoint = mode === 'instant' ? '/dooh/schedules/preview' : '/dooh/schedules/preview/timeline';
      const { data } = await apiClient.get<unknown>(endpoint, { params, signal: controller.signal });
      if (!valid()) return;
      const parsed = mode === 'instant' ? parseInstantPreview(data, candidate) : parseTimelinePreview(data, candidate);
      if (!parsed) { setError('Não foi possível calcular a prévia. Confira a tela e o horário e tente de novo.'); return; }
      setResult(parsed);
    } catch (reason: unknown) {
      if (valid()) setError(doohPreviewError(reason));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (valid()) setLoading(false);
    }
  }
  if (!allowed) return <p className="text-xs text-gray-600">Seu perfil não tem acesso à prévia de horários.</p>;
  const instant = result && 'matchedSchedules' in result ? result : null;
  const timeline = result && 'segments' in result ? result : null;
  const shown = timeline ? timeline.segments.slice(0, 150) : [];
  return <section aria-label="Prévia de horários" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
    <h4 className="font-semibold text-gray-900">Prévia de horários</h4>
    <p className="text-xs text-gray-700">Veja qual agenda uma tela vai exibir em cada horário. Uma agenda Prioritária vence a Normal, que vence a Reserva. Se duas da mesma prioridade coincidirem, a prévia avisa. Nada é publicado.</p>
    <form onSubmit={(event) => { void preview(event); }} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">Tipo de prévia
        <select aria-label="Tipo de prévia" className="mt-1 block w-full rounded-md border p-2" value={mode} disabled={loading}
          onChange={event => { invalidate(); setMode(event.target.value as PreviewMode); }}>
          <option value="timeline">Um período (até 24 h)</option><option value="instant">Um instante</option>
        </select>
      </label>
      <DoohSchedulePlayerPicker companyId={companyId} value={playerId} disabled={loading} onChange={id => { invalidate(); setPlayerId(id); }} />
      <label className="text-sm">Incluir uma agenda em rascunho (opcional)
        <select aria-label="Rascunho opcional para prévia" className="mt-1 block w-full rounded-md border p-2" value={draftId} disabled={loading}
          onChange={event => { invalidate(); setDraftId(event.target.value); }}>
          <option value="">Somente agendas publicadas</option>
          {drafts.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
        </select>
      </label>
      {mode === 'instant' ? <label className="text-sm">Data e hora
        <input type="datetime-local" aria-label="Instante da prévia" className="mt-1 block w-full rounded-md border p-2" value={at}
          disabled={loading} onChange={event => { invalidate(); setAt(event.target.value); }} />
      </label> : <>
        <label className="text-sm">De
          <input type="datetime-local" aria-label="Início do período da prévia" className="mt-1 block w-full rounded-md border p-2" value={from}
            disabled={loading} onChange={event => { invalidate(); setFrom(event.target.value); }} />
        </label>
        <label className="text-sm">Até (no máximo 24 h depois)
          <input type="datetime-local" aria-label="Fim do período da prévia" className="mt-1 block w-full rounded-md border p-2" value={to}
            disabled={loading} onChange={event => { invalidate(); setTo(event.target.value); }} />
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-2 text-sm">
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => { invalidate(); const now = Date.now(); setFrom(toLocalInput(now)); setTo(toLocalInput(now + 86_400_000 - 60_000)); }}>Próximas 24 h</Button>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => { invalidate(); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); setFrom(toLocalInput(d.getTime())); setTo(toLocalInput(d.getTime() + 86_400_000 - 60_000)); }}>Amanhã</Button>
        </div>
      </>}
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={!candidate || loading}>
        {loading ? 'Consultando prévia…' : 'Ver prévia'}
      </Button>{!candidate && <span className="text-xs text-gray-600">Escolha a tela e o horário.</span>}</div>
    </form>
    {loading && <p role="status" className="text-sm">Calculando consulta…</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {instant && <div className="space-y-2 rounded-lg border bg-gray-50 p-3 text-sm" aria-label="Resultado da prévia pontual">
      <p><strong>{labelStatus[instant.status]}</strong> · {pretty(instant.at)}</p>
      {instant.effective && <p>Efetiva na simulação: {instant.effective.name} · {labelPriority[instant.effective.priority]}</p>}
      <p>{instant.matchedSchedules.length} agenda(s) aplicável(is) no instante consultado.</p>
      {instant.matchedSchedules.length > 0 && <ul className="list-disc pl-5">{instant.matchedSchedules.map(s =>
        <li key={s.id}>{s.name} · {labelPriority[s.priority]} · {s.status === 'DRAFT' ? 'Rascunho hipotético' : 'Publicada'}</li>)}</ul>}
      {instant.conflicts.map(c => <p key={c.priority} className="text-amber-800">Empate {labelPriority[c.priority]}: {c.scheduleIds.map(i => i.slice(0, 8)).join(', ')}</p>)}
    </div>}
    {timeline && <div className="space-y-2 rounded-lg border bg-gray-50 p-3 text-sm" aria-label="Resultado da linha do tempo">
      <p><strong>Prévia</strong> · {timeline.segments.length} {timeline.segments.length === 1 ? 'trecho' : 'trechos'} no período.</p>
      {timeline.segments.length > shown.length && <p className="text-xs text-amber-800">Exibindo os primeiros {shown.length} de {timeline.segments.length} segmentos; não é a linha completa.</p>}
      <div className="max-h-96 overflow-y-auto"><table className="w-full text-left text-xs">
        <thead><tr className="border-b"><th className="p-2">Horário</th><th className="p-2">Estado</th><th className="p-2">Agenda</th></tr></thead>
        <tbody>{shown.map((segment, index) => <tr className="border-b" key={`${segment.from}-${index}`}>
          <td className="p-2">{pretty(segment.from)} — {pretty(segment.to)}</td>
          <td className="p-2">{labelStatus[segment.status]}</td>
          <td className="p-2">{segment.effective ? `${segment.effective.name} (${labelPriority[segment.effective.priority]})` :
            segment.conflicts.length ? segment.conflicts.map(c => `${labelPriority[c.priority]}: ${c.scheduleIds.map(i => i.slice(0, 8)).join(', ')}`).join(' / ') : '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </section>;
}
