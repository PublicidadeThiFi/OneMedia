import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { isOperationalWriteAllowed, normalizedOperationalName } from '../lib/doohPlayerOperationsContract';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parseDoohPlayerDetail } from '../lib/doohPlayerDetailContract';
import {
  isUuidV4, parseAssignmentResult, parsePairResult, parseScreenCandidate,
  safePairingError, validPairingCode, type ScreenCandidate,
} from '../lib/doohPlayerPairingContract';

/** D15A1 Bloco 02. Admin claim is separate from device-originated start/complete.
 * Never call /runtime/v1/pairing/start or /pairing/complete from the browser.
 * The backend alone evaluates global pause, ACTIVE_PLAYER quota and tenancy.
 */
export function DoohPlayerPairingAndAssignment() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const authorized = Boolean(companyId && snapshot?.companyId === companyId && snapshot.modules.DOOH.granted &&
    snapshot.modules.DOOH.accessMode !== 'NONE' && roles.some((r) => r === 'ADMINISTRATIVO' || r === 'TI'));
  const writable = isOperationalWriteAllowed(companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.accessMode, snapshot?.modules.DOOH.granted, roles);
  // /media-units/:id is restricted to ADMINISTRATIVO/COMERCIAL in the current OOH API.
  const canValidateScreen = writable && roles.includes('ADMINISTRATIVO');
  const [players, setPlayers] = useState<{ key: string; items: DoohPlayerInventoryItem[]; total: number } | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [screen, setScreen] = useState<{ key: string; value: ScreenCandidate } | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const operationKey = JSON.stringify([companyId, snapshot?.companyId, snapshot?.modules.DOOH.accessMode]);
  const requestKey = JSON.stringify([operationKey, reload]);
  const attemptRef = useRef<{ code: string; key: string } | null>(null);

  useEffect(() => {
    setPlayers(null); setFailure(''); setPlayerId('');
    setScreenId(''); setScreen(null); setCode(''); setName(''); setAcknowledged(false);
    attemptRef.current = null;
    if (!authorized) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/players', {
      params: { page: 1, pageSize: 100 }, signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      const parsed = parseDoohPlayerInventoryResponse(response.data);
      if (!parsed || parsed.meta.page !== 1 || parsed.meta.pageSize !== 100) {
        setFailure('Inventário incompatível. Nenhuma operação será habilitada.'); return;
      }
      setPlayers({ key: requestKey, items: parsed.items, total: parsed.meta.total });
    }).catch((error: unknown) => { if (!controller.signal.aborted) setFailure(safePairingError(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorized, requestKey]);

  useEffect(() => {
    setScreen(null);
    if (!canValidateScreen || !companyId || !isUuidV4(screenId)) { setScreenLoading(false); return; }
    const controller = new AbortController();
    const capturedKey = JSON.stringify([operationKey, screenId]);
    setScreenLoading(true);
    void apiClient.get<unknown>(`/media-units/${encodeURIComponent(screenId)}`, {
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      const checked = parseScreenCandidate(response.data, companyId, screenId);
      if (checked) setScreen({ key: capturedKey, value: checked });
    }).catch(() => { /* No screen data or error payload is displayed. */ })
      .finally(() => { if (!controller.signal.aborted) setScreenLoading(false); });
    return () => controller.abort();
  }, [canValidateScreen, companyId, screenId, operationKey]);

  if (!authorized) return null;
  const currentPlayers = players?.key === requestKey ? players : null;
  const selectedPlayer = currentPlayers?.items.find((p) => p.id === playerId);
  const checkedScreen = screen?.key === JSON.stringify([operationKey, screenId]) ? screen.value : null;
  const safeReady = writable && !loading && !busy && Boolean(currentPlayers);
  const pairCode = validPairingCode(code);
  const pairName = normalizedOperationalName(name);
  const pairAllowed = safeReady && acknowledged && Boolean(pairCode && pairName);
  const assignAllowed = safeReady && canValidateScreen && !screenLoading && Boolean(selectedPlayer &&
    selectedPlayer.lifecycleStatus !== 'RETIRED' && checkedScreen?.isActive &&
    selectedPlayer.currentAssignment?.mediaUnit.id !== checkedScreen?.id);

  async function submitPair(event: FormEvent) {
    event.preventDefault();
    const normalizedCode = validPairingCode(code);
    const normalizedName = normalizedOperationalName(name);
    if (!pairAllowed || !normalizedCode || !normalizedName) return;
    if (!window.confirm('Parear este dispositivo? Se permitido pelo backend, isto poderá ativar uma licença ACTIVE_PLAYER. A pausa e a quota não serão alteradas.')) return;
    if (!globalThis.crypto?.randomUUID) {
      setFailure('Navegador sem geração segura de chave de idempotência. Operação bloqueada.'); return;
    }
    // Same key for a manual replay of this code; no automatic retry and no code in storage/logs.
    const key = attemptRef.current?.code === normalizedCode ? attemptRef.current.key : crypto.randomUUID();
    attemptRef.current = { code: normalizedCode, key };
    setBusy(true); setFailure(''); setNotice(null);
    try {
      const response = await apiClient.post<unknown>('/dooh/players/pair',
        { code: normalizedCode, name: normalizedName }, { headers: { 'Idempotency-Key': key } });
      const result = parsePairResult(response.data);
      if (!result || result.name !== normalizedName) {
        setFailure('O servidor não confirmou o pareamento esperado. Consulte o inventário antes de tentar novamente.'); return;
      }
      // Never display installationId, device secret, pollToken or session id.
      setNotice({ key: operationKey, message: `Pareamento confirmado para “${result.name}” (${result.lifecycle}). Atualização do inventário solicitada.` });
      setCode(''); setName(''); setAcknowledged(false); attemptRef.current = null;
      setReload((v) => v + 1);
    } catch (error: unknown) { setFailure(safePairingError(error)); }
    finally { setBusy(false); }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault();
    if (!assignAllowed || !selectedPlayer || !checkedScreen || !companyId) return;
    if (!window.confirm(`Associar “${selectedPlayer.name}” à tela “${checkedScreen.label}”? A associação anterior deste player pode ser encerrada.`)) return;
    setBusy(true); setFailure(''); setNotice(null);
    try {
      // Validate ownership, type and current active state immediately before mutation.
      const [unitResponse, playerResponse] = await Promise.all([
        apiClient.get<unknown>(`/media-units/${encodeURIComponent(checkedScreen.id)}`),
        apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(selectedPlayer.id)}`),
      ]);
      const verifiedUnit = parseScreenCandidate(unitResponse.data, companyId, checkedScreen.id);
      const verifiedPlayer = parseDoohPlayerDetail(playerResponse.data, selectedPlayer.id);
      if (!verifiedUnit?.isActive || !verifiedPlayer || verifiedPlayer.lifecycleStatus === 'RETIRED') {
        setFailure('A tela ou o player não atende mais às condições. Atualize e verifique novamente.'); return;
      }
      const response = await apiClient.put<unknown>(`/dooh/players/${encodeURIComponent(selectedPlayer.id)}/assignment`,
        { mediaUnitId: checkedScreen.id });
      if (!parseAssignmentResult(response.data, selectedPlayer.id, checkedScreen.id)) {
        setFailure('O servidor não confirmou a associação esperada. Confira o player antes de repetir.'); return;
      }
      setNotice({ key: operationKey, message: 'Tela associada com confirmação da API. Atualização do inventário solicitada.' });
      setReload((v) => v + 1);
    } catch (error: unknown) { setFailure(safePairingError(error)); }
    finally { setBusy(false); }
  }

  return <section aria-label="Pareamento e associação DOOH D15A1-02" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-900">Pareamento e associação de telas — D15A1-02</h3>
      <p className="text-sm text-gray-600">O código é gerado pelo aplicativo instalado no dispositivo. A interface administrativa apenas reivindica esse código; emissão de credencial ocorre exclusivamente no runtime do player.</p>
      <p className="text-xs text-amber-800">A pausa global DOOH e o limite ACTIVE_PLAYER são aplicados exclusivamente pelo backend. Esta página não habilita ativação, não altera quotas e não registra credenciais.</p>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando os players existentes…</p>}
    {failure && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{failure}</p>}
    {notice?.key === operationKey && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice.message}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => void submitPair(event)}>
        <h4 className="font-medium">Parear pelo código do dispositivo</h4>
        <label className="block space-y-1 text-sm"><span>Código temporário (6–32 caracteres)</span>
          <input autoComplete="off" spellCheck={false} className="w-full rounded-md border p-2" maxLength={32} value={code} onChange={(e) => { setCode(e.target.value); attemptRef.current = null; }} placeholder="Código exibido no player" disabled={!writable || busy} />
        </label>
        <label className="block space-y-1 text-sm"><span>Nome do novo player</span>
          <input className="w-full rounded-md border p-2" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={!writable || busy} />
        </label>
        <label className="flex items-start gap-2 text-xs text-gray-700">
          <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} disabled={!writable || busy} />
          <span>Reconheço que o pareamento, quando autorizado, pode ativar uma licença e que não devo utilizá-lo em produção durante o smoke sem aprovação.</span>
        </label>
        <Button type="submit" disabled={!pairAllowed}>Confirmar pareamento</Button>
        {!writable && <p className="text-xs text-gray-600">Requer acesso FULL e papel técnico.</p>}
      </form>
      <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => void submitAssignment(event)}>
        <h4 className="font-medium">Associar player existente a uma SCREEN</h4>
        <label className="block space-y-1 text-sm"><span>Player da empresa</span>
          <select className="w-full rounded-md border p-2" value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={!canValidateScreen || busy}>
            <option value="">Selecionar</option>
            {currentPlayers?.items.map((p) => <option value={p.id} key={p.id}>{p.name} · {p.lifecycleStatus}</option>)}
          </select>
        </label>
        {currentPlayers && currentPlayers.total > 100 && <p className="text-xs text-amber-800">Exibidos apenas 100 players. Seleção paginada será incorporada posteriormente.</p>}
        <label className="block space-y-1 text-sm"><span>ID da unidade SCREEN (UUID)</span>
          <input className="w-full rounded-md border p-2" maxLength={36} value={screenId} onChange={(e) => setScreenId(e.target.value.trim())} placeholder="UUID da tela cadastrada no inventário OOH" disabled={!canValidateScreen || busy} />
        </label>
        {screenLoading && <p role="status" className="text-xs text-gray-600">Validando tela…</p>}
        {checkedScreen && <p className="text-xs text-gray-700">Tela: {checkedScreen.label} · {checkedScreen.isActive ? 'Ativa' : 'Inativa'} · SCREEN validada nesta empresa.</p>}
        {isUuidV4(screenId) && !screenLoading && !checkedScreen && <p className="text-xs text-amber-800">A tela não pôde ser validada para associação.</p>}
        {selectedPlayer?.currentAssignment && <p className="text-xs text-gray-600">Associação atual: {selectedPlayer.currentAssignment.mediaUnit.label}.</p>}
        <Button type="submit" disabled={!assignAllowed}>Confirmar associação</Button>
        {!canValidateScreen && <p className="text-xs text-amber-800">Pré-validação da SCREEN exige papel ADMINISTRATIVO no contrato atual da API OOH.</p>}
        <p className="text-xs text-gray-600">Este bloco não remove associações nem apaga históricos. A API recusa telas ocupadas, inativas ou fora do tenant.</p>
      </form>
    </div>
  </section>;
}
