import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlaylistDetail, type DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import { canEditPlaylistDraft, draftStillCurrent, parsePlaylistDraft, playlistDraftError,
  type PlaylistDraftSnapshot } from '../lib/doohPlaylistDraftEditorContract';
import { parsePlaylistPublished, playlistPublishError, publishCasPayload, publishReviewReady } from '../lib/doohPlaylistPublishContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void }
const qaUiEnabled = import.meta.env.MODE === 'qa' && import.meta.env.VITE_DOOH_PLAYLIST_PUBLISH_QA_ENABLED === 'true';

/** D15C-05: QA-only immutable version registration; does NOT schedule or distribute to players. */
export function DoohPlaylistPublishQa({ companyId, playlists, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const allowed = companyId === user?.companyId && canEditPlaylistDraft(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [playlistId, setPlaylistId] = useState('');
  const [draft, setDraft] = useState<PlaylistDraftSnapshot | null>(null);
  const [confirmation, setConfirmation] = useState('');
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
    write.current?.abort(); setPlaylistId(''); setDraft(null); setConfirmation(''); setError(''); setNotice(''); setBusy(false);
  }, [contextKey]);
  useEffect(() => {
    if (playlistId && !playlists.some((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null)) setPlaylistId('');
  }, [playlistId, playlists]);
  useEffect(() => {
    setDraft(null); setConfirmation(''); setNotice(''); setError('');
    if (!allowed || !playlistId) { setLoading(false); return; }
    const controller = new AbortController();
    const key = requestKey;
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || liveKey.current !== key) return;
        const next = parsePlaylistDraft(data, playlistId);
        if (!next) { setError('Rascunho incompatível com o contrato.'); return; }
        setDraft(next);
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && liveKey.current === key) setError(playlistDraftError(err));
      }).finally(() => {
        if (!controller.signal.aborted && liveKey.current === key) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, playlistId, requestKey]);

  if (!allowed) return <p className="text-xs text-gray-600">Prévia de publicação exige DOOH FULL e papel técnico.</p>;
  const selected = playlists.find((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null);
  const canPublish = qaUiEnabled && Boolean(selected && publishReviewReady(draft) && !busy && !loading && confirmation === 'PUBLICAR');

  async function publish() {
    if (!canPublish || !draft || !selected || !allowed) return;
    const before = draft;
    const payload = publishCasPayload(before);
    if (!payload) return;
    if (!window.confirm(`CONFIRMA A PUBLICAÇÃO QA da versão ${selected.currentVersion + 1} de "${selected.name}"?\n` +
      `${before.items.length} itens. Cria uma versão IMUTÁVEL no banco; NÃO distribui nem agenda conteúdos.`)) return;
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
          current.name !== selected.name) { setError('Playlist alterada. Atualize o catálogo e revise a publicação.'); return; }
      const { data } = await apiClient.post<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/publish-cas`, payload, { signal: controller.signal });
      if (!valid()) return;
      const receipt = parsePlaylistPublished(data, before, selected.currentVersion);
      if (!receipt) { setError('Resultado não confirmado. Consulte o histórico antes de repetir.'); return; }
      setNotice(`Versão ${receipt.publishedVersion} registrada no banco (${receipt.checksumPrefix}…). Não foi distribuída aos players.`);
      setConfirmation(''); setRefresh((n) => n + 1); onChanged();
    } catch (err: unknown) { if (valid()) setError(playlistPublishError(err)); }
    finally { if (write.current === controller) write.current = null; if (valid()) setBusy(false); }
  }

  return <section aria-label="Publicação QA de playlist D15C-05" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/30 p-4">
    <h4 className="font-semibold text-gray-900">Revisão e publicação controlada — D15C-05</h4>
    <p className="text-xs text-amber-900">Publicar cria uma versão imutável e outro rascunho no banco. NÃO configura agendamento, manifest, distribuição, reprodução ou Proof-of-Play.</p>
    <div className="flex flex-wrap gap-2 items-end">
      <label className="flex-1 min-w-[220px] space-y-1 text-sm"><span className="block">Playlist ativa com rascunho</span>
        <select aria-label="Playlist para revisão de publicação" className="w-full rounded-md border border-gray-300 bg-white p-2"
          value={playlistId} disabled={busy} onChange={(e) => { write.current?.abort(); setPlaylistId(e.target.value); }}>
          <option value="">Selecione a playlist</option>
          {playlists.filter((p) => p.status === 'ACTIVE' && p.draftVersion !== null).map((p) =>
            <option value={p.id} key={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!playlistId || busy || loading} onClick={() => setRefresh((n) => n + 1)}>Revisar novamente</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Buscando rascunho…</p>}
    {draft && <div className="space-y-2">
      <p className="text-sm text-gray-700">{draft.items.length} item(ns) · versão candidata {selected ? selected.currentVersion + 1 : '—'}.</p>
      {!publishReviewReady(draft) && <p className="text-sm text-amber-800">Rascunho vazio ou inválido para publicação.</p>}
      <ol className="max-h-64 overflow-auto space-y-1">{draft.items.map((item) =>
        <li className="rounded-md border bg-white p-2 text-xs" key={item.id}>
          #{item.position + 1} · Mídia {item.mediaVersionId.slice(0, 8)}… · {item.durationMs} ms
        </li>)}</ol>
    </div>}
    {qaUiEnabled && draft && <label className="block space-y-1 text-xs"><span>Digite PUBLICAR para aprovar o snapshot mostrado</span>
      <input className="w-full rounded-md border bg-white p-2" value={confirmation} disabled={busy || loading}
        onChange={(e) => setConfirmation(e.target.value)} placeholder="PUBLICAR" autoComplete="off" />
    </label>}
    <Button type="button" disabled={!canPublish} onClick={() => { void publish(); }}>{busy ? 'Registrando…' : 'Publicar versão (somente QA)'}</Button>
    {!qaUiEnabled && <p className="text-xs text-amber-800">Publicação desabilitada por padrão. Disponível apenas em build QA explicitamente configurado e empresa autorizada no backend.</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
