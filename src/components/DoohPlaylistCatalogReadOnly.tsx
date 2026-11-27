import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohPlaylistCreateRename } from './DoohPlaylistCreateRename';
import { DoohPlaylistDraftEditor } from './DoohPlaylistDraftEditor';
import { DoohPlaylistDraftReorder } from './DoohPlaylistDraftReorder';
import { DoohPlaylistPublishQa } from './DoohPlaylistPublishQa';
import { DoohPublishedVersionInspector } from './DoohPublishedVersionInspector';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [action, setAction] = useState<'list' | 'create' | 'edit' | 'order' | 'publish' | 'history'>('list');
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

  useEffect(() => { setSelectedId(''); setAction('list'); setListing(null); setDetail(null); setError(''); setDetailError(''); }, [contextKey]);
  useEffect(() => {
    setListing(null); setDetail(null); setError('');
    if (!allowed || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/playlists', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const projected = parseDoohPlaylistCatalog(data, companyId);
        if (!projected) { setError('Não foi possível carregar as sequências. Tente novamente.'); return; }
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
        if (!projected) { setDetailError('Não foi possível abrir esta sequência. Tente novamente.'); return; }
        setDetail({ key: detailKey, item: projected });
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && currentDetailKey.current === detailKey)
          setDetailError(doohPlaylistReadError(err));
      }).finally(() => { if (!controller.signal.aborted && currentDetailKey.current === detailKey) setDetailLoading(false); });
    return () => controller.abort();
  }, [allowed, companyId, selectedId, selectedExists, detailKey]);

  if (!allowed) return <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
    Seu perfil não tem acesso às sequências. Peça acesso a um administrador.
  </div>;
  const selected = detail?.key === detailKey && selectedExists ? detail.item : null;
  return <section aria-label="Listas de exibição DOOH" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-gray-900">Minhas sequências</h2>
        <p className="text-sm text-gray-600">Monte uma sequência de mídias e publique. Depois escolha os horários e as telas em “Horários e telas”.</p>
        
      </div>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setAction('create')}>Criar sequência</Button><Button type="button" variant="outline" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar</Button></div>
    </div>
    <DoohWorkspaceTabs label="Etapas da lista de exibição" selected={action} onSelect={setAction} tabs={[
      { id: 'list', label: 'Todas', description: 'Publicar não envia às telas; isso é feito em “Horários e telas”.' },
      { id: 'create', label: 'Criar ou renomear', description: 'Dê um nome à sequência.' },
      { id: 'edit', label: 'Adicionar mídias', description: 'Escolha a sequência e adicione mídias prontas.' },
      { id: 'order', label: 'Ordenar', description: 'Defina a sequência das mídias antes de publicar.' },
      { id: 'publish', label: 'Revisar e publicar', description: 'Confira as mídias e publique.' },
      { id: 'history', label: 'Versões', description: 'Versões anteriores.' },
    ]} />
    <p className="text-xs text-gray-600">Mostrando as 100 sequências mais recentes.</p>
    <details className="text-xs text-gray-600"><summary className="cursor-pointer">Como funciona</summary>
      <p className="mt-1">Publicar uma sequência deixa ela pronta para usar. Ela só vai para as TVs depois que você escolher horários e telas.</p>
    </details>
    {successMessage && <p role="status" className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">{successMessage}</p>}
    {loading && <p role="status" className="text-sm text-gray-600">Carregando sequências…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {entries && <>
      {action === 'list' && <p className="text-xs text-gray-600">{entries.length} {entries.length === 1 ? 'sequência' : 'sequências'}.</p>}
      {action !== 'list' ? null : entries.length === 0 ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">Nenhuma sequência ainda. Comece em Criar sequência.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b bg-gray-50"><tr><th className="p-3">Sequência</th><th className="p-3">Situação</th><th className="p-3">Atualizada</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>{entries.map((playlist) => <tr key={playlist.id} className="border-b text-gray-700">
            <td className="p-3 break-words font-medium">{playlist.name}</td>
            <td className="p-3">{(() => { const st = playlist.status !== 'ACTIVE' ? { t: 'Arquivada', c: 'bg-gray-100 text-gray-700 ring-gray-200' } : playlist.currentVersion === 0 ? { t: 'Ainda não publicada', c: 'bg-gray-100 text-gray-700 ring-gray-200' } : { t: 'Publicada', c: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${st.c}`}>{st.t}</span>; })()}</td>
            <td className="p-3">{dateText(playlist.updatedAt)}</td>
            <td className="p-3"><Button type="button" variant="outline" size="sm" onClick={() => { setSelectedId(playlist.id); setAction('history'); }}
              aria-label={`Abrir ${playlist.name}`}>Abrir</Button></td>
          </tr>)}</tbody>
        </table></div>}
    </>}
    {action === 'create' && entries && companyId && <DoohPlaylistCreateRename companyId={companyId} playlists={entries} onChanged={() => setRefresh((n) => n + 1)} />}
    {action === 'edit' && entries && companyId && <DoohPlaylistDraftEditor companyId={companyId} playlists={entries} onChanged={() => { setRefresh((n) => n + 1); setSuccessMessage('Itens da lista atualizados. Continue para ordenar ou revisar antes de publicar.'); }} />}
    {action === 'order' && entries && companyId && <DoohPlaylistDraftReorder companyId={companyId} playlists={entries} onChanged={() => setRefresh((n) => n + 1)} />}
    {action === 'publish' && entries && companyId && <DoohPlaylistPublishQa companyId={companyId} playlists={entries} onChanged={() => { setRefresh((n) => n + 1); setAction('list'); setSuccessMessage('Sequência publicada. Agora escolha horários e telas.'); }} />}
    {action === 'history' && !selectedExists && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Escolha uma sequência em “Minhas sequências” para ver as versões e definir horários e telas.</p>}
    {action === 'history' && selectedExists && <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-gray-900">Versões da sequência</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedId(''); setAction('list'); }}>Voltar às listas</Button></div>
      {detailLoading && <p role="status" className="text-sm text-gray-600">Consultando versões…</p>}
      {detailError && <p role="alert" className="text-sm text-red-800">{detailError}</p>}
      {selected && <>
        <p className="text-sm text-gray-700">{selected.name} · {selected.totalVersions} versão(ões) registrada(s).</p>
        {selected.versionsTruncated && <p className="text-xs text-amber-800">Exibindo as 50 versões mais recentes; histórico completo não está paginado.</p>}
        {selected.versions.length === 0 ? <p className="text-sm text-gray-600">Nenhuma versão retornada.</p> :
          <ul className="space-y-2">{selected.versions.map((v) => <li key={v.id} className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
            <p className="font-medium">Versão {v.version} · {versionStatusText[v.status]} · {v.itemCount} item(ns)</p>
            <p>Criada em {dateText(v.createdAt)}{v.publishedAt ? ` · publicada em ${dateText(v.publishedAt)}` : ''}</p>
            {v.status === 'PUBLISHED' && <a className="mt-2 inline-flex rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700"
              href={`/app/dooh/scheduling?ux=agendas&playlistId=${encodeURIComponent(selected.id)}&versionId=${encodeURIComponent(v.id)}`}>Definir horários e telas</a>}
            {v.checksumPrefix && <details className="mt-2"><summary className="cursor-pointer">Detalhes técnicos</summary><p>Checksum registrado: {v.checksumPrefix}… (não verificado contra conteúdo)</p></details>}
          </li>)}</ul>}
        {companyId && <DoohPublishedVersionInspector companyId={companyId} detail={selected} />}
      </>}
    </div>}
  </section>;
}
