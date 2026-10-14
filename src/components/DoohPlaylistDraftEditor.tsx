import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohVersions, type DoohVersionSummary } from '../lib/doohMediaVersionsContract';
import type { DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import {
  canEditPlaylistDraft, draftCasPayload, draftStillCurrent, parseAddedDraftItem,
  parsePlaylistDraft, parsePlaylistMediaOptions, parseRemovedDraftItem, playlistDraftError,
  type PlaylistDraftSnapshot, type PlaylistMediaOption,
} from '../lib/doohPlaylistDraftEditorContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void }

/** D15C-03 — só altera itens do draft via CAS. Publicação, reorder e agendas fora do escopo. */
export function DoohPlaylistDraftEditor({ companyId, playlists, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const allowed = companyId === user?.companyId && canEditPlaylistDraft(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [playlistId, setPlaylistId] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [durationText, setDurationText] = useState('10000');
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
    setPlaylistId(''); setMediaId(''); setVersionId(''); setDraft(null); setMedia(null);
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
        if (!parsed) { setError('Rascunho incompatível com o contrato da API.'); return; }
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
        if (!parsed) { setError('Catálogo de mídia incompatível com a API.'); return; }
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
        if (!parsed) { setError('Versões de mídia incompatíveis com a API.'); return; }
        setVersions(parsed.versions.filter((v) => v.status === 'READY' && v.verification === 'READY_METADATA_OK'));
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(playlistDraftError(err)); });
    return () => controller.abort();
  }, [allowed, mediaId, media, refresh]);

  if (!allowed) return <p className="text-xs text-gray-600">Editor exige DOOH FULL e papel ADMINISTRATIVO ou TI.</p>;
  const selected = playlists.find((p) => p.id === playlistId);
  const durationMs = Number(durationText);
  const validDuration = /^\d+$/.test(durationText) && Number.isSafeInteger(durationMs) && durationMs > 0 && durationMs <= 86_400_000;
  const canAdd = Boolean(!busy && !loading && draft && selected?.status === 'ACTIVE' &&
    versions?.some((v) => v.id === versionId) && validDuration && draft.items.length < 200);

  async function mutate(operation: 'add' | 'remove', itemId?: string) {
    if (busy || !draft || !selected || selected.status !== 'ACTIVE' || !allowed) return;
    if (operation === 'add' && !canAdd) return;
    if (operation === 'remove' && (!itemId || !draft.items.some((item) => item.id === itemId))) return;
    const before = draft;
    const selectedVersion = versionId;
    if (!window.confirm(operation === 'add'
      ? `Adicionar a versão ${selectedVersion} ao rascunho de "${selected.name}" por ${durationMs} ms? Nenhuma publicação ocorrerá.`
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
  return <section aria-label="Editor de itens do rascunho D15C-03" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <h4 className="font-semibold text-gray-900">Itens do rascunho — D15C-03</h4>
    <p className="text-xs text-gray-600">Inclusão e remoção com comparação atômica da ordem completa do rascunho. Até 200 itens. Sem reordenar, publicar ou agendar.</p>
    <div className="flex gap-2 items-end">
      <label className="flex-1 space-y-1 text-sm"><span className="block">Playlist ativa com draft</span>
        <select aria-label="Playlist para editar itens" value={playlistId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(e) => { setPlaylistId(e.target.value); setError(''); setNotice(''); }}>
          <option value="">Selecione uma playlist</option>
          {playlists.filter((p) => p.status === 'ACTIVE' && p.draftVersion !== null).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!playlistId || busy || loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar rascunho</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Lendo rascunho…</p>}
    {draft && <>
      <p className="text-sm text-gray-700">{draft.items.length} item(ns) neste draft. Cada remoção exige confirmação.</p>
      {draft.items.length === 0 ? <p className="text-sm text-gray-600">Rascunho vazio.</p> :
        <ul className="space-y-1">{draft.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-2 text-xs">
          <span>#{item.position + 1} · mídia versão {item.mediaVersionId.slice(0, 8)}… · {item.durationMs} ms</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { void mutate('remove', item.id); }}>Remover</Button>
        </li>)}</ul>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm"><span className="block">Mídia</span>
          <select aria-label="Mídia para adicionar" value={mediaId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
            onChange={(e) => setMediaId(e.target.value)}><option value="">Selecione uma mídia</option>
            {(media ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span className="block">Versão READY com metadados válidos</span>
          <select aria-label="Versão READY para adicionar" value={versionId} disabled={busy || !versions} className="w-full rounded-md border border-gray-300 bg-white p-2"
            onChange={(e) => setVersionId(e.target.value)}><option value="">Selecione uma versão pronta</option>
            {(versions ?? []).map((v) => <option key={v.id} value={v.id}>Versão {v.version} · {v.id.slice(0, 8)}…</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span className="block">Duração (milissegundos)</span>
          <input aria-label="Duração da exibição em ms" type="number" min={1} max={86400000} step={1} value={durationText} disabled={busy}
            onChange={(e) => setDurationText(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2" />
        </label>
        <Button type="submit" disabled={!canAdd}>{busy ? 'Salvando…' : 'Adicionar ao rascunho'}</Button>
      </form>
    </>}
    <p className="text-xs text-amber-800">Metadados READY não comprovam a integridade dos bytes no S3, codecs compatíveis ou reprodução real. O backend revalida READY e asset antes da inclusão.</p>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
