import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { useDoohPlaylistPublishCapabilities } from '../lib/useDoohPlaylistPublishCapabilities';
import { parseDoohPlaylistDetail, type DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import { canEditPlaylistDraft, draftStillCurrent, parsePlaylistDraft, playlistDraftError,
  type PlaylistDraftSnapshot } from '../lib/doohPlaylistDraftEditorContract';
import { parsePlaylistPublished, playlistPublishError, publishCasPayload, publishReviewReady } from '../lib/doohPlaylistPublishContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void; initialPlaylistId?: string }
// Existing QA UI restriction remains; the server capability is authoritative for every write.
const qaUiEnabled = import.meta.env.MODE === 'qa' && import.meta.env.VITE_DOOH_PLAYLIST_PUBLISH_QA_ENABLED === 'true';

/** D15C-05: QA-only immutable version registration; does NOT schedule or distribute to players. */
export function DoohPlaylistPublishQa({ companyId, playlists, onChanged, initialPlaylistId }: Props) {
  const { ask, confirmUi } = useInlineConfirm();
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const allowed = companyId === user?.companyId && canEditPlaylistDraft(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const backendPublishEnabled = useDoohPlaylistPublishCapabilities(companyId, contextKey, allowed);
  const publishUiEnabled = backendPublishEnabled && (import.meta.env.MODE !== 'qa' || qaUiEnabled);
  const [playlistId, setPlaylistId] = useState(initialPlaylistId ?? '');
  const [draft, setDraft] = useState<PlaylistDraftSnapshot | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestKey = JSON.stringify([contextKey, playlistId, refresh]);
  const liveKey = useRef(requestKey);
  const write = useRef<AbortController | null>(null);
  liveKey.current = requestKey;

  useEffect(() => {
    write.current?.abort(); setPlaylistId(initialPlaylistId ?? ''); setDraft(null); setError(''); setNotice(''); setBusy(false);
  }, [contextKey]);
  useEffect(() => {
    if (playlistId && !playlists.some((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null)) setPlaylistId('');
  }, [playlistId, playlists]);
  useEffect(() => {
    setDraft(null); setNotice(''); setError('');
    if (!allowed || !playlistId) { setLoading(false); return; }
    const controller = new AbortController();
    const key = requestKey;
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || liveKey.current !== key) return;
        const next = parsePlaylistDraft(data, playlistId);
        if (!next) { setError('Não foi possível conferir a sequência. Atualize e tente de novo.'); return; }
        setDraft(next);
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && liveKey.current === key) setError(playlistDraftError(err));
      }).finally(() => {
        if (!controller.signal.aborted && liveKey.current === key) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, playlistId, requestKey]);

  if (!allowed) return <p className="text-xs text-gray-600">Só administradores com acesso completo podem publicar.</p>;
  const selected = playlists.find((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null);
  const canPublish = publishUiEnabled && Boolean(selected && publishReviewReady(draft) && !busy && !loading);

  async function publish() {
    if (!canPublish || !draft || !selected || !allowed) return;
    const before = draft;
    const payload = publishCasPayload(before);
    if (!payload) return;
    // F13: a summary box replaces typing "PUBLICAR"; the server still checks the exact draft before publishing.
    if (!await ask(`Publicar "${selected.name}" (versão ${selected.currentVersion + 1})?\n` +
      `${before.items.length} mídia(s). A versão fica guardada e ainda não vai para as TVs; isso é feito em "Horários e telas".`, 'Publicar sequência')) return;
    const controller = new AbortController();
    write.current = controller;
    const key = liveKey.current;
    const valid = () => !controller.signal.aborted && liveKey.current === key;
    setBusy(true); setError(''); setNotice('');
    try {
      const latest = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal });
      if (!valid()) return;
      const fresh = parsePlaylistDraft(latest.data, playlistId);
      if (!fresh || !draftStillCurrent(before, fresh)) {
        setError('O rascunho foi modificado. Atualize e revise todos os itens.'); return;
      }
      const latestPlaylist = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}`, { signal: controller.signal });
      if (!valid()) return;
      // Verify live summary without exposing raw API fields to the UI.
      const current = parseDoohPlaylistDetail(latestPlaylist.data, companyId, playlistId);
      if (!current || current.currentVersion !== selected.currentVersion || current.status !== 'ACTIVE' ||
          current.name !== selected.name) { setError('A sequência mudou. Atualize e confira de novo.'); return; }
      const { data } = await apiClient.post<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/publish-cas`, payload, { signal: controller.signal });
      if (!valid()) return;
      const receipt = parsePlaylistPublished(data, before, selected.currentVersion);
      if (!receipt) { setError('Resultado não confirmado. Consulte o histórico antes de repetir.'); return; }
      setNotice(`Versão ${receipt.publishedVersion} publicada. Ela ainda não foi enviada às TVs.`);
      setRefresh((n) => n + 1); onChanged();
    } catch (err: unknown) { if (valid()) setError(playlistPublishError(err)); }
    finally { if (write.current === controller) write.current = null; if (valid()) setBusy(false); }
  }

  return <section aria-label="Revisar e publicar sequência" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/30 p-4">
    <h4 className="font-semibold text-gray-900">Publicar a sequência</h4>
    <p className="text-xs text-amber-900">Publicar guarda esta versão da sequência. Ela ainda não vai para as TVs.</p>
    <div className="flex flex-wrap gap-2 items-end">
      <label className="flex-1 min-w-[220px] space-y-1 text-sm"><span className="block">Sequência</span>
        <select aria-label="Sequência" className="w-full rounded-md border border-gray-300 bg-white p-2"
          value={playlistId} disabled={busy} onChange={(e) => { write.current?.abort(); setPlaylistId(e.target.value); }}>
          <option value="">Escolha a sequência</option>
          {playlists.filter((p) => p.status === 'ACTIVE' && p.draftVersion !== null).map((p) =>
            <option value={p.id} key={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!playlistId || busy || loading} onClick={() => setRefresh((n) => n + 1)}>Revisar novamente</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Buscando rascunho…</p>}
    {draft && <div className="space-y-2">
      <p className="text-sm text-gray-700">{draft.items.length} item(ns) · versão candidata {selected ? selected.currentVersion + 1 : '—'}.</p>
      {!publishReviewReady(draft) && <p className="text-sm text-amber-800">Adicione mídias prontas à sequência antes de publicar.</p>}
      <ol className="max-h-64 overflow-auto space-y-1">{draft.items.map((item) =>
        <li className="rounded-md border bg-white p-2 text-xs" key={item.id}>
          {item.position + 1}. Mídia · {(item.durationMs / 1000).toLocaleString('pt-BR')} s
        </li>)}</ol>
    </div>}
    <Button type="button" disabled={!canPublish} onClick={() => { void publish(); }}>{busy ? 'Publicando…' : 'Publicar sequência'}</Button>
    {!publishUiEnabled && <p className="text-xs text-amber-800">A publicação não está liberada para a sua empresa.</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {confirmUi}
  </section>;
}
