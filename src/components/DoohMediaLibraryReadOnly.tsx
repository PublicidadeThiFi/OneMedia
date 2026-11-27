import { doohMediaDisplayName } from '../lib/doohMediaDisplayName';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseGuidedContentCapabilities } from '../lib/doohGuidedScreenContentContract';
import { useDoohMediaPilotCapabilities } from '../lib/useDoohMediaPilotCapabilities';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohFolderOperations } from './DoohFolderOperations';
import { DoohMediaOrganizeCas } from './DoohMediaOrganizeCas';
import { DoohMediaUpload } from './DoohMediaUpload';
import { DoohMediaProcessing } from './DoohMediaProcessing';
import { DoohMediaVersionsReadOnly } from './DoohMediaVersionsReadOnly';
import {
  displayDoohMediaSize,
  doohLibraryReadError,
  DOOH_PREVIEW_BATCH,
  parseDoohMediaPreviews,
  parseDoohLibraryFolders,
  type DoohMediaPreview,
  parseDoohLibraryMedia,
  type DoohLibraryFolder,
  type DoohLibraryFolderFilter,
  type DoohLibraryMedia,
  type DoohLibraryStatus,
} from '../lib/doohMediaLibraryContract';

const statusLabels: Record<DoohLibraryStatus, string> = {
  PENDING: 'Enviada · falta preparar', PROCESSING: 'Preparando arquivo', READY: 'Pronta para usar', ERROR: 'Não foi possível preparar',
};

/** D15B-01 — catálogo real, GET apenas. NÃO publica, envia, exclui ou certifica exibição. */
export function DoohMediaLibraryReadOnly() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roleKey = (user?.roles ?? []).join(',');
  const accessMode = snapshot?.modules.DOOH.accessMode;
  const authorized = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot?.modules.DOOH.granted && (accessMode === 'FULL' || accessMode === 'READ_ONLY') &&
    user?.roles?.some((role) => role === 'ADMINISTRATIVO' || role === 'TI'));
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, accessMode, roleKey]);
  const pilot = useDoohMediaPilotCapabilities(companyId ?? '', contextKey, authorized && accessMode === 'FULL');
  const [guided,setGuided]=useState<{key:string;enabled:boolean}|null>(null);
  useEffect(()=>{
    setGuided(null);if(!authorized||accessMode!=='FULL')return;
    const controller=new AbortController();
    void apiClient.get<unknown>('/dooh/operational-screens/content-capabilities',{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted)setGuided({key:contextKey,enabled:parseGuidedContentCapabilities(data)===true});}).catch(()=>{if(!controller.signal.aborted)setGuided({key:contextKey,enabled:false});});
    return ()=>controller.abort();
  },[authorized,accessMode,contextKey]);
  const guidedEnabled=guided?.key===contextKey&&guided.enabled;
  const [folderFilter, setFolderFilter] = useState<DoohLibraryFolderFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'' | DoohLibraryStatus>('');
  const [typedSearch, setTypedSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<'media' | 'upload' | 'processing' | 'organize'>('media');
  const [preferredMediaId, setPreferredMediaId] = useState('');
  const [recentMediaId, setRecentMediaId] = useState('');
  const [recentAuto, setRecentAuto] = useState(false);
  const [recentChecks, setRecentChecks] = useState(0);
  const onUploaded = (mediaId: string, autoProcessing: boolean) => {
    setRecentMediaId(mediaId); setRecentChecks(0); setRecentAuto(autoProcessing);
    // Upload cria PENDING; filtros antigos como READY/raiz ocultariam a nova mídia.
    setFolderFilter('all'); setStatusFilter(''); setTypedSearch(''); setServerSearch('');
    setView('media'); setPreferredMediaId('');
    setReload((value) => value + 1);
  };
  const [state, setState] = useState<{
    key: string; contextKey: string; folderFilter: DoohLibraryFolderFilter; folders: DoohLibraryFolder[]; media: DoohLibraryMedia[]; fetchedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // F12 5c: name search runs on the server (debounced), across all media of the company.
  const [serverSearch, setServerSearch] = useState('');
  useEffect(() => {
    const next = typedSearch.trim().slice(0, 120);
    const timer = window.setTimeout(() => setServerSearch(next), 400);
    return () => window.clearTimeout(timer);
  }, [typedSearch]);
  const requestKey = JSON.stringify([contextKey, folderFilter, serverSearch, reload]);

  useEffect(() => {
    setFolderFilter('all'); setStatusFilter(''); setTypedSearch(''); setServerSearch(''); setView('media'); setPreferredMediaId('');
    setRecentMediaId(''); setRecentChecks(0); setRecentAuto(false);
    setState(null); setError('');
  }, [contextKey]);

  useEffect(() => {
    setError('');
    if (!authorized || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const headersParams = {
      take: 100,
      ...(folderFilter === 'all' ? {} : { folderId: folderFilter }),
      ...(serverSearch ? { q: serverSearch } : {}),
    };
    void Promise.all([
      apiClient.get<unknown>('/dooh/folders', { signal: controller.signal }),
      apiClient.get<unknown>('/dooh/media', { params: headersParams, signal: controller.signal }),
    ]).then(([foldersResponse, mediaResponse]) => {
      if (controller.signal.aborted) return;
      const folders = parseDoohLibraryFolders(foldersResponse.data, companyId);
      const media = folders && parseDoohLibraryMedia(mediaResponse.data, companyId, folderFilter, folders);
      if (!folders || !media) {
        setError('Contrato da Biblioteca DOOH incompatível com a API. Nenhum dado foi exibido.');
        return;
      }
      setState({ key: requestKey, contextKey, folderFilter, folders, media, fetchedAt: new Date().toLocaleString('pt-BR') });
    }).catch((readError: unknown) => {
      if (!controller.signal.aborted) setError(doohLibraryReadError(readError));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorized, companyId, requestKey, folderFilter, serverSearch]);

  const visible = state?.contextKey === contextKey && state.folderFilter === folderFilter ? state : null;
  const recent = visible?.media.find((item) => item.id === recentMediaId);
  // UX08: bounded read-only refresh after upload; no automatic POST, no extra worker.
  useEffect(() => {
    if (!authorized || !recentAuto || !recentMediaId || recentChecks >= 60 ||
        recent?.status === 'READY' || recent?.status === 'ERROR') return;
    const timer = window.setTimeout(() => {
      setRecentChecks((value) => value + 1);
      setReload((value) => value + 1);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [authorized, recentAuto, recentMediaId, recent?.status, recentChecks]);

  // F11d: thumbnails of ready media (short-lived signed URLs, renewed before they expire).
  const readyIds = useMemo(() => (visible?.media ?? []).filter(item => item.status === 'READY').slice(0, DOOH_PREVIEW_BATCH).map(item => item.id), [visible]);
  const readyKey = readyIds.join(',');
  const [previews, setPreviews] = useState<Record<string, DoohMediaPreview>>({});
  const [previewRound, setPreviewRound] = useState(0);
  useEffect(() => {
    if (!authorized || !readyKey) { setPreviews({}); return; }
    const controller = new AbortController();
    const ids = readyKey.split(',');
    void apiClient.get<unknown>('/dooh/media/previews', { params: { ids: readyKey }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setPreviews(parseDoohMediaPreviews(data, ids) ?? {}); })
      .catch(() => { if (!controller.signal.aborted) setPreviews({}); });
    const renew = window.setTimeout(() => setPreviewRound(v => v + 1), 4 * 60 * 1000);
    return () => { controller.abort(); window.clearTimeout(renew); };
  }, [authorized, readyKey, previewRound]);

  const filtered = useMemo(() => (visible?.media ?? []).filter((item) =>
    (!statusFilter || item.status === statusFilter) &&
    (!typedSearch.trim() || item.name.toLocaleLowerCase('pt-BR').includes(typedSearch.trim().toLocaleLowerCase('pt-BR'))),
  ), [visible, statusFilter, typedSearch]);

  if (!authorized) return <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
    A Biblioteca exige acesso DOOH e função ADMINISTRATIVO ou TI. Nenhum dado foi solicitado.
  </div>;

  return <section aria-label="Minhas mídias DOOH" className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-gray-900">Minhas mídias</h2>
        <p className="text-sm text-gray-600">Envie imagens e vídeos e escolha a tela onde deseja exibir.</p>
        
      </div>
      <div className="flex flex-wrap gap-2">{accessMode === 'FULL' && <Button type="button" onClick={() => setView('upload')}>Adicionar mídia</Button>}<Button type="button" variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>Atualizar</Button></div>
    </div>
    <DoohWorkspaceTabs label="Ações de mídia" selected={view} onSelect={setView} tabs={[
      { id: 'media', label: 'Minhas mídias', description: 'Consulte os arquivos carregados nesta pasta.' },
      { id: 'upload', label: 'Adicionar mídia', description: 'Escolha arquivo, nome e pasta opcional. O envio não publica conteúdo.' },
      ...(!pilot.autoProcessingEnabled || view === 'processing' ? [{ id: 'processing' as const, label: 'Preparação e recuperação', description: 'Acompanhe o resultado ou recupere um arquivo quando autorizado.' }] : []),
      { id: 'organize', label: 'Organizar · mais opções', description: 'Pastas, renomeação, movimentação, versões e histórico.' },
    ]} />
    {view === 'media' && <div className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Pasta</span>
        <select aria-label="Pasta DOOH" className="w-full rounded-md border border-gray-300 p-2" value={folderFilter}
          onChange={(event) => { setFolderFilter(event.target.value); setStatusFilter(''); setTypedSearch(''); setServerSearch(''); }}>
          <option value="all">Todas as pastas — últimas mídias</option>
          <option value="root">Sem pasta (raiz)</option>
          {(visible?.folders ?? []).map((folder) => <option key={folder.id} value={folder.id}>
            {`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name} (${folder.mediaCount})`}
          </option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm"><span className="block">Situação</span>
        <select aria-label="Estado da mídia DOOH" className="w-full rounded-md border border-gray-300 p-2" value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as '' | DoohLibraryStatus)}>
          <option value="">Todos os estados</option>
          {Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm"><span className="block">Nome do arquivo</span>
        <input aria-label="Buscar nome de mídia DOOH" className="w-full rounded-md border border-gray-300 p-2"
          value={typedSearch} maxLength={120} placeholder="Buscar pelo nome em toda a biblioteca"
          onChange={(event) => setTypedSearch(event.target.value)} />
      </label>
    </div>}
    {view === 'media' && recent && <p role="status" className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
      {recent.status === 'READY' ? `“${recent.name}” está pronta para usar na programação.` :
        recent.status === 'ERROR' ? `Não foi possível preparar “${recent.name}”. Abra os detalhes para corrigir.` :
        !recentAuto ? `Arquivo “${recent.name}” recebido. Abra a preparação para disponibilizá-lo.` :
        recentChecks >= 60 ? 'A preparação ainda não foi concluída. Use Atualizar para consultar novamente.' :
        `Preparando “${recent.name}”. Você pode continuar navegando; atualizaremos esta lista automaticamente.`}
    </p>}
    {view === 'media' && <p className="text-xs text-gray-600">A busca procura o nome em todas as mídias da pasta escolhida e mostra até 100 resultados.</p>}
    {loading && <p role="status" className="text-sm text-gray-600">Carregando biblioteca…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {visible && <>
      {view === 'upload' && <DoohMediaUpload companyId={companyId!} folders={visible.folders} onChanged={onUploaded} />}
      {view === 'processing' && <DoohMediaProcessing companyId={companyId!} folders={visible.folders}
        media={visible.media} preferredMediaId={preferredMediaId} onChanged={() => setReload((value) => value + 1)} />}
      {view === 'organize' && <div className="space-y-4">
        <DoohFolderOperations companyId={companyId!} folders={visible.folders} onChanged={() => setReload((value) => value + 1)} />
        <DoohMediaOrganizeCas companyId={companyId!} folders={visible.folders} media={visible.media} onChanged={() => setReload((value) => value + 1)} />
        <DoohMediaVersionsReadOnly companyId={companyId!} media={visible.media} />
      </div>}
      {view === 'media' && <>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-600">
          <p>{filtered.length} de {visible.media.length} mídia(s) encontradas neste filtro · {visible.folders.length} pasta(s)</p>
          <p>Consultado em {visible.fetchedAt}</p>
        </div>
        {filtered.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Nenhuma mídia encontrada. Ajuste o filtro ou adicione um arquivo.</p> :
          <ul aria-label="Resultados de mídias DOOH" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => <li key={item.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <MediaThumbnail preview={previews[item.id]} kind={item.kind} name={doohMediaDisplayName(item.name, item.kind)} />
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-semibold text-gray-900">{doohMediaDisplayName(item.name, item.kind)}</p>
                <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-gray-700">{(item.id === recentMediaId && recentAuto) && item.status === 'PENDING' ? 'Na fila de preparação' : statusLabels[item.status]}</span>
              </div>
              <p className="text-sm text-gray-600">{item.kind === 'VIDEO' ? 'Vídeo' : 'Imagem'} · {displayDoohMediaSize(item.bytes)}</p>
              {item.status === 'PENDING' && <p className="text-sm text-gray-700">{(pilot.autoProcessingEnabled || (item.id === recentMediaId && recentAuto)) ? 'Arquivo recebido. Acompanhe a preparação.' : 'Arquivo enviado. Falta preparar para usar na programação.'}</p>}
              {item.status === 'PROCESSING' && <p className="text-sm text-gray-700">O arquivo está sendo preparado.</p>}
              {item.status === 'READY' && <p className="text-sm text-gray-700">Pronta para adicionar à programação de uma tela.</p>}
              {item.status === 'ERROR' && <p className="text-sm text-gray-700">O processamento não foi concluído. Consulte o histórico antes de tentar novamente.</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {item.status === 'READY' ? (accessMode === 'FULL' && <a href={guidedEnabled && ['IMAGE','VIDEO'].includes(item.kind)?`/app/dooh/screens?media=${encodeURIComponent(item.id)}`:'/app/dooh/scheduling?ux=listas'} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-indigo-600">{guidedEnabled && ['IMAGE','VIDEO'].includes(item.kind)?'Usar nesta tela':'Usar em lista'}</a>) :
                  <Button type="button" variant="outline" onClick={() => { setPreferredMediaId(item.id); setView('processing'); }}>
                    {item.status === 'PENDING' && !pilot.autoProcessingEnabled && !(item.id === recentMediaId && recentAuto) ? 'Preparar mídia' : item.status === 'ERROR' ? 'Ver motivo / tentar novamente' : 'Acompanhar situação'}
                  </Button>}
                <details className="text-xs text-gray-500"><summary className="cursor-pointer focus-visible:outline-indigo-600">Detalhes do arquivo</summary>
                  <p className="mt-1">{item.mimeType} · {item.versionCount} versão(ões)</p>
                  <p>{item.widthPx && item.heightPx ? `${item.widthPx} × ${item.heightPx} px` : 'Dimensões não informadas'} · {item.durationMs === null ? 'Duração não informada' : `${(item.durationMs / 1000).toLocaleString('pt-BR')} s`}</p>
                  <p>Enviado em {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                </details>
              </div>
            </li>)}
          </ul>}
        <p className="text-xs text-gray-500">Arquivo pronto não significa programação publicada ou exibição comprovada.</p>
      </>}
    </>}
  </section>;
}

function MediaThumbnail({ preview, kind, name }: { preview?: DoohMediaPreview; kind: string; name: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [preview?.url]);
  const label = kind === 'VIDEO' ? 'Vídeo' : kind === 'IMAGE' ? 'Imagem' : 'Arquivo';
  return <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-gray-200">
    {preview && !broken ? (preview.contentType === 'video/mp4'
      ? <video src={`${preview.url}#t=0.1`} muted playsInline preload="metadata" aria-label={`Prévia de ${name}`} className="h-full w-full object-contain" onError={() => setBroken(true)} />
      : <img src={preview.url} alt={`Prévia de ${name}`} loading="lazy" className="h-full w-full object-contain" onError={() => setBroken(true)} />)
      : <span className="text-xs font-medium text-gray-500">{label}</span>}
  </div>;
}
