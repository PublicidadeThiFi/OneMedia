import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { parseDoohPlayerDetail } from '../lib/doohPlayerDetailContract';
import {
  doohOperationalError, isOperationalWriteAllowed, normalizedOperationalName,
  parseDoohPlayerGroups, type DoohPlayerGroupSummary,
} from '../lib/doohPlayerOperationsContract';

/** D15A1 — módulo separado das telas D13J/D13K, que permanecem somente leitura.
 * NUNCA atualiza lifecycleStatus, assignments, pairing, credenciais ou comandos.
 */
export function DoohPlayerOperations() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const technicalRole = roles.some((role) => role === 'ADMINISTRATIVO' || role === 'TI');
  const authorized = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' && technicalRole);
  const writable = isOperationalWriteAllowed(
    companyId, snapshot?.companyId, snapshot?.modules.DOOH.accessMode,
    snapshot?.modules.DOOH.granted, roles,
  );
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const [inventory, setInventory] = useState<{ key: string; items: DoohPlayerInventoryItem[]; total: number } | null>(null);
  const [groups, setGroups] = useState<{ key: string; items: DoohPlayerGroupSummary[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [groupMode, setGroupMode] = useState<'create' | 'rename'>('create');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const requestKey = JSON.stringify([companyId, query, reload]);

  useEffect(() => {
    setInventory(null);
    setGroups(null);
    setLoadError('');
    setActionError('');
    setPlayerId('');
    setPlayerName('');
    setGroupId('');
    setGroupName('');
    if (!authorized || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      apiClient.get<unknown>('/dooh/players', {
        params: { page: 1, pageSize: 100, ...(query ? { q: query } : {}) }, signal: controller.signal,
      }),
      apiClient.get<unknown>('/dooh/player-groups', { signal: controller.signal }),
    ]).then(([playersResult, groupsResult]) => {
      if (controller.signal.aborted) return;
      const players = parseDoohPlayerInventoryResponse(playersResult.data);
      const groupList = parseDoohPlayerGroups(groupsResult.data);
      if (!players || players.meta.page !== 1 || players.meta.pageSize !== 100 || !groupList) {
        setLoadError('A API devolveu um contrato inesperado. Nenhuma operação será habilitada.');
        return;
      }
      setInventory({ key: requestKey, items: players.items, total: players.meta.total });
      setGroups({ key: requestKey, items: groupList });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(doohOperationalError(error));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorized, companyId, query, reload, requestKey]);

  if (!authorized) return null;
  const shownPlayers = inventory?.key === requestKey ? inventory : null;
  const shownGroups = groups?.key === requestKey ? groups.items : null;
  const canSubmit = writable && !busy && !loading && Boolean(shownPlayers && shownGroups);
  const selectedPlayer = shownPlayers?.items.find((player) => player.id === playerId);
  const selectedGroup = shownGroups?.find((group) => group.id === groupId);

  async function savePlayer(event: FormEvent) {
    event.preventDefault();
    const name = normalizedOperationalName(playerName);
    if (!canSubmit || !selectedPlayer || !name || name === selectedPlayer.name) return;
    if (!window.confirm(`Confirma a alteração do nome de "${selectedPlayer.name}" para "${name}"?`)) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      const response = await apiClient.patch<unknown>(`/dooh/players/${encodeURIComponent(selectedPlayer.id)}`, { name });
      const updated = parseDoohPlayerDetail(response.data, selectedPlayer.id);
      if (!updated || updated.name !== name) {
        setActionError('A API não confirmou o nome esperado. Atualize e verifique antes de repetir.');
        return;
      }
      setNotice('Nome do player atualizado. Recarregando dados da empresa.');
      setReload((value) => value + 1);
    } catch (error: unknown) { setActionError(doohOperationalError(error)); }
    finally { setBusy(false); }
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    const name = normalizedOperationalName(groupName);
    if (!canSubmit || !name || (groupMode === 'rename' && (!selectedGroup || name === selectedGroup.name))) return;
    const action = groupMode === 'create' ? `Criar grupo "${name}"?` : `Renomear o grupo "${selectedGroup?.name}" para "${name}"?`;
    if (!window.confirm(action)) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      const response = groupMode === 'create'
        ? await apiClient.post<unknown>('/dooh/player-groups', { name })
        : await apiClient.patch<unknown>(`/dooh/player-groups/${encodeURIComponent(groupId)}`, { name });
      const created = response.data;
      if (!created || typeof created !== 'object' || !('name' in created) || created.name !== name ||
          !('id' in created) || typeof created.id !== 'string') {
        setActionError('A API não confirmou o grupo esperado. Atualize a lista antes de repetir.');
        return;
      }
      setNotice(groupMode === 'create' ? 'Grupo criado. Recarregando a lista.' : 'Grupo renomeado. Recarregando a lista.');
      setReload((value) => value + 1);
    } catch (error: unknown) { setActionError(doohOperationalError(error)); }
    finally { setBusy(false); }
  }

  return <section aria-label="Operações administrativas DOOH D15A1" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div>
      <h3 className="font-semibold text-gray-900">Gerenciamento administrativo — D15A1</h3>
      <p className="mt-1 text-sm text-gray-600">Edição de nome de player e criação/renomeação de grupos. Não ativa licenças, não pareia equipamentos, não altera telas, não apaga registros e não envia restart.</p>
      <p className="mt-1 text-xs text-amber-800">A ativação DOOH permanece pausada. Apenas usuários técnicos com acesso FULL podem gravar alterações; READ_ONLY mantém consulta.</p>
    </div>
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput.trim().slice(0, 160)); }}>
      <label className="flex-1 space-y-1 text-sm min-w-[180px]"><span>Filtrar players para editar</span>
        <input className="w-full rounded-md border border-gray-300 p-2" maxLength={160} value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Nome ou plataforma" />
      </label>
      <Button type="submit" variant="outline" disabled={loading || busy}>Consultar</Button>
      <Button type="button" variant="outline" disabled={loading || busy} onClick={() => setReload((value) => value + 1)}>Atualizar listas</Button>
    </form>
    {loading && <p role="status" className="text-sm text-gray-600">Carregando permissões e registros operacionais…</p>}
    {loadError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
    {actionError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
    {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {shownPlayers && shownGroups && <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={(event) => void savePlayer(event)} className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Nome do player</h4>
        <p className="text-xs text-gray-600">{shownPlayers.total} no filtro. {shownPlayers.total > 100 ? 'Exibindo os primeiros 100; filtre por nome para encontrar outros.' : 'Selecione um player existente.'}</p>
        <label className="block space-y-1 text-sm"><span>Player</span>
          <select className="w-full rounded-md border p-2" value={playerId} onChange={(event) => {
            const next = shownPlayers.items.find((player) => player.id === event.target.value);
            setPlayerId(next?.id ?? ''); setPlayerName(next?.name ?? ''); setActionError('');
          }}>
            <option value="">Selecionar</option>
            {shownPlayers.items.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.lifecycleStatus}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm"><span>Novo nome (até 120 caracteres)</span>
          <input className="w-full rounded-md border p-2" maxLength={120} value={playerName} onChange={(event) => setPlayerName(event.target.value)} disabled={!writable || !selectedPlayer} />
        </label>
        <Button type="submit" disabled={!canSubmit || !selectedPlayer || !normalizedOperationalName(playerName) || playerName.trim() === selectedPlayer.name}>Salvar nome</Button>
      </form>
      <form onSubmit={(event) => void saveGroup(event)} className="space-y-3 rounded-lg border p-4">
        <h4 className="font-medium">Grupos de players ({shownGroups.length})</h4>
        <label className="block space-y-1 text-sm"><span>Operação</span>
          <select className="w-full rounded-md border p-2" value={groupMode} onChange={(event) => { setGroupMode(event.target.value as 'create' | 'rename'); setGroupId(''); setGroupName(''); setActionError(''); }} disabled={!writable}>
            <option value="create">Criar grupo</option><option value="rename">Renomear grupo</option>
          </select>
        </label>
        {groupMode === 'rename' && <label className="block space-y-1 text-sm"><span>Grupo</span>
          <select className="w-full rounded-md border p-2" value={groupId} onChange={(event) => {
            const next = shownGroups.find((group) => group.id === event.target.value);
            setGroupId(next?.id ?? ''); setGroupName(next?.name ?? ''); setActionError('');
          }} disabled={!writable}>
            <option value="">Selecionar</option>
            {shownGroups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.memberCount} players)</option>)}
          </select>
        </label>}
        <label className="block space-y-1 text-sm"><span>Nome do grupo (até 120 caracteres)</span>
          <input className="w-full rounded-md border p-2" maxLength={120} value={groupName} onChange={(event) => setGroupName(event.target.value)} disabled={!writable} />
        </label>
        <Button type="submit" disabled={!canSubmit || !normalizedOperationalName(groupName) || (groupMode === 'rename' && (!selectedGroup || groupName.trim() === selectedGroup.name))}>
          {groupMode === 'create' ? 'Criar grupo' : 'Salvar nome do grupo'}
        </Button>
        <ul className="max-h-40 overflow-auto space-y-1 text-xs text-gray-600">{shownGroups.map((group) =>
          <li key={group.id}>{group.name} · {group.memberCount} players · {group.scheduleTargetCount} programações</li>)}</ul>
        {shownGroups.length === 0 && <p className="text-xs text-gray-600">Nenhum grupo cadastrado nesta empresa.</p>}
      </form>
    </div>}
    {!writable && <p className="text-xs text-gray-600">Somente leitura: operações de escrita indisponíveis para este acesso.</p>}
  </section>;
}
