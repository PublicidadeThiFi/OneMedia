import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { DoohPlayerDetailReadOnly } from './DoohPlayerDetailReadOnly';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { doohPlayerReadFailure } from '../lib/doohPlayerReadFailure';
import {
  doohPlayerConnectionLabel,
  doohPlayerManifestLabel,
  parseDoohPlayerInventoryResponse,
  type DoohPlayerInventoryResponse,
} from '../lib/doohPlayerInventoryContract';

type LifecycleFilter = '' | 'ACTIVE' | 'INACTIVE' | 'RETIRED';
type ConnectivityFilter = '' | 'true' | 'false';

function lastSeen(value: string | null): string {
  if (!value) return 'Nunca informado';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : 'Indisponível';
}

/** D13J: GET paginado exclusivamente. Nenhum endpoint de pareamento/ativação/manifest é chamado. */
export function DoohPlayerInventoryReadOnly() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const hasTechnicalRole = Boolean(user?.roles?.some((role) => role === 'ADMINISTRATIVO' || role === 'TI'));
  const allowed = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && ['FULL', 'READ_ONLY'].includes(snapshot.modules.DOOH.accessMode) && hasTechnicalRole);

  const [typedSearch, setTypedSearch] = useState('');
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>('');
  const [connectivity, setConnectivity] = useState<ConnectivityFilter>('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ requestKey: string; response: DoohPlayerInventoryResponse } | null>(null);
  const [selected, setSelected] = useState<{ requestKey: string; playerId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const requestKey = JSON.stringify([companyId, page, search, lifecycle, connectivity, reload]);

  useEffect(() => {
    // Evita dados antigos entre troca de empresa, filtros e paginação.
    setData(null);
    setError('');
    setRefreshedAt(null);
    if (!allowed || !companyId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/players', {
      params: { page, pageSize: 20, ...(search ? { q: search } : {}),
        ...(lifecycle ? { lifecycleStatus: lifecycle } : {}),
        ...(connectivity ? { online: connectivity } : {}) },
      signal: controller.signal,
    }).then(({ data: result }) => {
      if (controller.signal.aborted) return;
      const projected = parseDoohPlayerInventoryResponse(result);
      if (!projected || projected.meta.page !== page || projected.meta.pageSize !== 20) {
        setError('Resposta do inventário DOOH incompatível. Nenhuma informação foi apresentada.');
        return;
      }
      setData({ requestKey, response: projected });
      setRefreshedAt(new Date().toLocaleString('pt-BR'));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(doohPlayerReadFailure(error, 'inventory'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [allowed, companyId, page, search, lifecycle, connectivity, reload, requestKey]);

  if (!allowed) return <div className="rounded-xl border bg-gray-50 p-5 text-sm text-gray-600">
    A consulta de players exige acesso DOOH e função ADMINISTRATIVO ou TI. Nenhum dado foi solicitado.
  </div>;

  const response = data?.requestKey === requestKey ? data.response : null;
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(typedSearch.trim().slice(0, 160));
  };

  return <section aria-label="Inventário de players DOOH" className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-900">Inventário de players — consulta operacional</h3>
      <p className="text-sm text-gray-600">Dados reais do backend da empresa autenticada. Esta tela não ativa, desativa, pareia nem envia comandos aos dispositivos.</p>
      <p className="text-xs text-amber-800">Um player ACTIVE ocupa licença mesmo offline. Heartbeat e versões de manifest não comprovam reprodução física, audiência ou impressões.</p>
    </div>
    <form className="grid gap-3 md:grid-cols-[minmax(160px,1fr)_auto_auto_auto] md:items-end" onSubmit={submitSearch}>
      <label className="block text-sm space-y-1"><span>Buscar player</span>
        <input aria-label="Buscar player" className="w-full rounded-md border border-gray-300 p-2" maxLength={160} value={typedSearch} onChange={(event) => setTypedSearch(event.target.value)} placeholder="Nome ou plataforma" />
      </label>
      <label className="block text-sm space-y-1"><span>Ciclo de vida</span>
        <select aria-label="Ciclo de vida" className="w-full rounded-md border border-gray-300 p-2" value={lifecycle} onChange={(event) => { setLifecycle(event.target.value as LifecycleFilter); setPage(1); }}>
          <option value="">Todos</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="RETIRED">RETIRED</option>
        </select>
      </label>
      <label className="block text-sm space-y-1"><span>Conectividade</span>
        <select aria-label="Conectividade" className="w-full rounded-md border border-gray-300 p-2" value={connectivity} onChange={(event) => { setConnectivity(event.target.value as ConnectivityFilter); setPage(1); }}>
          <option value="">Todos</option><option value="true">Heartbeat recente</option><option value="false">Sem heartbeat recente</option>
        </select>
      </label>
      <Button type="submit" disabled={loading}>Buscar</Button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
      <span>{response ? `${response.meta.total} player(s) no filtro · página ${response.meta.page} de ${response.meta.totalPages}` : 'Inventário não carregado'}</span>
      <div className="flex items-center gap-3">
        {refreshedAt && <span>Consulta: {refreshedAt}</span>}
        <Button variant="outline" type="button" disabled={loading} onClick={() => setReload((value) => value + 1)}>Atualizar</Button>
      </div>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando players…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {response && response.items.length === 0 && <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{page > response.meta.totalPages ? 'Esta página não está mais disponível. Retorne à página anterior.' : 'Nenhum player encontrado para os filtros atuais.'}</p>}
    {response && response.items.length > 0 && <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b bg-gray-50 text-gray-700"><tr>
          <th className="p-3 font-medium">Player</th><th className="p-3 font-medium">Ciclo</th>
          <th className="p-3 font-medium">Conexão</th><th className="p-3 font-medium">Tela associada</th>
          <th className="p-3 font-medium">Manifest</th><th className="p-3 font-medium">Último contato</th>
          <th className="p-3 font-medium">Consulta</th>
        </tr></thead>
        <tbody>{response.items.map((player) => <tr key={player.id} className="border-b align-top text-gray-700">
          <td className="p-3"><span className="font-medium text-gray-900">{player.name || 'Sem nome'}</span><span className="block text-xs">{player.platform || 'Plataforma não informada'}</span></td>
          <td className="p-3">{player.lifecycleStatus}</td>
          <td className="p-3">{doohPlayerConnectionLabel(player)}</td>
          <td className="p-3">{player.currentAssignment?.mediaUnit.label || 'Não associada'}</td>
          <td className="p-3 text-xs">{doohPlayerManifestLabel(player)}</td>
          <td className="p-3 text-xs">{lastSeen(player.lastSeenAt)}</td>
          <td className="p-3"><Button type="button" variant="outline" aria-label={`Ver detalhes de ${player.name || 'player sem nome'}`} onClick={() => setSelected({ requestKey, playerId: player.id })}>Detalhes</Button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {response && selected?.requestKey === requestKey && response.items.some((item) => item.id === selected.playerId) && companyId && (
      <DoohPlayerDetailReadOnly
        key={`${companyId}:${selected.playerId}:${requestKey}`}
        companyId={companyId}
        playerId={selected.playerId}
        onClose={() => setSelected(null)}
      />
    )}
    {response && <div className="flex items-center justify-end gap-3">
      <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
      <span className="text-xs text-gray-600">{page} / {response.meta.totalPages}</span>
      <Button type="button" variant="outline" disabled={loading || page >= response.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
    </div>}
  </section>;
}
