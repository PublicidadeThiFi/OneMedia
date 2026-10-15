import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { canReadDoohSchedules, type DoohScheduleSummary } from '../lib/doohScheduleCatalogContract';
import { auditCheckNames, parsePublicationAudit, publicationAuditError, type PublicationAuditView } from '../lib/doohSchedulePublicationAuditContract';

interface Props { companyId: string; summary: DoohScheduleSummary }

/** D15D-06 — explicitly requested, read-only inspection of current persisted record. */
export function DoohSchedulePublicationAudit({ companyId, summary }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const mode = snapshot?.modules.DOOH;
  const allowed = user?.companyId === companyId &&
    canReadDoohSchedules(companyId, snapshot?.companyId, mode?.granted, mode?.accessMode, user?.roles ?? []);
  const key = JSON.stringify([user?.id, companyId, snapshot?.companyId, mode?.granted, mode?.accessMode,
    [...(user?.roles ?? [])].sort(), summary.id, summary.updatedAt, summary.status, summary.publishedAt]);
  const liveKey = useRef(key); liveKey.current = key;
  const ongoing = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ key: string; value: PublicationAuditView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    ongoing.current?.abort(); setResult(null); setBusy(false); setError('');
    return () => ongoing.current?.abort();
  }, [key]);
  async function inspect() {
    if (!allowed || busy) return;
    const ctl = new AbortController(); ongoing.current = ctl;
    const before = key;
    const active = () => !ctl.signal.aborted && liveKey.current === before;
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/publication-audit`, { signal: ctl.signal });
      if (!active()) return;
      const parsed = parsePublicationAudit(data, companyId, summary);
      if (!parsed) { setError('Registro divergente ou incompleto. Atualize a agenda antes de consultar novamente.'); return; }
      setResult({ key: before, value: parsed });
    } catch (cause: unknown) { if (active()) setError(publicationAuditError(cause)); }
    finally { if (ongoing.current === ctl) ongoing.current = null; if (active()) setBusy(false); }
  }
  if (!allowed) return null;
  const current = result?.key === key ? result.value : null;
  return <section aria-label="Verificação estrutural de publicação D15D-06" className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h5 className="font-medium text-sm text-gray-900">Verificação do registro da publicação</h5>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void inspect()}>
        {busy ? 'Consultando…' : 'Verificar registro'}
      </Button>
    </div>
    <p className="text-xs text-amber-800">Inspeção do estado atual do banco, não histórico de auditoria. Sem validação de manifests, distribuição, sincronização ou Proof-of-Play. Não autoriza ativação.</p>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {current && <div className="space-y-2 text-xs text-gray-700">
      <p role="status" className="font-medium">{current.outcome === 'STRUCTURAL_RECORD_CONSISTENT'
        ? 'Registro estruturalmente consistente — distribuição NÃO avaliada.'
        : 'Revisão necessária — registro não atende a todas as conferências estruturais.'}</p>
      <p>Data registrada: {current.publishedAt ? new Date(current.publishedAt).toLocaleString('pt-BR') : 'Ausente'}.</p>
      <p>Referência ao publicador: {current.publisherReferenceRecorded ? 'Registrada' : 'Ausente'}.</p>
      <p>Versão de playlist encontrada: {current.playlistVersionRecorded ? 'Sim' : 'Não'}.</p>
      <p>Destinos conferidos: {current.targetCount} (players {current.targetTypeCounts.PLAYER}, grupos {current.targetTypeCounts.GROUP}, telas {current.targetTypeCounts.MEDIA_UNIT}, pontos {current.targetTypeCounts.MEDIA_POINT}).</p>
      {current.checks.length > 0 && <ul className="list-disc pl-5">{current.checks.map((code) => <li key={code}>{auditCheckNames[code]}</li>)}</ul>}
    </div>}
  </section>;
}
