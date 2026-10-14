import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parsePlayerCommandHistory, type PlayerCommandView } from '../lib/doohPlayerAuditContract';
import { canRequestQaRestart, parseRestartReceipt, safeRestartError } from '../lib/doohPlayerRestartContract';

/** D15A1-B05 — no dispatch in normal builds; backend QA allowlist is authoritative. */
const qaUiEnabled = import.meta.env.VITE_DOOH_RESTART_QA_ENABLED === 'true';

export function DoohPlayerRestartQa() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const authorized = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' &&
    roles.some((r) => r === 'ADMINISTRATIVO' || r === 'TI'));
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.accessMode, snapshot?.modules.DOOH.granted, [...roles].sort()]);
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const [reload, setReload] = useState(0);
  const listKey = JSON.stringify([contextKey, reload]);
  const [inventory, setInventory] = useState<{ key: string; players: DoohPlayerInventoryItem[]; total: number } | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [history, setHistory] = useState<{ key: string; commands: PlayerCommandView[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ key: string; message: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const attempt = useRef<{ key: string; playerId: string; contextKey: string } | null>(null);
  const historyKey = JSON.stringify([listKey, playerId]);
  useEffect(() => {
    setInventory(null); setPlayerId(''); setHistory(null); setError(''); setReceipt(null);
    setConfirmation(''); attempt.current = null;
    if (!authorized || !qaUiEnabled) { setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/players', { params: { page: 1, pageSize: 100 }, signal: ctrl.signal })
      .then((response) => {
        if (ctrl.signal.aborted || contextRef.current !== contextKey) return;
        const parsed = parseDoohPlayerInventoryResponse(response.data);
        if (!parsed || parsed.meta.page !== 1 || parsed.meta.pageSize !== 100) {
          setError('Inventário incompatível. Reinicialização bloqueada.'); return;
        }
        setInventory({ key: listKey, players: parsed.items, total: parsed.meta.total });
      }).catch((e: unknown) => { if (!ctrl.signal.aborted) setError(safeRestartError(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [authorized, listKey, contextKey]);

  const visible = inventory?.key === listKey ? inventory : null;
  const selectedPlayer = visible?.players.find((p) => p.id === playerId);
  useEffect(() => {
    setHistory(null); setConfirmation(''); setReceipt(null);
    attempt.current = null;
    if (!authorized || !qaUiEnabled || !selectedPlayer) { setChecking(false); return; }
    const ctrl = new AbortController();
    setChecking(true);
    void apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(selectedPlayer.id)}/commands`, { signal: ctrl.signal })
      .then((response) => {
        if (ctrl.signal.aborted || contextRef.current !== contextKey) return;
        const parsed = parsePlayerCommandHistory(response.data, selectedPlayer.id);
        if (!parsed) { setError('Histórico incompatível. Reinicialização bloqueada.'); return; }
        setHistory({ key: historyKey, commands: parsed });
      }).catch((e: unknown) => { if (!ctrl.signal.aborted) setError(safeRestartError(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setChecking(false); });
    return () => ctrl.abort();
  }, [authorized, selectedPlayer?.id, historyKey, contextKey]);

  const commands = history?.key === historyKey ? history.commands : null;
  const canSubmit = !busy && !loading && !checking && confirmation === 'REINICIAR' &&
    !receipt && canRequestQaRestart(selectedPlayer, commands, {
      companyId, snapshotCompanyId: snapshot?.companyId ?? null,
      mode: snapshot?.modules.DOOH.accessMode, granted: snapshot?.modules.DOOH.granted, roles,
    }, qaUiEnabled);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !selectedPlayer || !companyId) return;
    if (!window.confirm(`Solicitar RESTART REMOTO do player “${selectedPlayer.name}”? Isso pode interromper a exibição. Somente QA autorizado.`)) return;
    const capturedContext = contextRef.current;
    const capturedPlayer = selectedPlayer.id;
    // Retain the same key for uncertain responses/retries. Never regenerate per HTTP retry.
    if (attempt.current?.playerId !== capturedPlayer || attempt.current?.contextKey !== capturedContext) {
      attempt.current = { playerId: capturedPlayer, contextKey: capturedContext,
        key: `restart:qa:${crypto.randomUUID()}` };
    }
    setBusy(true); setError('');
    try {
      const response = await apiClient.post<unknown>(`/dooh/players/${encodeURIComponent(capturedPlayer)}/restart`,
        {}, { headers: { 'Idempotency-Key': attempt.current.key } });
      if (contextRef.current !== capturedContext) return;
      const parsed = parseRestartReceipt(response.data, capturedPlayer);
      if (!parsed) { setError('Resposta não confirmada pelo contrato. Consulte o histórico antes de repetir.'); return; }
      setReceipt({ key: historyKey, message: `Comando ${parsed.commandId} registrado (${parsed.status}${parsed.idempotentReplay ? ', repetição idempotente' : ''}). A execução física NÃO foi comprovada.` });
      setConfirmation('');
    } catch (e: unknown) {
      if (contextRef.current === capturedContext) setError(safeRestartError(e));
    } finally {
      if (contextRef.current === capturedContext) setBusy(false);
    }
  }

  if (!authorized) return null;
  return <section aria-label="Comandos remotos QA D15A1-05" className="space-y-3 rounded-xl border border-amber-300 bg-white p-5">
    <h3 className="font-semibold text-gray-900">Reinicialização remota — D15A1 Bloco 05</h3>
    <p className="text-sm text-gray-700">Ações físicas são restritas a QA autorizado. O backend bloqueia por padrão e exige empresa permitida explicitamente. Não altera a pausa GLOBAL nem a licença do player.</p>
    {!qaUiEnabled ? <p role="status" className="text-sm text-amber-800">Envio de restart desabilitado nesta compilação. Consulta de comandos disponível no painel anterior.</p> : <>
      <Button type="button" variant="outline" disabled={loading || checking || busy} onClick={() => setReload((v) => v + 1)}>Atualizar inventário</Button>
      {loading && <p role="status" className="text-sm">Carregando players…</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {visible && <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <label className="block text-sm">Player autorizado de QA
          <select className="mt-1 w-full rounded-md border p-2" value={playerId} disabled={busy} onChange={(e) => { setPlayerId(e.target.value); setError(''); }}>
            <option value="">Selecionar player</option>
            {visible.players.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.lifecycleStatus} — {p.online ? 'online' : 'offline'}</option>)}
          </select>
        </label>
        {visible.total > 100 && <p className="text-xs text-amber-800">Lista limitada a 100 players; nenhum comando deve ser enviado para itens ausentes.</p>}
        {checking && <p role="status" className="text-sm">Verificando comandos pendentes…</p>}
        {selectedPlayer && !selectedPlayer.online && <p className="text-xs text-amber-800">Offline: reinicialização bloqueada.</p>}
        {commands?.some((c) => c.status === 'QUEUED' || c.status === 'DELIVERED') && <p className="text-xs text-amber-800">Já existe comando pendente. Não duplicar.</p>}
        <label className="block text-sm">Digite REINICIAR para confirmar
          <input className="mt-1 w-full rounded-md border p-2" autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} maxLength={10} disabled={busy || !selectedPlayer} />
        </label>
        <Button type="submit" disabled={!canSubmit}>Solicitar restart em QA</Button>
        {receipt?.key === historyKey && <p role="status" className="text-sm text-green-800">{receipt.message}</p>}
      </form>}
      {!snapshot || snapshot.modules.DOOH.accessMode !== 'FULL' ? <p className="text-xs">Operação exige DOOH FULL e papel técnico.</p> : null}
    </>}
  </section>;
}
