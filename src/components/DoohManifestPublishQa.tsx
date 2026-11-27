import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useDoohManifestPublishCapabilities } from '../lib/useDoohManifestPublishCapabilities';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohPlayerDetailView } from '../lib/doohPlayerDetailContract';
import { canReadManifestInventory } from '../lib/doohManifestInventoryContract';
import { buildManifestCasRequest, canPublishManifestQa, manifestCasError, manifestCasResult,
  parseManifestPreflight, validManifestWindow, type ManifestPreflightView } from '../lib/doohManifestPublishCasContract';

// Legacy QA UX switch; pilot authorization is always decided by the backend.
const qaUiEnabled = import.meta.env.VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED === 'true';
export function DoohManifestPublishQa({ companyId, player }: { companyId: string; player: DoohPlayerDetailView }) {
  const { ask, confirmUi } = useInlineConfirm();
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const moduleAccess = snapshot?.modules.DOOH;
  const roles = user?.roles ?? [];
  const canRead = player.lifecycleStatus === 'ACTIVE' && canReadManifestInventory(companyId,
    user?.companyId, snapshot?.companyId, moduleAccess?.granted, moduleAccess?.accessMode, roles);
  const capabilityKey = JSON.stringify([companyId, user?.id, user?.companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, [...roles].sort(), player.id, player.lifecycleStatus]);
  const server = useDoohManifestPublishCapabilities(companyId, capabilityKey, canRead);
  const materializeUiEnabled = server.materializeEnabled && (server.mode === 'PILOT' || (server.mode === 'QA' && qaUiEnabled));
  const canWrite = canPublishManifestQa(companyId, user?.companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, roles, materializeUiEnabled, player.lifecycleStatus);
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
    player.lifecycleStatus, player.currentManifestVersion, player.desiredManifestVersion,
    server.materializeEnabled, server.mode, from, to]);
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
    if (!canWrite || !visible ||
        (server.mode === 'QA' && confirmation !== 'MATERIALIZAR QA') ||
        (server.mode === 'PILOT' && confirmation !== 'MATERIALIZAR PILOTO') ||
        !ack || busy || pending.current) return;
    const request = buildManifestCasRequest(visible, true, server.mode === 'PILOT' ? 'PILOT' : 'QA');
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
      if (!await ask('Gerar manifest para este player? Isso avança desiredManifestVersion e pode entregar a programação ao dispositivo. Confirme que a tela e o período são os autorizados.')) return;
      if (keyRef.current !== requestKey) return;
      const { data } = await apiClient.post<unknown>(
        `/dooh/manifests/players/${encodeURIComponent(player.id)}/publish-cas`, request);
      if (keyRef.current !== requestKey) return;
      const receipt = manifestCasResult(data, latest);
      setReview(null);
      if (!receipt) { setError('Resposta incompatível. Consulte o inventário antes de repetir, para evitar publicação duplicada.'); return; }
      setNotice(receipt.alreadyPublished ? 'Snapshot já persistido. Reabra o detalhe antes de nova operação.' :
        'Atualização preparada. Abra o Player Web e sincronize a programação. A exibição precisa ser conferida no dispositivo.');
    } catch (cause: unknown) { if (keyRef.current === requestKey) { setReview(null); setError(manifestCasError(cause)); } }
    finally { pending.current = false; if (keyRef.current === requestKey) { setBusy(false); setConfirmation(''); setAck(false); } }
  }

  if (!canRead) return null;
  const current = review?.key === key ? review.value : null;
  return <section aria-label="Preflight e materialização QA de manifest" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
    <h5 className="text-sm font-semibold text-gray-900">Revisar programação desta tela</h5>
    <p className="text-xs text-gray-600">Escolha um período para conferir o conteúdo da tela. Revisar não envia nada ao dispositivo.</p>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
      const begin = new Date(); setFrom(begin.toISOString()); setTo(new Date(begin.getTime() + 24 * 60 * 60 * 1000).toISOString());
    }}>Escolher próximas 24 horas</Button>
    <details className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium">Outro período / detalhes técnicos (UTC)</summary>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Início UTC — YYYY-MM-DDTHH:mm:ss.sssZ
        <input className="mt-1 w-full rounded-md border p-2 font-mono text-xs" value={from}
          onChange={(event) => setFrom(event.target.value)} placeholder="2026-10-16T12:00:00.000Z" disabled={busy}/>
      </label>
      <label className="text-xs">Fim UTC — YYYY-MM-DDTHH:mm:ss.sssZ
        <input className="mt-1 w-full rounded-md border p-2 font-mono text-xs" value={to}
          onChange={(event) => setTo(event.target.value)} placeholder="2026-10-16T13:00:00.000Z" disabled={busy}/>
      </label>
    </div></details>
    <Button type="button" variant="outline" size="sm" disabled={!canRead || !validManifestWindow(from, to) || busy}
      onClick={() => void inspect()}>{busy ? 'Aguarde…' : 'Revisar programação'}</Button>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
    {current && <div className="space-y-2 text-xs">
      <p>Resultado: <strong>{current.status}</strong> · Segmentos: {current.segments ?? 'indisponível'} · Assets: {current.assets ?? 'indisponível'}</p>
      <p>Player: v{current.current} atual / v{current.desired} desejada</p>
      {current.checksum && <p>Checksum candidato: <span className="font-mono">{current.checksum.slice(0, 12)}…</span></p>}
      {current.issues.length > 0 && <p role="alert">Revisão necessária: {current.issues.join(', ')}</p>}
    </div>}
    {!materializeUiEnabled ? <p className="text-xs text-amber-800">Geração de manifest indisponível para esta empresa e ambiente. O preflight é somente consultivo e não comprova distribuição.</p> :
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-amber-800">Atenção: gerar o manifest altera a versão desejada do player e pode liberar a entrega dos arquivos ao runtime. Operação sujeita à autorização do servidor.</p>
        <label className="block text-xs">Digite {server.mode === 'PILOT' ? 'MATERIALIZAR PILOTO' : 'MATERIALIZAR QA'}
          <input className="mt-1 block rounded-md border p-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={!canWrite || busy}/>
        </label>
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={ack} disabled={!canWrite || busy}
          onChange={(e) => setAck(e.target.checked)}/>Confirmo a geração de manifest para este player e a mudança da versão desejada.</label>
        <Button type="button" size="sm" disabled={!canWrite || !ack ||
            confirmation !== (server.mode === 'PILOT' ? 'MATERIALIZAR PILOTO' : 'MATERIALIZAR QA') ||
            current?.status !== 'READY' || busy} onClick={() => void materialize()}>Preparar atualização</Button>
      </div>}
    {confirmUi}
  </section>;
}
