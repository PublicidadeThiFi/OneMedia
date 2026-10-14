import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parseDoohPlayerGroups, type DoohPlayerGroupSummary } from '../lib/doohPlayerOperationsContract';
import {
  parsePlayerGroupDetail, parsePlayerCommandHistory, safeAuditReadError,
  type PlayerGroupDetailView, type PlayerCommandView,
} from '../lib/doohPlayerAuditContract';

/** D15A1-B03. GET autenticados apenas; não publica manifest, não faz restart ou alteração de membros. */
export function DoohPlayerAuditReadOnly() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roleKey = (user?.roles ?? []).join(',');
  const authorized = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' &&
    user?.roles?.some((role) => role === 'ADMINISTRATIVO' || role === 'TI'));
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, roleKey]);
  const [reload, setReload] = useState(0);
  const listKey = JSON.stringify([contextKey, reload]);
  const [lists, setLists] = useState<{ key: string; players: DoohPlayerInventoryItem[]; total: number; groups: DoohPlayerGroupSummary[] } | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [groupId, setGroupId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [groupView, setGroupView] = useState<{ key: string; data: PlayerGroupDetailView } | null>(null);
  const [historyView, setHistoryView] = useState<{ key: string; data: PlayerCommandView[] } | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const groupKey = JSON.stringify([listKey, groupId]);
  const playerKey = JSON.stringify([listKey, playerId]);

  useEffect(() => {
    setLists(null); setGroupId(''); setPlayerId('');
    setGroupView(null); setHistoryView(null); setListError('');
    if (!authorized) { setListLoading(false); return; }
    const controller = new AbortController();
    setListLoading(true);
    void Promise.all([
      apiClient.get<unknown>('/dooh/players', { params: { page: 1, pageSize: 100 }, signal: controller.signal }),
      apiClient.get<unknown>('/dooh/player-groups', { signal: controller.signal }),
    ]).then(([playersResponse, groupsResponse]) => {
      if (controller.signal.aborted) return;
      const players = parseDoohPlayerInventoryResponse(playersResponse.data);
      const groups = parseDoohPlayerGroups(groupsResponse.data);
      if (!players || players.meta.page !== 1 || players.meta.pageSize !== 100 || !groups) {
        setListError('Listagens incompatíveis com o contrato vigente. Nenhum resultado será exibido.'); return;
      }
      setLists({ key: listKey, players: players.items, total: players.meta.total, groups });
    }).catch((error: unknown) => { if (!controller.signal.aborted) setListError(safeAuditReadError(error)); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [authorized, listKey]);

  const visibleLists = lists?.key === listKey ? lists : null;
  const selectedGroup = visibleLists?.groups.find((item) => item.id === groupId);
  const selectedPlayer = visibleLists?.players.find((item) => item.id === playerId);

  useEffect(() => {
    setGroupView(null); setGroupError('');
    if (!authorized || !selectedGroup) { setGroupLoading(false); return; }
    const controller = new AbortController();
    setGroupLoading(true);
    void apiClient.get<unknown>(`/dooh/player-groups/${encodeURIComponent(selectedGroup.id)}`, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const parsed = parsePlayerGroupDetail(response.data, selectedGroup.id);
        if (!parsed) { setGroupError('Contrato de membros incompatível. Dados ocultados.'); return; }
        setGroupView({ key: groupKey, data: parsed });
      }).catch((error: unknown) => { if (!controller.signal.aborted) setGroupError(safeAuditReadError(error)); })
      .finally(() => { if (!controller.signal.aborted) setGroupLoading(false); });
    return () => controller.abort();
  }, [authorized, selectedGroup?.id, groupKey]);

  useEffect(() => {
    setHistoryView(null); setHistoryError('');
    if (!authorized || !selectedPlayer) { setHistoryLoading(false); return; }
    const controller = new AbortController();
    setHistoryLoading(true);
    void apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(selectedPlayer.id)}/commands`, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const parsed = parsePlayerCommandHistory(response.data, selectedPlayer.id);
        if (!parsed) { setHistoryError('Histórico de comandos incompatível. Dados ocultados.'); return; }
        setHistoryView({ key: playerKey, data: parsed });
      }).catch((error: unknown) => { if (!controller.signal.aborted) setHistoryError(safeAuditReadError(error)); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [authorized, selectedPlayer?.id, playerKey]);

  if (!authorized) return null;
  const groupDetail = groupView?.key === groupKey ? groupView.data : null;
  const commandHistory = historyView?.key === playerKey ? historyView.data : null;
  const displayDate = (v: string) => new Date(v).toLocaleString('pt-BR');

  return <section aria-label="Auditoria de grupos e comandos DOOH D15A1-03" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h3 className="font-semibold text-gray-900">Membros de grupos e histórico de comandos — D15A1-03</h3>
        <p className="mt-1 text-sm text-gray-600">Consulta operacional: não altera grupos, não envia reinicializações e não ativa players.</p>
        <p className="mt-1 text-xs text-amber-800">Status de comando não certifica execução física ou exibição de mídia.</p>
      </div>
      <Button type="button" variant="outline" disabled={listLoading || groupLoading || historyLoading} onClick={() => setReload((v) => v + 1)}>Atualizar</Button>
    </div>
    {listLoading && <p role="status" className="text-sm text-gray-600">Consultando grupos e players…</p>}
    {listError && <p role="alert" className="text-sm text-red-800">{listError}</p>}
    {visibleLists && <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Composição dos grupos</h4>
        <label className="block space-y-1 text-sm"><span>Grupo</span>
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-md border p-2">
            <option value="">Selecionar grupo</option>
            {visibleLists.groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.memberCount})</option>)}
          </select>
        </label>
        {visibleLists.groups.length === 0 && <p className="text-sm text-gray-600">Nenhum grupo cadastrado.</p>}
        {groupLoading && <p role="status" className="text-sm">Carregando composição…</p>}
        {groupError && <p role="alert" className="text-sm text-red-800">{groupError}</p>}
        {groupDetail && <div className="space-y-2 text-sm">
          <p>{groupDetail.members.length} membro(s); {groupDetail.scheduleTargetCount} programação(ões) associada(s).</p>
          {groupDetail.members.length === 0 ? <p className="text-gray-600">Grupo vazio.</p> :
            <ul className="max-h-64 space-y-2 overflow-auto">{groupDetail.members.map((member) =>
              <li key={member.id} className="rounded-md bg-gray-50 px-3 py-2">
                <span className="font-medium">{member.name}</span> — {member.lifecycleStatus}, {member.online ? 'online' : 'não online'}
                <p className="text-xs text-gray-500">Membro desde: {displayDate(member.memberSince)}</p>
              </li>)}</ul>}
        </div>}
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Histórico de comandos do player</h4>
        <p className="text-xs text-gray-600">Até 50 registros mais recentes. {visibleLists.total > 100 ? 'Para outros players, use a consulta filtrada do inventário.' : ''}</p>
        <label className="block space-y-1 text-sm"><span>Player</span>
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="w-full rounded-md border p-2">
            <option value="">Selecionar player</option>
            {visibleLists.players.map((player) => <option key={player.id} value={player.id}>{player.name} ({player.lifecycleStatus})</option>)}
          </select>
        </label>
        {historyLoading && <p role="status" className="text-sm">Carregando histórico…</p>}
        {historyError && <p role="alert" className="text-sm text-red-800">{historyError}</p>}
        {commandHistory && (commandHistory.length === 0 ? <p className="text-sm text-gray-600">Nenhum comando registrado.</p> :
          <ul className="max-h-64 space-y-2 overflow-auto text-sm">{commandHistory.map((command) =>
            <li key={command.id} className="rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium">Reinicialização</span> — {command.status}
              <p className="text-xs text-gray-600">Solicitado: {displayDate(command.requestedAt)} · Expira: {displayDate(command.expiresAt)}</p>
            </li>)}</ul>)}
      </div>
    </div>}
  </section>;
}
