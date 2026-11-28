import { doohMediaDisplayName } from '../lib/doohMediaDisplayName';
import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { contentNextStep } from '../lib/doohJourneyGuidance';
import { Button } from './ui/button';
import { DoohMediaUpload } from './DoohMediaUpload';
import { DOOH_PREVIEW_BATCH, parseDoohLibraryFolders, parseDoohLibraryMedia, parseDoohMediaPreviews, type DoohLibraryFolder, type DoohLibraryMedia, type DoohMediaPreview } from '../lib/doohMediaLibraryContract';
import { MediaThumbnail } from './DoohMediaLibraryReadOnly';
import { screenStatusBadge } from '../lib/doohScreenDiagnosticContract';
import { parseDoohVersions, type DoohVersionSummary } from '../lib/doohMediaVersionsContract';
import { doohUxMillisecondsFromSeconds } from '../lib/doohUxDuration';
import { draftCasPayload, draftStillCurrent, parseAddedDraftItem, parsePlaylistDraft, parseRemovedDraftItem } from '../lib/doohPlaylistDraftEditorContract';
import { draftOrderChanged, parseReorderConfirmation, reorderCasRequest, shiftDraftItem } from '../lib/doohPlaylistReorderContract';
import { guidedContentError, guidedSnapshotToCas, parseGuidedContentCapabilities, parseGuidedContentDraft,
  parseGuidedDraftCreation, type GuidedContentDraft } from '../lib/doohGuidedScreenContentContract';
import type { OperationalScreen } from '../lib/doohOperationalScreenContract';
import { DoohScreenPublicationWizard } from './DoohScreenPublicationWizard';

interface Props { screen: OperationalScreen; onClose: () => void; initialMediaId?: string }
const DURATION_SHORTCUTS = ['5', '10', '15', '30'];
const BADGE_CLASS = { ok: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200', warn: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200', error: 'bg-red-50 text-red-800 ring-1 ring-red-200', info: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200', muted: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' } as const;

/** UX10/F3A: friendly, tenant-scoped content draft editor. NEVER publishes schedules or manifests. */
export function DoohScreenContentWizard({ screen, onClose, initialMediaId }: Props) {
  const { ask, confirmUi } = useInlineConfirm();
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
  // F17: "not enabled for this company" only when the server says so; a failed load is a retryable error.
  const [denied, setDenied] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const autoRetried = useRef(false);
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
  const [autoProcessing, setAutoProcessing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); return () => inFlight.current?.abort(); }, []);
  const autoSelectedUpload = useRef('');
  const initialSelectionDone = useRef(false);
  const draggedItem = useRef<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    inFlight.current?.abort(); setDraft(null); setMedia([]); setFolders([]); setEnabled(false); setDenied(false); setLoadFailed(false); autoRetried.current = false; setLoaded(false);
    setSelectedMedia(''); setVersions([]); setVersionId(''); setDuration('10'); setPlannedOrder([]);
    setError(''); setNotice(''); setBusy(false); setUploadOpen(false); setUploadedId(''); setAutoProcessing(false); autoSelectedUpload.current = ''; initialSelectionDone.current = false; setChecks(0);
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
    ]).then(async ([caps, content, foldersResponse, mediaResponse]) => {
      if (controller.signal.aborted || contextRef.current !== key) return;
      const cap = parseGuidedContentCapabilities(caps.data);
      const nextDraft = parseGuidedContentDraft(content.data, screen.id);
      const nextFolders = parseDoohLibraryFolders(foldersResponse.data, companyId);
      const nextMedia = nextFolders && parseDoohLibraryMedia(mediaResponse.data, companyId, 'all', nextFolders);
      if (cap === null || !nextDraft || !nextFolders || !nextMedia) throw Error('Unexpected content contract');
      const specificId = uploadedId || initialMediaId;
      if (specificId && !nextMedia.some(item => item.id === specificId)) {
        const response = await apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(specificId)}`, {signal: controller.signal}).catch(() => null);
        if (controller.signal.aborted || contextRef.current !== key) return;
        const specific = response && parseDoohLibraryMedia([response.data], companyId, 'all', nextFolders);
        if (specific?.[0]?.id === specificId) nextMedia.push(specific[0]);
      }
      setEnabled(cap); setDenied(!cap); setLoadFailed(false); autoRetried.current = false; setDraft(nextDraft); setFolders(nextFolders); setMedia(nextMedia);
      if (!initialSelectionDone.current && initialMediaId) { initialSelectionDone.current = true; if (nextMedia.some(item => item.id === initialMediaId && item.status === 'READY' && ['IMAGE','VIDEO'].includes(item.kind))) setSelectedMedia(initialMediaId); else setError('A mídia selecionada não está disponível entre os arquivos prontos desta empresa. Escolha outro arquivo.'); }
      setPlannedOrder(nextDraft.items.map(item => item.id));
      setLoaded(true);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted || contextRef.current !== key) return;
      setLoaded(true); setEnabled(false); setLoadFailed(true);
      setError(guidedContentError(cause));
      // One quiet automatic retry for a transient failure (e.g. right after adding a media).
      if (!autoRetried.current) { autoRetried.current = true; window.setTimeout(() => { if (contextRef.current === key) setRefresh(n => n + 1); }, 3000); }
    }).finally(() => {
      if (!controller.signal.aborted && contextRef.current === key) setLoadingList(false);
    });
    return () => controller.abort();
  }, [writable, screen.id, companyId, contextKey, refresh, initialMediaId, uploadedId]);

  const selectedKind = media.find(m => m.id === selectedMedia)?.kind;
  const selectedReady = media.some(m => m.id === selectedMedia && m.status === 'READY');
  useEffect(() => {
    setVersions([]); setVersionId(''); setLoadingVersions(false);
    if (!writable || !enabled || !selectedMedia || !selectedReady) return;
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
        if (selectedKind === 'VIDEO' && available[0]?.durationMs && available[0].durationMs > 0) {
          setDuration(String(available[0].durationMs / 1000));
        } else setDuration('10');
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted && contextRef.current === key) setError(guidedContentError(cause));
      }).finally(() => {
        if (!controller.signal.aborted && contextRef.current === key) setLoadingVersions(false);
      });
    return () => controller.abort();
  }, [writable, enabled, selectedMedia, contextKey, selectedKind, selectedReady]);

  const currentSnapshot = draft && guidedSnapshotToCas(draft);
  const orderDirty = Boolean(currentSnapshot && draftOrderChanged(currentSnapshot, plannedOrder));
  const lastUploaded = media.find(m => m.id === uploadedId);
  useEffect(() => {
    if (!autoProcessing || orderDirty || busy || loadingList || uploadOpen || !uploadedId || lastUploaded?.status === 'READY' || lastUploaded?.status === 'ERROR' || checks >= 60 || !enabled) return;
    const timer = window.setTimeout(() => { setChecks(n => n + 1); setRefresh(n => n + 1); }, 5000);
    return () => window.clearTimeout(timer);
  }, [uploadedId, lastUploaded?.status, checks, enabled, orderDirty, busy, loadingList, autoProcessing, uploadOpen]);

  useEffect(() => {
    if (lastUploaded?.status !== 'READY' || autoSelectedUpload.current === uploadedId) return;
    autoSelectedUpload.current = uploadedId;
    if (!selectedMedia) setSelectedMedia(uploadedId);
  }, [uploadedId, lastUploaded?.status, selectedMedia]);
  const items = draft?.items ?? [];
  const seconds = doohUxMillisecondsFromSeconds(duration.replace(',', '.'));
  const chosenVersion = versions.find(v => v.id === versionId);
  const readyMedia = media.filter(item => item.status === 'READY' && (item.kind === 'IMAGE' || item.kind === 'VIDEO'));
  // F13: pick media by thumbnail, same short-lived preview links as the library.
  const readyKey = readyMedia.slice(0, DOOH_PREVIEW_BATCH).map(m => m.id).join(',');
  const [previews, setPreviews] = useState<Record<string, DoohMediaPreview>>({});
  useEffect(() => {
    if (!writable || !readyKey) { setPreviews({}); return; }
    const controller = new AbortController();
    void apiClient.get<unknown>('/dooh/media/previews', { params: { ids: readyKey }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setPreviews(parseDoohMediaPreviews(data, readyKey.split(',')) ?? {}); })
      .catch(() => { if (!controller.signal.aborted) setPreviews({}); });
    return () => controller.abort();
  }, [writable, readyKey]);
  const canAdd = Boolean(writable && enabled && !busy && !orderDirty && !uploadOpen && !loadingList && selectedReady && !loadingVersions && chosenVersion && seconds && items.length < 200);

  const guidance = contentNextStep({uploadOpen, uploadedStatus: lastUploaded?.status, trackingUpload: Boolean(autoProcessing && uploadedId && checks < 60), readyCount: readyMedia.length, itemCount: items.length, unavailableItems: items.some(i=>i.mediaStatus!=='READY'), orderDirty, selectedMedia: Boolean(selectedMedia), canAdd, busy: busy || loadingList});

  async function mutate(kind: 'add' | 'remove', itemId?: string) {
    if (!writable || !enabled || busy || orderDirty || uploadOpen || loadingList || !draft || (kind === 'add' && !canAdd)) return;
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
      if (kind === 'add') { setSelectedMedia(''); setVersions([]); setVersionId(''); }
      setNotice(kind === 'add' ? 'Mídia adicionada à sequência. Ela ainda não foi publicada.' : 'Mídia removida da sequência em edição.');
      setRefresh(n => n + 1);
    } catch (cause: unknown) { if (valid()) setError(guidedContentError(cause)); }
    finally { if (inFlight.current === controller) inFlight.current = null; if (valid()) setBusy(false); }
  }

  function shift(id: string, direction: -1 | 1) {
    const snapshot = draft && guidedSnapshotToCas(draft);
    if (!snapshot || busy || loadingList || uploadOpen) return;
    setPlannedOrder(current => shiftDraftItem(snapshot, current, id, direction) ?? current);
  }
  async function saveOrder() {
    const before = draft && guidedSnapshotToCas(draft);
    if (!before || !enabled || !writable || busy || loadingList || uploadOpen || !draftOrderChanged(before, plannedOrder)) return;
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
      <div><div className="flex flex-wrap items-center gap-2"><h4 ref={heading} tabIndex={-1} className="font-semibold text-gray-900">Conteúdo de {screen.name}</h4>{(() => { const badge = screenStatusBadge(screen); return <span data-tone={badge.tone} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[badge.tone]}`}>{badge.label}</span>; })()}</div><p className="text-xs text-gray-600">Escolha os arquivos e organize a sequência. Nada começa a tocar antes de publicar.</p></div>
      <Button variant="outline" type="button" onClick={() => void (async () => { if (!orderDirty || await ask('Descartar a ordem ainda não salva?', 'Descartar')) onClose(); })()} disabled={busy || uploadOpen}>Fechar</Button>
    </div>
    {!writable && <p className="text-sm text-amber-800">Sua conta permite consultar esta tela, mas não editar o conteúdo.</p>}
    {loadingList && <p role="status" className="text-sm text-gray-600">Buscando arquivos e sequência…</p>}
    {loaded && denied && <p className="text-sm text-amber-800">A preparação guiada ficará disponível quando a atualização do servidor for ativada para esta empresa.</p>}
    {loaded && !enabled && !denied && loadFailed && writable && <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700"><span>Não conseguimos carregar o conteúdo desta tela agora.</span><Button type="button" size="sm" variant="outline" disabled={loadingList} onClick={() => setRefresh(n => n + 1)}>Tentar de novo</Button></div>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {enabled && loaded && writable && <>
      {(() => { const step = orderDirty ? 2 : guidance.action === 'publish' ? 3 : items.length > 0 && !selectedMedia && !uploadOpen ? 2 : 1; return <ol aria-label="Passos" className="flex flex-wrap gap-2 text-sm">
        {['Mídias', 'Ordem', 'Quando exibir'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={`flex items-center gap-2 rounded-full px-3 py-1 ${step === i + 1 ? 'bg-indigo-600 text-white' : step > i + 1 ? 'bg-indigo-100 text-indigo-900' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}><span className="font-semibold">{i + 1}</span>{label}</li>)}
      </ol>; })()}
      <p role="status" className="rounded-lg bg-indigo-100 p-3 text-sm text-indigo-950"><strong>Próximo passo:</strong> {guidance.text}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" type="button" disabled={busy || loadingList || orderDirty || uploadOpen} onClick={() => setRefresh(n => n + 1)}>Atualizar arquivos</Button><Button type="button" variant={guidance.action === 'upload' && !uploadOpen ? 'default' : 'outline'} disabled={busy || orderDirty || loadingList} onClick={() => setUploadOpen(value => !value)}>{uploadOpen ? 'Ocultar envio' : 'Enviar nova mídia'}</Button></div>
      {uploadOpen && <DoohMediaUpload companyId={companyId} folders={folders} onChanged={(mediaId, auto) => { setUploadedId(mediaId); setAutoProcessing(auto); setChecks(0); setUploadOpen(false); setRefresh(n => n + 1); }} />}
      {uploadedId && <p className="text-sm text-gray-700">{lastUploaded?.status === 'READY' ? 'Seu arquivo está pronto para adicionar à sequência.' : lastUploaded?.status === 'ERROR' ? 'O arquivo precisa ser corrigido antes de usá-lo.' : !autoProcessing ? 'Arquivo recebido. Abra a Biblioteca para iniciar a preparação manual, se ainda necessária.' : checks >= 60 ? 'O preparo ainda não foi confirmado. Use Atualizar arquivos para consultar novamente.' : 'Arquivo recebido. Aguarde a preparação; a lista será atualizada automaticamente.'}</p>}
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h5 className="font-semibold">1. Escolha a mídia</h5>
        {readyMedia.length > 0 && <div role="radiogroup" aria-label="Mídia para a tela" className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
          {readyMedia.map(m => { const chosen = selectedMedia === m.id; const label = doohMediaDisplayName(m.name, m.kind); return <button key={m.id} type="button" role="radio" aria-checked={chosen} disabled={busy} onClick={() => { setSelectedMedia(chosen ? '' : m.id); setVersions([]); setVersionId(''); setError(''); }}
            className={`space-y-1 rounded-xl border bg-white p-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${chosen ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300'}`}>
            <MediaThumbnail preview={previews[m.id]} kind={m.kind} name={label} />
            <span className="block truncate font-medium text-gray-900" title={label}>{label}</span>
            <span className="block text-xs text-gray-500">{m.kind === 'VIDEO' ? 'Vídeo' : 'Imagem'}</span>
          </button>; })}
        </div>}
        {selectedMedia && <div className="grid gap-3 sm:grid-cols-2">
          {versions.length > 1 && <label className="block space-y-1 text-sm"><span>Versão do arquivo</span><select className="w-full rounded-md border p-2" aria-label="Versão de mídia preparada" value={versionId} disabled={busy || loadingVersions} onChange={e => { setVersionId(e.target.value); const found = versions.find(v => v.id === e.target.value); setDuration(found?.durationMs && found.durationMs > 0 ? String(found.durationMs / 1000) : '10'); }}>{versions.map((v, i) => <option key={v.id} value={v.id}>Versão {v.version}{i === 0 ? ' (mais recente)' : ''}</option>)}</select></label>}
          <div className="space-y-1 text-sm"><span className="block">Tempo na tela (segundos)</span>
            <div className="flex flex-wrap items-center gap-2">
              {selectedKind !== 'VIDEO' && DURATION_SHORTCUTS.map(v => <Button key={v} type="button" size="sm" variant={duration === v ? 'default' : 'outline'} aria-pressed={duration === v} disabled={busy} onClick={() => setDuration(v)}>{v} s</Button>)}
              <input className="w-24 rounded-md border p-2" aria-label="Tempo da mídia em segundos" aria-invalid={seconds === null} aria-describedby={seconds === null ? "ux12-duration-help" : undefined} inputMode="decimal" value={duration} disabled={busy} onChange={e => setDuration(e.target.value)} />
            </div>
            {selectedKind === 'VIDEO' && <p className="text-xs text-gray-500">Para vídeo, usamos a duração do próprio arquivo.</p>}
          </div>
        </div>}
        {selectedMedia && !seconds && <p id="ux12-duration-help" className="text-xs text-red-700">Informe um tempo em segundos, por exemplo 10 ou 7,5.</p>}
        <Button type="button" variant={guidance.action === 'add' ? 'default' : 'outline'} disabled={!canAdd} onClick={() => void mutate('add')}>{busy ? 'Salvando…' : 'Adicionar à sequência'}</Button>
        {readyMedia.length === 0 && <p className="text-sm text-gray-600">Ainda não há arquivos prontos. Use “Enviar nova mídia” acima e aguarde a preparação.</p>}
      </div>
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h5 className="font-semibold">2. Ordem de exibição</h5>
        {items.length === 0 ? <p className="text-sm text-gray-600">Sua sequência está vazia. Você pode deixar a tela cadastrada sem conteúdo.</p> : <ol className="space-y-2">{plannedOrder.map((id, index) => {
          const item = items.find(v => v.id === id);
          if (!item) return null;
          return <li key={item.id} draggable={!busy && !loadingList && !uploadOpen} onDragStart={event => { draggedItem.current=id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id); }} onDragEnd={() => {draggedItem.current=null;}} onDragOver={event => {if(draggedItem.current && !busy && !loadingList && !uploadOpen)event.preventDefault();}} onDrop={event => {event.preventDefault();const from=draggedItem.current;draggedItem.current=null;if(!from || busy || loadingList || uploadOpen)return;setPlannedOrder(old=>{const i=old.indexOf(from), j=old.indexOf(id);if(i<0||j<0||i===j)return old;const next=[...old];next.splice(i,1);next.splice(j,0,from);return next;});}} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div className="min-w-0"><strong className="break-words"><span aria-hidden="true" className="mr-2 cursor-grab text-gray-400">⋮⋮</span>{index + 1}. {doohMediaDisplayName(item.mediaName)}</strong><p className="text-xs text-gray-600">{(item.durationMs / 1000).toLocaleString('pt-BR')} s {item.mediaStatus !== 'READY' ? '· arquivo indisponível para publicação' : ''}</p></div><div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="outline" aria-label={`Subir ${doohMediaDisplayName(item.mediaName)}`} title="Subir" disabled={busy || loadingList || uploadOpen || index === 0} onClick={() => shift(id, -1)}>↑</Button><Button type="button" size="sm" variant="outline" aria-label={`Descer ${doohMediaDisplayName(item.mediaName)}`} title="Descer" disabled={busy || loadingList || uploadOpen || index === items.length - 1} onClick={() => shift(id, 1)}>↓</Button><Button type="button" size="sm" variant="outline" disabled={busy || orderDirty || uploadOpen || loadingList} onClick={() => void (async () => { if (await ask(`Remover “${doohMediaDisplayName(item.mediaName)}” da sequência em edição?`, 'Remover')) void mutate('remove', item.id); })()}>Remover</Button></div></li>;
        })}</ol>}
        {draft && (() => { const snapshot = guidedSnapshotToCas(draft); return snapshot && draftOrderChanged(snapshot, plannedOrder) ? <Button type="button" disabled={busy || loadingList || uploadOpen} onClick={() => void saveOrder()}>Salvar ordem</Button> : null; })()}
        {orderDirty && <Button type="button" variant="outline" disabled={busy || loadingList} onClick={() => void (async () => { if (await ask('Descartar a ordem ainda não salva?', 'Descartar')) { setPlannedOrder(items.map(item => item.id)); setRefresh(n => n + 1); } })()}>Descartar alteração de ordem</Button>}
        <p className="text-xs text-gray-600">Arraste para mudar a ordem. O que está na tela só muda depois de publicar.</p>
      </div>
      <DoohScreenPublicationWizard screen={screen} draft={draft} editorBlocked={editingBusy||loadingList||orderDirty||uploadOpen} recommendPublication={guidance.action === 'publish'} onPublishingChange={setPublishing} onChanged={() => setRefresh(n => n + 1)} />
    </>}
    {confirmUi}
  </section>;
}
