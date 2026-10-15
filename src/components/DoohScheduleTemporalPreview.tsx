import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { type DoohScheduleSummary } from '../lib/doohScheduleCatalogContract';
import { buildPreviewRequest, canPreviewDoohSchedules, doohPreviewError, parseInstantPreview,
  parseTimelinePreview, type InstantPreview, type TimelinePreview, type PreviewMode } from '../lib/doohSchedulePreviewContract';

interface Props { companyId: string; schedules: readonly DoohScheduleSummary[]; catalogRevision: string; }
const labelStatus = { READY: 'Agenda resolvida', CONFLICT: 'Conflito de prioridade', NO_MATCH: 'Nenhuma agenda aplicável' };
const labelPriority = { TAKEOVER: 'Prioritária', STANDARD: 'Padrão', FALLBACK: 'Reserva' };
const pretty = (date: string) => new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC', hour12: false }) + ' UTC';
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
  const candidate = buildPreviewRequest(mode, playerId, draftId, { at, from, to }, draftIds);
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
      if (!parsed) { setError('Resposta de prévia incompatível ou desatualizada. Revise os parâmetros e tente novamente.'); return; }
      setResult(parsed);
    } catch (reason: unknown) {
      if (valid()) setError(doohPreviewError(reason));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (valid()) setLoading(false);
    }
  }
  if (!allowed) return <p className="text-xs text-gray-600">Prévia requer grant DOOH e função técnica com acesso READ_ONLY ou FULL.</p>;
  const instant = result && 'matchedSchedules' in result ? result : null;
  const timeline = result && 'segments' in result ? result : null;
  const shown = timeline ? timeline.segments.slice(0, 150) : [];
  return <section aria-label="Prévia temporal DOOH D15D-04" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
    <h4 className="font-semibold text-gray-900">Prévia temporal e resolução de prioridades</h4>
    <p className="text-xs text-gray-700">Consulta de um player ACTIVE da empresa. A prioridade segue TAKEOVER → STANDARD → FALLBACK. Empates são conflitos; nunca escolher uma agenda arbitrariamente.</p>
    <p className="text-xs text-amber-800">Simulação consultiva, não certificação de conflitos de intervalos. A linha do tempo é amostrada a cada minuto em UTC e pode não detectar eventos subminuto. Não publica, distribui nem gera Proof-of-Play.</p>
    <form onSubmit={(event) => { void preview(event); }} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">Tipo de prévia
        <select aria-label="Tipo de prévia" className="mt-1 block w-full rounded-md border p-2" value={mode} disabled={loading}
          onChange={event => { invalidate(); setMode(event.target.value as PreviewMode); }}>
          <option value="timeline">Linha do tempo (até 24 h)</option><option value="instant">Um instante</option>
        </select>
      </label>
      <label className="text-sm">UUID do player ativo
        <input aria-label="UUID do player para prévia" className="mt-1 block w-full rounded-md border p-2" maxLength={36}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={playerId} disabled={loading}
          onChange={event => { invalidate(); setPlayerId(event.target.value); }} />
      </label>
      <label className="text-sm">Rascunho opcional (simulação, sem publicar)
        <select aria-label="Rascunho opcional para prévia" className="mt-1 block w-full rounded-md border p-2" value={draftId} disabled={loading}
          onChange={event => { invalidate(); setDraftId(event.target.value); }}>
          <option value="">Somente agendas publicadas</option>
          {drafts.map(s => <option value={s.id} key={s.id}>{s.name} ({s.id.slice(0, 8)})</option>)}
        </select>
      </label>
      {mode === 'instant' ? <label className="text-sm">Instante ISO-8601 com offset
        <input aria-label="Instante da prévia" className="mt-1 block w-full rounded-md border p-2" value={at}
          placeholder="2026-10-20T12:00:00-03:00" disabled={loading}
          onChange={event => { invalidate(); setAt(event.target.value); }} />
      </label> : <>
        <label className="text-sm">Início ISO-8601 com offset
          <input aria-label="Início do período da prévia" className="mt-1 block w-full rounded-md border p-2" value={from}
            placeholder="2026-10-20T08:00:00-03:00" disabled={loading}
            onChange={event => { invalidate(); setFrom(event.target.value); }} />
        </label>
        <label className="text-sm">Fim ISO-8601 com offset (máx. 24 h)
          <input aria-label="Fim do período da prévia" className="mt-1 block w-full rounded-md border p-2" value={to}
            placeholder="2026-10-20T18:00:00-03:00" disabled={loading}
            onChange={event => { invalidate(); setTo(event.target.value); }} />
        </label>
      </>}
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={!candidate || loading}>
        {loading ? 'Consultando prévia…' : 'Consultar sem modificar agendas'}
      </Button>{!candidate && <span className="text-xs text-amber-800">Informe um player UUID e período ISO com offset válido.</span>}</div>
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
      <p><strong>Prévia amostrada</strong> · {timeline.samples} amostras UTC/minuto · {timeline.segments.length} segmentos · {timeline.scannedScheduleEvaluations} avaliações.</p>
      {timeline.segments.length > shown.length && <p className="text-xs text-amber-800">Exibindo os primeiros {shown.length} de {timeline.segments.length} segmentos; não é a linha completa.</p>}
      <div className="max-h-96 overflow-y-auto"><table className="w-full text-left text-xs">
        <thead><tr className="border-b"><th className="p-2">Início/fim (UTC)</th><th className="p-2">Estado</th><th className="p-2">Agenda/Conflitos</th></tr></thead>
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
