import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parseDoohPlayerGroups, isOperationalWriteAllowed, type DoohPlayerGroupSummary } from '../lib/doohPlayerOperationsContract';
import { parsePlayerGroupDetail, safeAuditReadError, type PlayerGroupDetailView } from '../lib/doohPlayerAuditContract';
import { draftGroupMemberChange, isExpectedMembershipResult, safeMembershipError } from '../lib/doohSafeGroupMembershipContract';

/** D15A1-B04: one-at-a-time group membership change through backend CAS ONLY. */
export function DoohGroupMembersSafeEditor() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const authorized = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' &&
    roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI'));
  const writable = isOperationalWriteAllowed(companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.accessMode, snapshot?.modules.DOOH.granted, roles);
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.accessMode, snapshot?.modules.DOOH.granted, [...roles].sort()]);
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const queryKey = JSON.stringify([contextKey, search, reload]);
  const [lists, setLists] = useState<{ key: string; players: DoohPlayerInventoryItem[]; total: number; groups: DoohPlayerGroupSummary[] } | null>(null);
  const [groupId, setGroupId] = useState('');
  const [group, setGroup] = useState<{ key: string; data: PlayerGroupDetailView } | null>(null);
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const groupKey = JSON.stringify([queryKey, groupId]);

  useEffect(() => {
    setLists(null); setGroupId(''); setGroup(null); setPlayerId(''); setError(''); setNotice('');
    if (!authorized) { setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    void Promise.all([
      apiClient.get<unknown>('/dooh/players', { params: { page: 1, pageSize: 100,
        ...(search ? { q: search } : {}) }, signal: ctrl.signal }),
      apiClient.get<unknown>('/dooh/player-groups', { signal: ctrl.signal }),
    ]).then(([resPlayers, resGroups]) => {
      if (ctrl.signal.aborted || contextRef.current !== contextKey) return;
      const players = parseDoohPlayerInventoryResponse(resPlayers.data);
      const groups = parseDoohPlayerGroups(resGroups.data);
      if (!players || players.meta.page !== 1 || players.meta.pageSize !== 100 || !groups) {
        setError('O contrato de listagem da API não pôde ser validado. Edição bloqueada.'); return;
      }
      setLists({ key: queryKey, players: players.items, total: players.meta.total, groups });
    }).catch((e: unknown) => { if (!ctrl.signal.aborted) setError(safeAuditReadError(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [authorized, queryKey, contextKey]);

  const visible = lists?.key === queryKey ? lists : null;
  const selectedGroup = visible?.groups.find((g) => g.id === groupId);
  useEffect(() => {
    setGroup(null); setPlayerId('');
    if (!authorized || !selectedGroup) return;
    const ctrl = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/player-groups/${encodeURIComponent(groupId)}`, { signal: ctrl.signal })
      .then((response) => {
        if (ctrl.signal.aborted || contextRef.current !== contextKey) return;
        const parsed = parsePlayerGroupDetail(response.data, groupId);
        if (!parsed) { setError('O detalhe do grupo não pôde ser validado. Edição bloqueada.'); return; }
        setGroup({ key: groupKey, data: parsed });
      }).catch((e: unknown) => { if (!ctrl.signal.aborted) setError(safeAuditReadError(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [authorized, groupKey, groupId, selectedGroup?.id, contextKey]);

  const detail = group?.key === groupKey ? group.data : null;
  const selectedPlayer = visible?.players.find((p) => p.id === playerId);
  const draft = detail && selectedPlayer ? draftGroupMemberChange(detail, operation, selectedPlayer) : null;
  const canSubmit = writable && !loading && !busy && !!visible && !!selectedGroup && !!draft;

  async function applyChange(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !detail || !selectedPlayer || !selectedGroup || !draft) return;
    const userKey = contextRef.current;
    const label = operation === 'add' ? 'adicionar ao' : 'remover do';
    if (!window.confirm(`Confirma ${label} grupo “${selectedGroup.name}” o player “${selectedPlayer.name}”? Alterações em grupos podem afetar a programação das telas.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      // Re-read prior to mutation; the backend repeats the comparison atomically.
      const refreshed = await apiClient.get<unknown>(`/dooh/player-groups/${encodeURIComponent(selectedGroup.id)}`);
      if (contextRef.current !== userKey) return;
      const newest = parsePlayerGroupDetail(refreshed.data, selectedGroup.id);
      if (!newest || newest.scheduleTargetCount !== 0 ||
          newest.members.length !== draft.expectedPlayerIds.length ||
          !newest.members.every((member) => draft.expectedPlayerIds.includes(member.id))) {
        setError('Grupo modificado ou associado à programação desde a leitura. Atualize a página.'); return;
      }
      const result = await apiClient.put<unknown>(
        `/dooh/player-groups/${encodeURIComponent(selectedGroup.id)}/members/compare-and-set`, draft);
      if (contextRef.current !== userKey) return;
      if (!isExpectedMembershipResult(result.data, selectedGroup.id, draft.playerIds)) {
        setError('A API não confirmou o conjunto de membros esperado. Consulte o grupo antes de repetir.'); return;
      }
      setNotice('Alteração confirmada pela API. Atualize para obter o estado mais recente.');
      setReload((v) => v + 1);
    } catch (e: unknown) { if (contextRef.current === userKey) setError(safeMembershipError(e)); }
    finally { if (contextRef.current === userKey) setBusy(false); }
  }

  if (!authorized) return null;
  return <section aria-label="Edição segura de membros DOOH D15A1-04" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <h3 className="font-semibold">Membros de grupos — edição protegida D15A1-04</h3>
    <p className="text-sm text-gray-600">Uma alteração por vez, com comparação atômica no backend. Não utiliza o endpoint legado de substituição cega. Grupos vinculados a programações não podem ser modificados aqui.</p>
    <p className="text-xs text-amber-800">Requer backend D15A1-04 publicado e licença DOOH FULL. Não altere grupos reais antes de aprovação de homologação.</p>
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim().slice(0, 160)); }}>
      <label className="flex-1 min-w-48 text-sm">Buscar candidato (até 100 resultados)
        <input className="mt-1 w-full rounded-md border p-2" value={searchInput} maxLength={160} onChange={(e) => setSearchInput(e.target.value)} />
      </label>
      <Button type="submit" variant="outline" disabled={loading || busy}>Buscar</Button>
      <Button type="button" variant="outline" disabled={loading || busy} onClick={() => setReload((v) => v + 1)}>Atualizar</Button>
    </form>
    {loading && <p role="status">Consultando membros e permissões…</p>}
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {visible && <form onSubmit={(e) => void applyChange(e)} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
      <label className="text-sm">Grupo
        <select className="mt-1 w-full rounded-md border p-2" value={groupId} disabled={busy} onChange={(e) => { setGroupId(e.target.value); setError(''); setNotice(''); }}>
          <option value="">Selecionar grupo</option>
          {visible.groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.memberCount} membros; {g.scheduleTargetCount} agendas)</option>)}
        </select>
      </label>
      <label className="text-sm">Operação
        <select className="mt-1 w-full rounded-md border p-2" value={operation} disabled={busy} onChange={(e) => { setOperation(e.target.value as 'add' | 'remove'); setPlayerId(''); }}>
          <option value="add">Adicionar um player</option><option value="remove">Remover um player</option>
        </select>
      </label>
      {detail && <>
        <p className="col-span-full text-sm">Grupo: {detail.members.length} membros; {detail.scheduleTargetCount} agendas. {detail.scheduleTargetCount ? 'Edição bloqueada: programação vinculada.' : 'Sem agenda vinculada.'}</p>
        <label className="text-sm">Player
          <select className="mt-1 w-full rounded-md border p-2" value={playerId} disabled={busy} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Selecionar player</option>
            {(operation === 'remove'
              ? visible.players.filter((p) => detail.members.some((m) => m.id === p.id))
              : visible.players.filter((p) => p.lifecycleStatus !== 'RETIRED' && !detail.members.some((m) => m.id === p.id)))
              .map((p) => <option key={p.id} value={p.id}>{p.name} ({p.lifecycleStatus})</option>)}
          </select>
        </label>
        <div className="flex items-end"><Button type="submit" disabled={!canSubmit}>{operation === 'add' ? 'Confirmar inclusão' : 'Confirmar remoção'}</Button></div>
        <p className="col-span-full text-xs text-gray-600">Lista limitada à página consultada; busque pelo nome para localizar outro player. A API revalida tenant, status e concorrência.</p>
      </>}
      {!writable && <p className="col-span-full text-xs">Somente leitura: é necessário acesso FULL.</p>}
    </form>}
  </section>;
}
