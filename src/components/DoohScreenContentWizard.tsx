import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohMediaUpload } from './DoohMediaUpload';
import { parseDoohLibraryFolders, parseDoohLibraryMedia, type DoohLibraryFolder, type DoohLibraryMedia } from '../lib/doohMediaLibraryContract';
import { parseDoohVersions, type DoohVersionSummary } from '../lib/doohMediaVersionsContract';
import { doohUxMillisecondsFromSeconds } from '../lib/doohUxDuration';
import { draftCasPayload, draftStillCurrent, parseAddedDraftItem, parsePlaylistDraft, parseRemovedDraftItem } from '../lib/doohPlaylistDraftEditorContract';
import { draftOrderChanged, parseReorderConfirmation, reorderCasRequest, shiftDraftItem } from '../lib/doohPlaylistReorderContract';
import { guidedContentError, guidedSnapshotToCas, parseGuidedContentCapabilities, parseGuidedContentDraft,
  parseGuidedDraftCreation, type GuidedContentDraft } from '../lib/doohGuidedScreenContentContract';
import type { OperationalScreen } from '../lib/doohOperationalScreenContract';
import { DoohScreenPublicationWizard } from './DoohScreenPublicationWizard';

interface Props { screen: OperationalScreen; onClose: () => void }

/** UX10/F3A: friendly, tenant-scoped content draft editor. NEVER publishes schedules or manifests. */
export function DoohScreenContentWizard({ screen, onClose }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? '';
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted,
    snapshot?.modules.DOOH.accessMode, [...(user?.roles ?? [])].sort(), screen.id]);
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const inFlight = useRef<AbortController | null>(null);
  const writable = companyId.length > 0 && snapshot?.companyId === companyId && snapshot?.modules.DOOH.granted &&
    snapshot.modules.DOOH.accessMode === 'FULL' && (user?.roles ?? []).some(role => role === 'ADMINISTRATIVO' || role === 'TI');
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<GuidedContentDraft | null>(null);
  const [media, setMedia] = useState<DoohLibraryMedia[]>([]);
  const [folders, setFolders] = useState<DoohLibraryFolder[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editingBusy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const busy=editingBusy||publishing;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedMedia, setSelectedMedia] = useState('');
  const [versions, setVersions] = useState<DoohVersionSummary[]>([]);
  const [versionId, setVersionId] = useState('');
  const [duration, setDuration] = useState('10');
  const [plannedOrder, setPlannedOrder] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedId, setUploadedId] = useState('');
  const [checks, setChecks] = useState(0);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    inFlight.current?.abort(); setDraft(null); setMedia([]); setFolders([]); setEnabled(false); setLoaded(false);
    setSelectedMedia(''); setVersions([]); setVersionId(''); setDuration('10'); setPlannedOrder([]);
    setError(''); setNotice(''); setBusy(false); setUploadOpen(false); setUploadedId(''); setChecks(0);
  }, [contextKey]);

  useEffect(() => {
    if (!writable) { setLoaded(true); return; }
    const controller = new AbortController();
    const key = contextKey;
    setLoadingList(true); setError('');
    void Promise.all([
      apiClient.get<unknown>('/dooh/operational-screens/content-capabilities', { signal: controller.signal }),
      apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-draft`, { signal: controller.signal }),
      apiClient.get<unknown>('/dooh/folders', { signal: controller.signal }),
      apiClient.get<unknown>('/dooh/media', { params: { take: 100 }, signal: controller.signal }),
    ]).then(([caps, content, foldersResponse, mediaResponse]) => {
      if (controller.signal.aborted || contextRef.current !== key) return;
      const cap = parseGuidedContentCapabilities(caps.data);
      const nextDraft = parseGuidedContentDraft(content.data, screen.id);
      const nextFolders = parseDoohLibraryFolders(foldersResponse.data, companyId);
      const nextMedia = nextFolders && parseDoohLibraryMedia(mediaResponse.data, companyId, 'all', nextFolders);
      if (cap === null || !nextDraft || !nextFolders || !nextMedia) throw Error('Unexpected content contract');
      setEnabled(cap); setDraft(nextDraft); setFolders(nextFolders); setMedia(nextMedia);
      setPlannedOrder(nextDraft.items.map(item => item.id));
      setLoaded(true);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted || contextRef.current !== key) return;
      setLoaded(true); setEnabled(false);
      setError(guidedContentError(cause));
    }).finally(() => {
      if (!controller.signal.aborted && contextRef.current === key) setLoadingList(false);
    });
    return () => controller.abort();
  }, [writable, screen.id, companyId, contextKey, refresh]);

  useEffect(() => {
    setVersions([]); setVersionId('');
    if (!writable || !enabled || !selectedMedia || !media.some(m => m.id === selectedMedia && m.status === 'READY')) return;
    const controller = new AbortController();
    const key = contextKey;
    setLoadingVersions(true);
    void apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selectedMedia)}/versions`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || contextRef.current !== key) return;
        const parsed = parseDoohVersions(data, selectedMedia);
        if (!parsed) throw Error('Unexpected media version contract');
        const available = parsed.versions.filter(v => v.status === 'READY' && v.verification === 'READY_METADATA_OK');
        setVersions(available);
        setVersionId(available[0]?.id ?? '');
        const chosen = media.find(m => m.id === selectedMedia);
        if (chosen?.kind === 'VIDEO' && available[0]?.durationMs && available[0].durationMs > 0) {
          setDuration(String(available[0].durationMs / 1000));
        } else setDuration('10');
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted && contextRef.current === key) setError(guidedContentError(cause));
      }).finally(() => {
        if (!controller.signal.aborted && contextRef.current === key) setLoadingVersions(false);
      });
    return () => controller.abort();
  }, [writable, enabled, selectedMedia, contextKey, media]);

  const lastUploaded = media.find(m => m.id === uploadedId);
  useEffect(() => {
    if (!uploadedId || !lastUploaded || lastUploaded.status === 'READY' || lastUploaded.status === 'ERROR' || checks >= 60 || !enabled) return;
    const timer = window.setTimeout(() => { setChecks(n => n + 1); setRefresh(n => n + 1); }, 5000);
    return () => window.clearTimeout(timer);
  }, [uploadedId, lastUploaded?.status, checks, enabled]);

  const items = draft?.items ?? [];
  const seconds = doohUxMillisecondsFromSeconds(duration);
  const chosenVersion = versions.find(v => v.id === versionId);
  const readyMedia = media.filter(item => item.status === 'READY' && (item.kind === 'IMAGE' || item.kind === 'VIDEO'));
  const canAdd = Boolean(writable && enabled && !busy && !loadingList && !loadingVersions && chosenVersion && seconds && items.length < 200);

  async function mutate(kind: 'add' | 'remove', itemId?: string) {
    if (!writable || !enabled || busy || loadingList || !draft || (kind === 'add' && !canAdd)) return;
    const startKey = contextRef.current;
    const controller = new AbortController(); inFlight.current = controller;
    const valid = () => !controller.signal.aborted && contextRef.current === startKey;
    setBusy(true); setError(''); setNotice('');
    try {
      let currentDraft = draft;
      if (kind === 'add' && !currentDraft.playlistId) {
        const created = await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-draft`, {}, { signal: controller.signal });
        if (!valid()) return;
        const receipt = parseGuidedDraftCreation(created.data, screen.id);
        if (!receipt) throw Error('Unexpected draft creation');
        const read = await apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-draft`, { signal: controller.signal });
        if (!valid()) return;
        const verified = parseGuidedContentDraft(read.data, screen.id);
        if (!verified || verified.playlistId !== receipt.playlistId || verified.draftId !== receipt.draftId) {
          throw Error('Draft creation not yet reflected');
        }
        currentDraft = verified;
      }
      const original = guidedSnapshotToCas(currentDraft);
      if (!original) throw Error('No draft snapshot');
      if (kind === 'remove' && !original.items.some(it => it.id === itemId)) return;
      const freshResponse = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(original.playlistId)}/draft/items`, { signal: controller.signal });
      if (!valid()) return;
      const fresh = parsePlaylistDraft(freshResponse.data, original.playlistId);
      if (!fresh || !draftStillCurrent(original, fresh)) {
        setError('A lista mudou. Atualize a tela e confira os itens antes de salvar.'); return;
      }
      const base = `/dooh/playlists/${encodeURIComponent(original.playlistId)}/draft/items`;
      const response = kind === 'add'
        ? await apiClient.post<unknown>(`${base}/add-cas`, { ...draftCasPayload(original), mediaVersionId: versionId, durationMs: seconds }, { signal: controller.signal })
        : await apiClient.post<unknown>(`${base}/remove-cas/${encodeURIComponent(itemId!)}`, draftCasPayload(original), { signal: controller.signal });
      if (!valid()) return;
      const ok = kind === 'add' ? parseAddedDraftItem(response.data, original, versionId, seconds!)
        : parseRemovedDraftItem(response.data, original, itemId!);
      if (!ok) throw Error('Unexpected update receipt');
      setNotice(kind === 'add' ? 'Mídia adicionada à sequência. Ela ainda não foi publicada.' : 'Mídia removida da sequência em edição.');
      setRefresh(n => n + 1);
    } catch (cause: unknown) { if (valid()) setError(guidedContentError(cause)); }
    finally { if (inFlight.current === controller) inFlight.current = null; if (valid()) setBusy(false); }
  }

  function shift(id: string, direction: -1 | 1) {
    const snapshot = draft && guidedSnapshotToCas(draft);
    if (!snapshot || busy) return;
    setPlannedOrder(current => shiftDraftItem(snapshot, current, id, direction) ?? current);
  }
  async function saveOrder() {
    const before = draft && guidedSnapshotToCas(draft);
    if (!before || !enabled || !writable || busy || !draftOrderChanged(before, plannedOrder)) return;
    const body = reorderCasRequest(before, plannedOrder);
    if (!body) return;
    const controller = new AbortController(); inFlight.current = controller;
    const startKey = contextRef.current;
    const valid = () => !controller.signal.aborted && contextRef.current === startKey;
    setBusy(true); setError(''); setNotice('');
    try {
      const pre = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(before.playlistId)}/draft/items`, { signal: controller.signal });
      if (!valid()) return;
      const fresh = parsePlaylistDraft(pre.data, before.playlistId);
      if (!fresh || !draftStillCurrent(before, fresh)) {
        setError('A sequência mudou. Atualize e reorganize novamente.'); return;
      }
      const response = await apiClient.put<unknown>(`/dooh/playlists/${encodeURIComponent(before.playlistId)}/draft/items/order-cas`, body, { signal: controller.signal });
      if (!valid()) return;
      if (!parseReorderConfirmation(response.data, before, plannedOrder)) throw Error('Unexpected reorder receipt');
      setNotice('Nova ordem salva. A publicação ainda não foi realizada.');
      setRefresh(n => n + 1);
    } catch (cause: unknown) { if (valid()) setError(guidedContentError(cause)); }
    finally { if (inFlight.current === controller) inFlight.current = null; if (valid()) setBusy(false); }
  }

  return <section aria-label={`Conteúdo de ${screen.name}`} className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="font-semibold text-gray-900">Conteúdo de {screen.name}</h4><p className="text-xs text-gray-600">Escolha os arquivos e organize a sequência. Nada começa a tocar ao salvar.</p></div>
      <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Fechar</Button>
    </div>
    {!writable && <p className="text-sm text-amber-800">Sua conta permite consultar esta tela, mas não editar o conteúdo.</p>}
    {loadingList && <p role="status" className="text-sm text-gray-600">Buscando arquivos e sequência…</p>}
    {loaded && !enabled && <p className="text-sm text-amber-800">A preparação guiada ficará disponível quando a atualização do servidor for ativada para esta empresa.</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {enabled && loaded && writable && <>
      <div className="flex flex-wrap gap-2"><Button variant="outline" type="button" disabled={busy || loadingList} onClick={() => setRefresh(n => n + 1)}>Atualizar arquivos</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setUploadOpen(value => !value)}>{uploadOpen ? 'Ocultar envio' : 'Enviar nova mídia'}</Button></div>
      {uploadOpen && <DoohMediaUpload companyId={companyId} folders={folders} onChanged={(mediaId) => { setUploadedId(mediaId); setChecks(0); setUploadOpen(false); setRefresh(n => n + 1); }} />}
      {uploadedId && <p className="text-sm text-gray-700">{lastUploaded?.status === 'READY' ? 'Seu arquivo está pronto. Selecione-o abaixo.' : lastUploaded?.status === 'ERROR' ? 'O arquivo precisa ser corrigido antes de usá-lo.' : 'Arquivo recebido. Aguarde a preparação; a lista será atualizada automaticamente.'}</p>}
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h5 className="font-semibold">1. Escolha a mídia</h5>
        <label className="block space-y-1 text-sm"><span>Imagem ou vídeo pronto</span><select aria-label="Mídia para a tela" className="w-full rounded-md border p-2" value={selectedMedia} disabled={busy} onChange={e => { setSelectedMedia(e.target.value); setError(''); }}><option value="">Selecione um arquivo</option>{readyMedia.map(m => <option key={m.id} value={m.id}>{m.name} · {m.kind === 'VIDEO' ? 'Vídeo' : 'Imagem'}</option>)}</select></label>
        {selectedMedia && <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm"><span>Versão preparada</span><select className="w-full rounded-md border p-2" aria-label="Versão de mídia preparada" value={versionId} disabled={busy || loadingVersions} onChange={e => { setVersionId(e.target.value); const found = versions.find(v => v.id === e.target.value); setDuration(found?.durationMs && found.durationMs > 0 ? String(found.durationMs / 1000) : '10'); }}><option value="">{loadingVersions ? 'Buscando versões…' : 'Selecione a versão'}</option>{versions.map(v => <option key={v.id} value={v.id}>Versão {v.version}</option>)}</select></label><label className="block space-y-1 text-sm"><span>Tempo na tela (segundos)</span><input className="w-full rounded-md border p-2" aria-label="Tempo da mídia em segundos" inputMode="decimal" value={duration} disabled={busy} onChange={e => setDuration(e.target.value)} /></label></div>}
        <Button type="button" disabled={!canAdd} onClick={() => void mutate('add')}>{busy ? 'Salvando…' : 'Adicionar à sequência'}</Button>
        {readyMedia.length === 0 && <p className="text-sm text-gray-600">Ainda não há arquivos prontos. Use “Enviar nova mídia” acima e aguarde a preparação.</p>}
      </div>
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h5 className="font-semibold">2. Organize o que será exibido</h5>
        {items.length === 0 ? <p className="text-sm text-gray-600">Sua sequência está vazia. Você pode deixar a tela cadastrada sem conteúdo.</p> : <ol className="space-y-2">{plannedOrder.map((id, index) => {
          const item = items.find(v => v.id === id);
          if (!item) return null;
          return <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div className="min-w-0"><strong className="break-words">{index + 1}. {item.mediaName}</strong><p className="text-xs text-gray-600">{(item.durationMs / 1000).toLocaleString('pt-BR')} segundos {item.mediaStatus !== 'READY' ? '· arquivo indisponível para publicação' : ''}</p></div><div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="outline" disabled={busy || index === 0} onClick={() => shift(id, -1)}>Subir</Button><Button type="button" size="sm" variant="outline" disabled={busy || index === items.length - 1} onClick={() => shift(id, 1)}>Descer</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Remover “${item.mediaName}” da sequência em edição?`)) void mutate('remove', item.id); }}>Remover</Button></div></li>;
        })}</ol>}
        {draft && (() => { const snapshot = guidedSnapshotToCas(draft); return snapshot && draftOrderChanged(snapshot, plannedOrder) ? <Button type="button" disabled={busy} onClick={() => void saveOrder()}>Salvar nova ordem</Button> : null; })()}
        <p className="text-xs text-gray-600">O rascunho é salvo na empresa e permanece ligado a esta tela. Não modifica listas já publicadas.</p>
      </div>
      <DoohScreenPublicationWizard screen={screen} draft={draft} editorBlocked={editingBusy||loadingList||Boolean(draft&&draft.playlistId&&draft.draftId&&draftOrderChanged(guidedSnapshotToCas(draft)!,plannedOrder))} onPublishingChange={setPublishing} onChanged={() => setRefresh(n => n + 1)} />
    </>}
  </section>;
}
