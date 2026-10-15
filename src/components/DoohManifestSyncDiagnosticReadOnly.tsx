import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohPlayerDetailView } from '../lib/doohPlayerDetailContract';
import { canReadManifestSyncDiagnostic, manifestSyncError, manifestSyncSignals,
  parseManifestSyncDiagnostic, type ManifestSyncDiagnosticView } from '../lib/doohManifestSyncDiagnosticContract';

/** D16A05: GET-only technical report; no runtime commands, writes, HEAD S3 or playback claims. */
export function DoohManifestSyncDiagnosticReadOnly({ companyId, player }: {
  companyId: string; player: DoohPlayerDetailView;
}) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const mod = snapshot?.modules.DOOH;
  const allowed = canReadManifestSyncDiagnostic(companyId, user?.companyId, snapshot?.companyId,
    mod?.granted, mod?.accessMode, user?.roles ?? []);
  const key = JSON.stringify([companyId, user?.id, user?.companyId, [...(user?.roles ?? [])].sort(),
    snapshot?.companyId, mod?.granted, mod?.accessMode, player.id, player.lifecycleStatus,
    player.lastSeenAt, player.currentManifestVersion, player.desiredManifestVersion]);
  const keyRef = useRef(key); keyRef.current = key;
  const ongoing = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ key: string; value: ManifestSyncDiagnosticView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    ongoing.current?.abort(); setResult(null); setError(''); setBusy(false);
    return () => ongoing.current?.abort();
  }, [key]);

  async function inspect() {
    if (!allowed || busy) return;
    ongoing.current?.abort();
    const controller = new AbortController(); ongoing.current = controller;
    const requestKey = key;
    const active = () => !controller.signal.aborted && keyRef.current === requestKey;
    setBusy(true); setResult(null); setError('');
    try {
      const { data } = await apiClient.get<unknown>(
        `/dooh/manifests/players/${encodeURIComponent(player.id)}/sync-diagnostic`, { signal: controller.signal });
      if (!active()) return;
      const projection = parseManifestSyncDiagnostic(data, companyId, player);
      if (!projection) {
        setError('Resposta incompatível ou revisão do player alterada. Reabra o detalhe.');
        return;
      }
      setResult({ key: requestKey, value: projection });
    } catch (cause: unknown) { if (active()) setError(manifestSyncError(cause)); }
    finally { if (ongoing.current === controller) ongoing.current = null; if (active()) setBusy(false); }
  }
  if (!allowed) return null;
  const current = result?.key === key ? result.value : null;
  return <section aria-label="Diagnóstico de sincronização de manifest" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h5 className="text-sm font-semibold text-gray-900">Sincronização técnica — D16A05</h5>
        <p className="text-xs text-gray-600">Consulta única do estado registrado no backend. Nenhuma comunicação é iniciada com o player.</p></div>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void inspect()}>
        {busy ? 'Consultando…' : 'Verificar versões e heartbeat'}
      </Button>
    </div>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {current && <div className="space-y-2 text-xs text-gray-700">
      <p>Consulta registrada em: {new Date(current.observedAt).toLocaleString('pt-BR')}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <p>Atual reportada: <strong>v{current.currentManifestVersion}</strong></p>
        <p>Desejada: <strong>v{current.desiredManifestVersion}</strong></p>
        <p>Última persistida: <strong>{current.latestRecordedVersion === null ? 'Nenhuma' : `v${current.latestRecordedVersion}`}</strong></p>
      </div>
      <p>Último heartbeat: {current.lastSeenAt ? new Date(current.lastSeenAt).toLocaleString('pt-BR') : 'Não informado'} · janela: {current.offlineAfterSeconds}s</p>
      {current.latestRecordedChecksumPrefix && <p>Checksum armazenado (prefixo): <span className="font-mono">{current.latestRecordedChecksumPrefix}…</span></p>}
      <ul className="list-disc space-y-1 pl-5 text-amber-900">
        {manifestSyncSignals(current).map((signal) => <li key={signal}>{signal}</li>)}
      </ul>
    </div>}
    <p className="text-xs text-amber-800">Diagnóstico exclusivamente informativo. As versões vêm do heartbeat e do banco. Não verifica bytes, URLs, distribuição, sincronização efetiva ou Proof-of-Play.</p>
  </section>;
}
