import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohPlaylistCreateRename } from './DoohPlaylistCreateRename';
import { DoohPlaylistDraftEditor } from './DoohPlaylistDraftEditor';
import { DoohPlaylistDraftReorder } from './DoohPlaylistDraftReorder';
import { canReadDoohPlaylists, doohPlaylistReadError, parseDoohPlaylistCatalog,
  parseDoohPlaylistDetail, type DoohPlaylistDetail, type DoohPlaylistSummary,
} from '../lib/doohPlaylistCatalogContract';

const dateText = (value: string) => new Date(value).toLocaleString('pt-BR');
const versionStatusText = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', ARCHIVED: 'Arquivada' } as const;

/** D15C-01 — catálogo e detalhe de playlists, estritamente GET. Não cria agendas nem publica manifest. */
export function DoohPlaylistCatalogReadOnly() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const companyId = user?.companyId ?? null;
  const mode = snapshot?.modules.DOOH.accessMode;
  const granted = snapshot?.modules.DOOH.granted;
  const allowed = canReadDoohPlaylists(companyId, snapshot?.companyId, granted, mode, roles);
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId, granted, mode, [...roles].sort()]);
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [listing, setListing] = useState<{ key: string; items: DoohPlaylistSummary[] } | null>(null);
  const [detail, setDetail] = useState<{ key: string; item: DoohPlaylistDetail } | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const listKey = JSON.stringify([contextKey, refresh]);
  const detailKey = JSON.stringify([listKey, selectedId]);
  const currentDetailKey = useRef(detailKey);
  currentDetailKey.current = detailKey;

  useEffect(() => { setSelectedId(''); setListing(null); setDetail(null); setError(''); setDetailError(''); }, [contextKey]);
  useEffect(() => {
    setListing(null); setDetail(null); setError('');
    if (!allowed || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/playlists', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const projected = parseDoohPlaylistCatalog(data, companyId);
        if (!projected) { setError('Resposta do catálogo de playlists incompatível com a API.'); return; }
        setListing({ key: listKey, items: projected });
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(doohPlaylistReadError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, companyId, listKey]);

  const entries = listing?.key === listKey ? listing.items : null;
  const selectedExists = Boolean(entries?.some((entry) => entry.id === selectedId));
  useEffect(() => {
    setDetail(null); setDetailError('');
    if (!allowed || !companyId || !selectedId || !selectedExists) { setDetailLoading(false); return; }
    const controller = new AbortController();
    setDetailLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || currentDetailKey.current !== detailKey) return;
        const projected = parseDoohPlaylistDetail(data, companyId, selectedId);
        if (!projected) { setDetailError('Detalhe da playlist incompatível com a API.'); return; }
        setDetail({ key: detailKey, item: projected });
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && currentDetailKey.current === detailKey)
          setDetailError(doohPlaylistReadError(err));
      }).finally(() => { if (!controller.signal.aborted && currentDetailKey.current === detailKey) setDetailLoading(false); });
    return () => controller.abort();
  }, [allowed, companyId, selectedId, selectedExists, detailKey]);

  if (!allowed) return <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
    O catálogo de playlists exige acesso DOOH e função ADMINISTRATIVO ou TI. Nenhum dado foi consultado.
  </div>;
  const selected = detail?.key === detailKey && selectedExists ? detail.item : null;
  return <section aria-label="Catálogo de playlists DOOH D15C-01" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">Playlists — catálogo operacional</h3>
        <p className="text-sm text-gray-600">Consulta de playlists e versões registradas no backend da empresa autenticada.</p>
        <p className="text-xs text-amber-800">Uma versão publicada não comprova distribuição aos players, reprodução ou audiência. Nenhuma programação é acionada nesta tela.</p>
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar</Button>
    </div>
    <p className="text-xs text-gray-600">A API fornece até 100 playlists recentes, sem informar total ou oferecer paginação. O catálogo pode ser parcial.</p>
    {loading && <p role="status" className="text-sm text-gray-600">Carregando playlists…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {entries && <>
      <p className="text-xs text-gray-600">{entries.length} playlist(s) retornada(s) pela API.</p>
      {entries.length === 0 ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">Nenhuma playlist cadastrada.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b bg-gray-50"><tr><th className="p-3">Playlist</th><th className="p-3">Estado</th>
            <th className="p-3">Versão atual</th><th className="p-3">Versões</th><th className="p-3">Atualização</th><th className="p-3">Detalhe</th></tr></thead>
          <tbody>{entries.map((playlist) => <tr key={playlist.id} className="border-b text-gray-700">
            <td className="p-3 break-words font-medium">{playlist.name}</td><td className="p-3">{playlist.status === 'ACTIVE' ? 'Ativa' : 'Arquivada'}</td>
            <td className="p-3">{playlist.currentVersion === 0 ? 'Ainda não publicada' : playlist.currentVersion}</td>
            <td className="p-3">{playlist.versionCount}{playlist.draftVersion !== null ? ` · rascunho v${playlist.draftVersion}` : ''}</td>
            <td className="p-3">{dateText(playlist.updatedAt)}</td>
            <td className="p-3"><Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(playlist.id)}
              aria-label={`Consultar detalhes de ${playlist.name}`}>Consultar</Button></td>
          </tr>)}</tbody>
        </table></div>}
    </>}
    {entries && companyId && <DoohPlaylistCreateRename companyId={companyId} playlists={entries} onChanged={() => setRefresh((n) => n + 1)} />}
    {entries && companyId && <DoohPlaylistDraftEditor companyId={companyId} playlists={entries} onChanged={() => setRefresh((n) => n + 1)} />}
    {entries && companyId && <DoohPlaylistDraftReorder companyId={companyId} playlists={entries} onChanged={() => setRefresh((n) => n + 1)} />}
    {selectedExists && <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-gray-900">Histórico da playlist selecionada</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId('')}>Fechar</Button></div>
      {detailLoading && <p role="status" className="text-sm text-gray-600">Consultando versões…</p>}
      {detailError && <p role="alert" className="text-sm text-red-800">{detailError}</p>}
      {selected && <>
        <p className="text-sm text-gray-700">{selected.name} · {selected.totalVersions} versão(ões) registrada(s).</p>
        {selected.versionsTruncated && <p className="text-xs text-amber-800">Exibindo as 50 versões mais recentes; histórico completo não está paginado.</p>}
        {selected.versions.length === 0 ? <p className="text-sm text-gray-600">Nenhuma versão retornada.</p> :
          <ul className="space-y-2">{selected.versions.map((v) => <li key={v.id} className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
            <p className="font-medium">Versão {v.version} · {versionStatusText[v.status]} · {v.itemCount} item(ns)</p>
            <p>Criada em {dateText(v.createdAt)}{v.publishedAt ? ` · publicada em ${dateText(v.publishedAt)}` : ''}</p>
            {v.checksumPrefix && <p>Checksum registrado: {v.checksumPrefix}… (não verificado contra conteúdo)</p>}
          </li>)}</ul>}
      </>}
    </div>}
  </section>;
}
