import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { doohUxMillisecondsFromSeconds } from '../lib/doohUxDuration';
import { parseDoohVersions, type DoohVersionSummary } from '../lib/doohMediaVersionsContract';
import type { DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import {
  canEditPlaylistDraft, draftCasPayload, draftStillCurrent, parseAddedDraftItem,
  parsePlaylistDraft, parsePlaylistMediaOptions, parseRemovedDraftItem, playlistDraftError,
  type PlaylistDraftSnapshot, type PlaylistMediaOption,
} from '../lib/doohPlaylistDraftEditorContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void; initialPlaylistId?: string }

/** D15C-03 — só altera itens do draft via CAS. Publicação, reorder e agendas fora do escopo. */
export function DoohPlaylistDraftEditor({ companyId, playlists, onChanged, initialPlaylistId }: Props) {
  const { ask, confirmUi } = useInlineConfirm();
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const allowed = companyId === user?.companyId && canEditPlaylistDraft(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [playlistId, setPlaylistId] = useState(initialPlaylistId ?? '');
  const [mediaId, setMediaId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [durationText, setDurationText] = useState('10');
  const [draft, setDraft] = useState<PlaylistDraftSnapshot | null>(null);
  const [media, setMedia] = useState<PlaylistMediaOption[] | null>(null);
  const [versions, setVersions] = useState<DoohVersionSummary[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const currentKey = useRef('');
  const writeControl = useRef<AbortController | null>(null);
  const key = JSON.stringify([contextKey, playlistId, mediaId, refresh]);
  currentKey.current = key;

  useEffect(() => {
    writeControl.current?.abort();
    setPlaylistId(initialPlaylistId ?? ''); setMediaId(''); setVersionId(''); setDraft(null); setMedia(null);
    setVersions(null); setBusy(false); setError(''); setNotice('');
  }, [contextKey]);
  useEffect(() => {
    if (playlistId && !playlists.some((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null)) setPlaylistId('');
  }, [playlistId, playlists]);
  useEffect(() => {
    setDraft(null); setError('');
    if (!allowed || !playlistId) { setLoading(false); return; }
    const controller = new AbortController();
    const requestKey = key;
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || currentKey.current !== requestKey) return;
        const parsed = parsePlaylistDraft(data, playlistId);
        if (!parsed) { setError('Não foi possível carregar a sequência. Tente de novo em instantes.'); return; }
        setDraft(parsed);
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && currentKey.current === requestKey) setError(playlistDraftError(err));
      }).finally(() => { if (!controller.signal.aborted && currentKey.current === requestKey) setLoading(false); });
    return () => controller.abort();
  }, [allowed, playlistId, key]);
  useEffect(() => {
    setMedia(null);
    if (!allowed) return;
    const controller = new AbortController();
    void apiClient.get<unknown>('/dooh/media?take=100', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parsePlaylistMediaOptions(data, companyId);
        if (!parsed) { setError('Não foi possível carregar as mídias. Tente de novo em instantes.'); return; }
        setMedia(parsed);
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(playlistDraftError(err)); });
    return () => controller.abort();
  }, [allowed, companyId, contextKey, refresh]);
  useEffect(() => {
    setVersions(null); setVersionId('');
    if (!allowed || !mediaId || !media?.some((m) => m.id === mediaId)) return;
    const controller = new AbortController();
    void apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(mediaId)}/versions`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseDoohVersions(data, mediaId);
        if (!parsed) { setError('Não foi possível carregar as versões da mídia. Tente de novo em instantes.'); return; }
        setVersions(parsed.versions.filter((v) => v.status === 'READY' && v.verification === 'READY_METADATA_OK'));
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(playlistDraftError(err)); });
    return () => controller.abort();
  }, [allowed, mediaId, media, refresh]);

  if (!allowed) return <p className="text-xs text-gray-600">Editor exige DOOH FULL e papel ADMINISTRATIVO ou TI.</p>;
  const selected = playlists.find((p) => p.id === playlistId);
  const durationMs = doohUxMillisecondsFromSeconds(durationText) ?? 0;
  const validDuration = durationMs > 0;
  const canAdd = Boolean(!busy && !loading && draft && selected?.status === 'ACTIVE' &&
    versions?.some((v) => v.id === versionId) && validDuration && draft.items.length < 200);

  async function mutate(operation: 'add' | 'remove', itemId?: string) {
    if (busy || !draft || !selected || selected.status !== 'ACTIVE' || !allowed) return;
    if (operation === 'add' && !canAdd) return;
    if (operation === 'remove' && (!itemId || !draft.items.some((item) => item.id === itemId))) return;
    const before = draft;
    const selectedVersion = versionId;
    if (!await ask(operation === 'add'
      ? `Adicionar a versão ${selectedVersion} ao rascunho de "${selected.name}" por ${Number(durationText).toLocaleString('pt-BR')} segundo(s)? Nenhuma publicação ocorrerá.`
      : `Remover o item ${itemId} do rascunho de "${selected.name}"? Versões publicadas não serão modificadas.`)) return;
    const controller = new AbortController();
    writeControl.current = controller;
    const originalKey = currentKey.current;
    setBusy(true); setError(''); setNotice('');
    const stillCurrent = () => !controller.signal.aborted && originalKey === currentKey.current;
    try {
      const preflight = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal });
      if (!stillCurrent()) return;
      const fresh = parsePlaylistDraft(preflight.data, playlistId);
      if (!fresh || !draftStillCurrent(before, fresh)) {
        setError('O rascunho mudou desde a leitura. Atualize e revise os itens antes de continuar.'); return;
      }
      const base = `/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`;
      const payload = draftCasPayload(before);
      const { data } = operation === 'add'
        ? await apiClient.post<unknown>(`${base}/add-cas`, { ...payload, mediaVersionId: selectedVersion, durationMs }, { signal: controller.signal })
        : await apiClient.post<unknown>(`${base}/remove-cas/${encodeURIComponent(itemId!)}`, payload, { signal: controller.signal });
      if (!stillCurrent()) return;
      const ok = operation === 'add' ? parseAddedDraftItem(data, before, selectedVersion, durationMs)
        : parseRemovedDraftItem(data, before, itemId!);
      if (!ok) { setError('Resposta de mutação não confirmada. Consulte o rascunho antes de repetir.'); return; }
      setNotice(operation === 'add' ? 'Item incluído no rascunho, sem publicação.' : 'Item removido do rascunho, sem publicação.');
      setRefresh((n) => n + 1);
      onChanged();
    } catch (reason: unknown) { if (stillCurrent()) setError(playlistDraftError(reason)); }
    finally {
      if (writeControl.current === controller) writeControl.current = null;
      if (stillCurrent()) setBusy(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void mutate('add'); }
  return <section aria-label="Adicionar mídias à sequência" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <h4 className="font-semibold text-gray-900">Mídias desta lista</h4>
    <p className="text-xs text-gray-600">Selecione uma lista em edição, escolha a mídia pelo nome e defina por quantos segundos ela aparece.</p>
    <div className="flex gap-2 items-end">
      <label className="flex-1 space-y-1 text-sm"><span className="block">Lista em edição</span>
        <select aria-label="Sequência" value={playlistId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(e) => { setPlaylistId(e.target.value); setError(''); setNotice(''); }}>
          <option value="">Selecione uma sequência</option>
          {playlists.filter((p) => p.status === 'ACTIVE' && p.draftVersion !== null).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!playlistId || busy || loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar rascunho</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Lendo rascunho…</p>}
    {draft && <>
      <p className="text-sm text-gray-700">{draft.items.length} mídia(s) nesta lista. Remover uma mídia exige confirmação.</p>
      {draft.items.length === 0 ? <p className="text-sm text-gray-600">Esta lista ainda não tem mídias. Adicione uma abaixo.</p> :
        <ul className="space-y-1">{draft.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-2 text-xs">
          <span>#{item.position + 1} · {(item.durationMs / 1000).toLocaleString('pt-BR')} s · mídia pronta</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { void mutate('remove', item.id); }}>Remover</Button>
        </li>)}</ul>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm"><span className="block">Mídia</span>
          <select aria-label="Mídia para adicionar" value={mediaId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
            onChange={(e) => setMediaId(e.target.value)}><option value="">Selecione uma mídia</option>
            {(media ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span className="block">Versão pronta da mídia</span>
          <select aria-label="Versão READY para adicionar" value={versionId} disabled={busy || !versions} className="w-full rounded-md border border-gray-300 bg-white p-2"
            onChange={(e) => setVersionId(e.target.value)}><option value="">Selecione uma versão pronta</option>
            {(versions ?? []).map((v) => <option key={v.id} value={v.id}>Versão {v.version} · {v.id.slice(0, 8)}…</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span className="block">Tempo na tela (segundos)</span>
          <input aria-label="Duração da exibição em segundos" type="number" min={0.001} max={86400} step={0.001} value={durationText} disabled={busy}
            onChange={(e) => setDurationText(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2" />
        </label>
        <Button type="submit" disabled={!canAdd}>{busy ? 'Salvando…' : 'Adicionar à lista'}</Button>
      </form>
    </>}
    <p className="text-xs text-amber-800">Somente arquivos com uma versão pronta e validada podem ser adicionados. Isso não publica nem inicia exibição.</p>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {confirmUi}
  </section>;
}
