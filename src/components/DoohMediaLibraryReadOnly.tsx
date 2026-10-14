import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohFolderOperations } from './DoohFolderOperations';
import { DoohMediaOrganizeCas } from './DoohMediaOrganizeCas';
import { DoohMediaUpload } from './DoohMediaUpload';
import { DoohMediaProcessing } from './DoohMediaProcessing';
import { DoohMediaVersionsReadOnly } from './DoohMediaVersionsReadOnly';
import {
  displayDoohMediaSize,
  doohLibraryReadError,
  parseDoohLibraryFolders,
  parseDoohLibraryMedia,
  type DoohLibraryFolder,
  type DoohLibraryFolderFilter,
  type DoohLibraryMedia,
  type DoohLibraryStatus,
} from '../lib/doohMediaLibraryContract';

const statusLabels: Record<DoohLibraryStatus, string> = {
  PENDING: 'Pendente', PROCESSING: 'Processando', READY: 'Pronta', ERROR: 'Erro',
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
  const [folderFilter, setFolderFilter] = useState<DoohLibraryFolderFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'' | DoohLibraryStatus>('');
  const [typedSearch, setTypedSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{
    key: string; folders: DoohLibraryFolder[]; media: DoohLibraryMedia[]; fetchedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestKey = JSON.stringify([contextKey, folderFilter, reload]);

  useEffect(() => {
    setFolderFilter('all'); setStatusFilter(''); setTypedSearch('');
    setState(null); setError('');
  }, [contextKey]);

  useEffect(() => {
    setState(null); setError('');
    if (!authorized || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const headersParams = folderFilter === 'all' ? { take: 100 } : { take: 100, folderId: folderFilter };
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
      setState({ key: requestKey, folders, media, fetchedAt: new Date().toLocaleString('pt-BR') });
    }).catch((readError: unknown) => {
      if (!controller.signal.aborted) setError(doohLibraryReadError(readError));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorized, companyId, requestKey, folderFilter]);

  const visible = state?.key === requestKey ? state : null;
  const filtered = useMemo(() => (visible?.media ?? []).filter((item) =>
    (!statusFilter || item.status === statusFilter) &&
    (!typedSearch.trim() || item.name.toLocaleLowerCase('pt-BR').includes(typedSearch.trim().toLocaleLowerCase('pt-BR'))),
  ), [visible, statusFilter, typedSearch]);

  if (!authorized) return <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
    A Biblioteca exige acesso DOOH e função ADMINISTRATIVO ou TI. Nenhum dado foi solicitado.
  </div>;

  return <section aria-label="Biblioteca de mídias DOOH D15B-01" className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">Biblioteca de mídias — inventário operacional</h3>
        <p className="text-sm text-gray-600">Pastas e mídias consultadas na API da empresa autenticada. Consulta e organização de metadados, conforme permissões.</p>
        <p className="text-xs text-amber-800">READY significa processamento concluído, não publicação, reprodução física ou entrega certificada.</p>
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>Atualizar</Button>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Pasta (filtro na API)</span>
        <select aria-label="Pasta DOOH" className="w-full rounded-md border border-gray-300 p-2" value={folderFilter}
          onChange={(event) => { setFolderFilter(event.target.value); setStatusFilter(''); setTypedSearch(''); }}>
          <option value="all">Todas as pastas — últimas mídias</option>
          <option value="root">Sem pasta (raiz)</option>
          {(visible?.folders ?? []).map((folder) => <option key={folder.id} value={folder.id}>
            {`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name} (${folder.mediaCount})`}
          </option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm"><span className="block">Estado (filtro local)</span>
        <select aria-label="Estado da mídia DOOH" className="w-full rounded-md border border-gray-300 p-2" value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as '' | DoohLibraryStatus)}>
          <option value="">Todos os estados</option>
          {Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm"><span className="block">Nome (filtro local)</span>
        <input aria-label="Buscar nome de mídia DOOH" className="w-full rounded-md border border-gray-300 p-2"
          value={typedSearch} maxLength={160} placeholder="Buscar entre os resultados carregados"
          onChange={(event) => setTypedSearch(event.target.value)} />
      </label>
    </div>
    <p className="text-xs text-gray-600">A API retorna até 100 mídias recentes por filtro de pasta, sem total nem paginação. A busca por nome e estado abrange somente esses resultados, não a biblioteca completa.</p>
    {loading && <p role="status" className="text-sm text-gray-600">Carregando biblioteca…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {visible && <>
      <DoohFolderOperations companyId={companyId!} folders={visible.folders} onChanged={() => setReload((value) => value + 1)} />
      <DoohMediaUpload companyId={companyId!} folders={visible.folders} onChanged={() => setReload((value) => value + 1)} />
      <DoohMediaOrganizeCas companyId={companyId!} folders={visible.folders} media={visible.media} onChanged={() => setReload((value) => value + 1)} />
      <DoohMediaProcessing companyId={companyId!} folders={visible.folders} media={visible.media} onChanged={() => setReload((value) => value + 1)} />
      <DoohMediaVersionsReadOnly companyId={companyId!} media={visible.media} />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-600">
        <p>{visible.folders.length} pasta(s) cadastrada(s) · {filtered.length} de {visible.media.length} mídia(s) carregada(s) neste filtro</p>
        <p>Consultado em: {visible.fetchedAt}</p>
      </div>
      {filtered.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Nenhuma mídia encontrada neste conjunto de resultados.</p> :
        <ul aria-label="Resultados de mídias DOOH" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => <li key={item.id} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="break-words text-sm font-semibold text-gray-900">{item.name}</p>
              <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs text-gray-700">{statusLabels[item.status]}</span>
            </div>
            <p className="text-xs text-gray-600">{item.kind} · {displayDoohMediaSize(item.bytes)} · {item.mimeType}</p>
            <p className="text-xs text-gray-600">{item.widthPx && item.heightPx ? `${item.widthPx} × ${item.heightPx} px · ` : ''}
              {item.durationMs !== null ? `${(item.durationMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s · ` : ''}
              {item.versionCount} versão(ões)</p>
            <p className="text-xs text-gray-500">Criada em {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
          </li>)}
        </ul>}
    </>}
  </section>;
}
