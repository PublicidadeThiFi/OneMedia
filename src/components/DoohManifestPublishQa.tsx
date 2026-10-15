import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohPlayerDetailView } from '../lib/doohPlayerDetailContract';
import { canReadManifestInventory } from '../lib/doohManifestInventoryContract';
import { buildManifestCasRequest, canPublishManifestQa, manifestCasError, manifestCasResult,
  parseManifestPreflight, validManifestWindow, type ManifestPreflightView } from '../lib/doohManifestPublishCasContract';

// Build-time UX switch only. The D16A02 backend gate is mandatory and production-deny.
const qaUiEnabled = import.meta.env.VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED === 'true';
export function DoohManifestPublishQa({ companyId, player }: { companyId: string; player: DoohPlayerDetailView }) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const moduleAccess = snapshot?.modules.DOOH;
  const roles = user?.roles ?? [];
  const canRead = player.lifecycleStatus === 'ACTIVE' && canReadManifestInventory(companyId,
    user?.companyId, snapshot?.companyId, moduleAccess?.granted, moduleAccess?.accessMode, roles);
  const canWrite = canPublishManifestQa(companyId, user?.companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, roles, qaUiEnabled, player.lifecycleStatus);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [review, setReview] = useState<{ key: string; value: ManifestPreflightView } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const key = JSON.stringify([companyId, user?.id, user?.companyId, [...roles].sort(),
    snapshot?.companyId, moduleAccess?.granted, moduleAccess?.accessMode, player.id,
    player.lifecycleStatus, player.currentManifestVersion, player.desiredManifestVersion, from, to]);
  const keyRef = useRef(key); keyRef.current = key;
  useEffect(() => {
    abort.current?.abort(); setReview(null); setConfirmation(''); setAck(false);
    setError(''); setNotice(''); setBusy(false);
    return () => abort.current?.abort();
  }, [key]);

  async function fetchPreflight(signal?: AbortSignal): Promise<ManifestPreflightView | null> {
    const { data } = await apiClient.get<unknown>(`/dooh/manifests/players/${encodeURIComponent(player.id)}/preflight`,
      { params: { from, to }, signal });
    return parseManifestPreflight(data, companyId, player, from, to);
  }
  async function inspect() {
    if (!canRead || !validManifestWindow(from, to) || busy) return;
    abort.current?.abort(); const ctl = new AbortController(); abort.current = ctl;
    const requestKey = key; setError(''); setNotice(''); setReview(null);
    setBusy(true);
    try {
      const next = await fetchPreflight(ctl.signal);
      if (ctl.signal.aborted || keyRef.current !== requestKey) return;
      if (!next) { setError('Preflight incompatível ou player atualizado. Reabra o detalhe do player.'); return; }
      setReview({ key: requestKey, value: next });
    } catch (cause: unknown) { if (!ctl.signal.aborted && keyRef.current === requestKey) setError(manifestCasError(cause)); }
    finally { if (abort.current === ctl) abort.current = null; if (!ctl.signal.aborted && keyRef.current === requestKey) setBusy(false); }
  }
  async function materialize() {
    const visible = review?.key === key ? review.value : null;
    if (!canWrite || !visible || confirmation !== 'MATERIALIZAR QA' || !ack || busy || pending.current) return;
    const request = buildManifestCasRequest(visible, true);
    if (!request) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const requestKey = key;
    try {
      // A fresh GET is advisory. The CAS inside SERIALIZABLE is authoritative.
      const latest = await fetchPreflight();
      if (keyRef.current !== requestKey) return;
      if (!latest || latest.status !== 'READY' || latest.checksum !== visible.checksum ||
          latest.desired !== visible.desired || latest.current !== visible.current) {
        setReview(null); setError('A revisão do preflight mudou. Consulte novamente.'); return;
      }
      if (!window.confirm('Materializar manifest para player de QA? Isto avança desiredManifestVersion e pode ser entregue ao runtime. Somente ambiente isolado autorizado.')) return;
      if (keyRef.current !== requestKey) return;
      const { data } = await apiClient.post<unknown>(
        `/dooh/manifests/players/${encodeURIComponent(player.id)}/publish-cas`, request);
      if (keyRef.current !== requestKey) return;
      const receipt = manifestCasResult(data, latest);
      setReview(null);
      if (!receipt) { setError('Resposta incompatível. Consulte o inventário antes de repetir, para evitar publicação duplicada.'); return; }
      setNotice(receipt.alreadyPublished ? 'Snapshot já persistido. Reabra o detalhe antes de nova operação.' :
        'Manifest materializado no QA. A versão desejada mudou; confirme o estado no inventário.');
    } catch (cause: unknown) { if (keyRef.current === requestKey) { setReview(null); setError(manifestCasError(cause)); } }
    finally { pending.current = false; if (keyRef.current === requestKey) { setBusy(false); setConfirmation(''); setAck(false); } }
  }

  if (!canRead) return null;
  const current = review?.key === key ? review.value : null;
  return <section aria-label="Preflight e materialização QA de manifest" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
    <h5 className="text-sm font-semibold text-gray-900">Preflight de distribuição — D16A04</h5>
    <p className="text-xs text-gray-600">Prévia consultiva de uma janela UTC futura de até 24 horas; sem publicação ou operações de player durante a consulta.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Início UTC — YYYY-MM-DDTHH:mm:ss.sssZ
        <input className="mt-1 w-full rounded-md border p-2 font-mono text-xs" value={from}
          onChange={(event) => setFrom(event.target.value)} placeholder="2026-10-16T12:00:00.000Z" disabled={busy}/>
      </label>
      <label className="text-xs">Fim UTC — YYYY-MM-DDTHH:mm:ss.sssZ
        <input className="mt-1 w-full rounded-md border p-2 font-mono text-xs" value={to}
          onChange={(event) => setTo(event.target.value)} placeholder="2026-10-16T13:00:00.000Z" disabled={busy}/>
      </label>
    </div>
    <Button type="button" variant="outline" size="sm" disabled={!canRead || !validManifestWindow(from, to) || busy}
      onClick={() => void inspect()}>{busy ? 'Aguarde…' : 'Executar preflight GET'}</Button>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
    {current && <div className="space-y-2 text-xs">
      <p>Resultado: <strong>{current.status}</strong> · Segmentos: {current.segments ?? 'indisponível'} · Assets: {current.assets ?? 'indisponível'}</p>
      <p>Player: v{current.current} atual / v{current.desired} desejada</p>
      {current.checksum && <p>Checksum candidato: <span className="font-mono">{current.checksum.slice(0, 12)}…</span></p>}
      {current.issues.length > 0 && <p role="alert">Revisão necessária: {current.issues.join(', ')}</p>}
    </div>}
    {!qaUiEnabled ? <p className="text-xs text-amber-800">Materialização desabilitada nesta compilação. O preflight não autoriza publicação e não prova distribuição ou reprodução.</p> :
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-amber-800">Atenção: materializar altera desiredManifestVersion e pode permitir entrega ao runtime. Somente em QA isolado com autorização externa e QA Gate do servidor.</p>
        <label className="block text-xs">Digite MATERIALIZAR QA
          <input className="mt-1 block rounded-md border p-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={!canWrite || busy}/>
        </label>
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={ack} disabled={!canWrite || busy}
          onChange={(e) => setAck(e.target.checked)}/>Confirmo operação exclusiva de QA isolado e a mudança da versão desejada.</label>
        <Button type="button" size="sm" disabled={!canWrite || !ack || confirmation !== 'MATERIALIZAR QA' ||
            current?.status !== 'READY' || busy} onClick={() => void materialize()}>Solicitar materialização CAS (QA)</Button>
      </div>}
  </section>;
}
