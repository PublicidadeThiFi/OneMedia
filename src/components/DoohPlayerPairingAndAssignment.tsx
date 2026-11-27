import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { isOperationalWriteAllowed, normalizedOperationalName } from '../lib/doohPlayerOperationsContract';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parseDoohPlayerDetail } from '../lib/doohPlayerDetailContract';
import { parseDoohPointOptions, parseDoohScreenOptions, type DoohPointOption, type DoohScreenOption } from '../lib/doohScreenSelectionContract';
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
  const [step, setStep] = useState<'pair' | 'associate'>('pair');
  const [acknowledged, setAcknowledged] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [pointSearch, setPointSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pointId, setPointId] = useState('');
  const [pointOptions, setPointOptions] = useState<DoohPointOption[]>([]);
  const [screenOptions, setScreenOptions] = useState<DoohScreenOption[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [hasMorePoints, setHasMorePoints] = useState(false);
  const [screen, setScreen] = useState<{ key: string; value: ScreenCandidate } | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const operationKey = JSON.stringify([companyId, snapshot?.companyId, snapshot?.modules.DOOH.accessMode]);
  const requestKey = JSON.stringify([operationKey, reload]);
  const attemptRef = useRef<{ code: string; key: string } | null>(null);
  const newlyPairedIdRef = useRef<string | null>(null);
  useEffect(() => { setStep('pair'); newlyPairedIdRef.current = null; }, [operationKey]);

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
      if (newlyPairedIdRef.current && parsed.items.some(p => p.id === newlyPairedIdRef.current)) {
        setPlayerId(newlyPairedIdRef.current); newlyPairedIdRef.current = null;
      }
    }).catch((error: unknown) => { if (!controller.signal.aborted) setFailure(safePairingError(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorized, requestKey]);

  // Consult existing, tenant-scoped OOH inventory rather than asking users to type UUIDs.
  // Server-side access control remains authoritative; these projections are for selection only.
  useEffect(() => {
    setPointOptions([]); setPointId(''); setScreenId(''); setScreenOptions([]);
    setSelectionError(''); setHasMorePoints(false);
    if (!canValidateScreen || !companyId) { setPointsLoading(false); return; }
    const controller = new AbortController();
    setPointsLoading(true);
    void apiClient.get<unknown>('/media-points', {
      params: { page: 1, pageSize: 100, summary: true, type: 'DOOH',
        ...(appliedSearch ? { search: appliedSearch } : {}) }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const parsed = parseDoohPointOptions(data, companyId);
      if (!parsed) { setSelectionError('Inventário de pontos incompatível com a empresa. Selecione a tela pelo Inventário OOH.'); return; }
      setPointOptions(parsed.items); setHasMorePoints(parsed.hasMore);
    }).catch(() => { if (!controller.signal.aborted) setSelectionError('Não foi possível consultar os pontos digitais. Tente novamente.'); })
      .finally(() => { if (!controller.signal.aborted) setPointsLoading(false); });
    return () => controller.abort();
  }, [canValidateScreen, companyId, appliedSearch]);

  useEffect(() => {
    setScreenId(''); setScreenOptions([]); setSelectionError('');
    if (!canValidateScreen || !companyId || !pointOptions.some((p) => p.id === pointId)) {
      setOptionsLoading(false); return;
    }
    const controller = new AbortController();
    setOptionsLoading(true);
    void apiClient.get<unknown>(`/media-points/${encodeURIComponent(pointId)}/units`, {
      params: { detailed: false }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const options = parseDoohScreenOptions(data, companyId, pointId);
      if (!options) { setSelectionError('Unidades incompatíveis. Confira as telas no Inventário OOH.'); return; }
      setScreenOptions(options);
    }).catch(() => { if (!controller.signal.aborted) setSelectionError('Não foi possível carregar as telas deste ponto.'); })
      .finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [canValidateScreen, companyId, pointId, pointOptions]);

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
      newlyPairedIdRef.current = result.playerId; setPlayerId(result.playerId); setStep('associate');
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

  return <section aria-label="Conectar uma tela digital" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-900">Conectar uma tela</h3>
      <p className="text-sm text-gray-600">Abra o Player Web na TV ou navegador e gere um código. Depois informe o código abaixo e escolha o local da tela.</p>
      <p className="text-xs text-amber-800">A conexão só será concluída se a autorização e as licenças da empresa permitirem. Nenhuma credencial será exibida nesta página.</p>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando os players existentes…</p>}
    {failure && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{failure}</p>}
    {notice?.key === operationKey && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice.message}</p>}
    <a href="https://player.onemediaap.com.br" target="_blank" rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-indigo-600">
      Abrir Player Web para obter o código
    </a>
    <div role="group" aria-label="Etapas para conectar tela" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={step === 'pair'} onClick={() => setStep('pair')}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${step === 'pair' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>1. Informar código</button>
      <button type="button" aria-pressed={step === 'associate'} onClick={() => setStep('associate')}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${step === 'associate' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>2. Escolher local</button>
    </div>
    <div className="space-y-4">
      {step === 'pair' && <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => void submitPair(event)}>
        <h4 className="font-medium">1. Digite o código exibido na tela</h4>
        <label className="block space-y-1 text-sm"><span>Código da tela</span>
          <input autoComplete="off" spellCheck={false} className="w-full rounded-md border p-2" maxLength={32} value={code} onChange={(e) => { setCode(e.target.value); attemptRef.current = null; }} placeholder="Código exibido no player" disabled={!writable || busy} />
        </label>
        <label className="block space-y-1 text-sm"><span>Nome para identificar esta tela</span>
          <input className="w-full rounded-md border p-2" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={!writable || busy} />
        </label>
        <label className="flex items-start gap-2 text-xs text-gray-700">
          <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} disabled={!writable || busy} />
          <span>Entendo que conectar este aparelho pode ocupar uma licença de player da empresa.</span>
        </label>
        <Button type="submit" disabled={!pairAllowed}>Confirmar pareamento</Button>
        {!writable && <p className="text-xs text-gray-600">Requer acesso FULL e papel técnico.</p>}
      </form>}
      {step === 'associate' && <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => void submitAssignment(event)}>
        <h4 className="font-medium">2. Escolha onde sua tela fica</h4>
        <p className="text-xs text-gray-600">Escolha um ponto digital e a tela cadastrada. Se ainda não cadastrou uma tela, <a className="font-medium text-indigo-700 underline" href="/app/inventory">abra o Inventário</a>, crie o ponto DOOH e uma unidade SCREEN ativa.</p>
        <label className="block space-y-1 text-sm"><span>Tela conectada</span>
          <select className="w-full rounded-md border p-2" value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={!canValidateScreen || busy}>
            <option value="">Selecionar</option>
            {currentPlayers?.items.map((p) => <option value={p.id} key={p.id}>{p.name} · {p.lifecycleStatus}</option>)}
          </select>
        </label>
        {currentPlayers && currentPlayers.total > 100 && <p className="text-xs text-amber-800">Exibidos apenas 100 players. Seleção paginada será incorporada posteriormente.</p>}
        <div className="space-y-2">
          <label className="block space-y-1 text-sm"><span>Local de instalação (ponto digital)</span>
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-md border p-2" maxLength={100} value={pointSearch}
                onChange={(e) => setPointSearch(e.target.value)} placeholder="Buscar pelo nome do local" disabled={!canValidateScreen || busy} />
              <Button type="button" variant="outline" disabled={!canValidateScreen || busy || pointsLoading}
                onClick={() => setAppliedSearch(pointSearch.trim())}>Buscar</Button>
            </div>
          </label>
          <select aria-label="Ponto digital" className="w-full rounded-md border p-2" value={pointId}
            onChange={(e) => setPointId(e.target.value)} disabled={!canValidateScreen || busy || pointsLoading}>
            <option value="">Selecione o ponto de mídia</option>
            {pointOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="block space-y-1 text-sm"><span>Tela cadastrada</span>
            <select aria-label="Tela digital" className="w-full rounded-md border p-2" value={screenId}
              onChange={(e) => setScreenId(e.target.value)} disabled={!canValidateScreen || busy || optionsLoading || !pointId}>
              <option value="">Selecione a tela</option>
              {screenOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          {pointsLoading && <p role="status" className="text-xs text-gray-600">Carregando pontos digitais…</p>}
          {optionsLoading && <p role="status" className="text-xs text-gray-600">Carregando telas…</p>}
          {selectionError && <p role="alert" className="text-xs text-amber-800">{selectionError}</p>}
          {hasMorePoints && <p className="text-xs text-amber-800">Há mais pontos no inventário. Utilize a busca pelo nome para encontrar o local desejado.</p>}
          {!pointsLoading && !pointOptions.length && !selectionError && <p className="text-xs text-gray-600">Nenhum ponto DOOH encontrado. Cadastre primeiro o ponto e a unidade SCREEN em Inventário.</p>}
          {pointId && !optionsLoading && !screenOptions.length && !selectionError && <p className="text-xs text-gray-600">Este ponto ainda não tem tela SCREEN ativa. Cadastre ou ative uma unidade no Inventário.</p>}
        </div>
        {screenLoading && <p role="status" className="text-xs text-gray-600">Validando tela…</p>}
        {checkedScreen && <p className="text-xs text-gray-700">Tela: {checkedScreen.label} · {checkedScreen.isActive ? 'Ativa' : 'Inativa'} · SCREEN validada nesta empresa.</p>}
        {isUuidV4(screenId) && !screenLoading && !checkedScreen && <p className="text-xs text-amber-800">A tela não pôde ser validada para associação.</p>}
        {selectedPlayer?.currentAssignment && <p className="text-xs text-gray-600">Associação atual: {selectedPlayer.currentAssignment.mediaUnit.label}.</p>}
        <Button type="submit" disabled={!assignAllowed}>Confirmar associação</Button>
        {!canValidateScreen && <p className="text-xs text-amber-800">Pré-validação da SCREEN exige papel ADMINISTRATIVO no contrato atual da API OOH.</p>}
        <p className="text-xs text-gray-600">Este bloco não remove associações nem apaga históricos. A API recusa telas ocupadas, inativas ou fora do tenant.</p>
      </form>}
    </div>
  </section>;
}
