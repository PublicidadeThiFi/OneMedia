import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import { canEditPlaylistDraft, draftStillCurrent, parsePlaylistDraft, playlistDraftError,
  type PlaylistDraftSnapshot } from '../lib/doohPlaylistDraftEditorContract';
import { draftOrder, draftOrderChanged, parseReorderConfirmation, reorderCasRequest,
  shiftDraftItem, validDraftOrder } from '../lib/doohPlaylistReorderContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void }

/** D15C-04 — ordena somente o DRAFT com CAS atômico. Nunca publica nem agenda. */
export function DoohPlaylistDraftReorder({ companyId, playlists, onChanged }: Props) {
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
  const [planned, setPlanned] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const key = JSON.stringify([contextKey, playlistId, refresh]);
  const currentKey = useRef(key);
  const writeRef = useRef<AbortController | null>(null);
  currentKey.current = key;

  useEffect(() => {
    writeRef.current?.abort();
    setPlaylistId(''); setDraft(null); setPlanned([]); setError(''); setNotice(''); setBusy(false);
  }, [contextKey]);
  useEffect(() => {
    if (playlistId && !playlists.some((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null)) {
      setPlaylistId('');
    }
  }, [playlistId, playlists]);
  useEffect(() => {
    setDraft(null); setPlanned([]); setError(''); setNotice('');
    if (!allowed || !playlistId) { setLoading(false); return; }
    const controller = new AbortController();
    const requestKey = key;
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || currentKey.current !== requestKey) return;
        const result = parsePlaylistDraft(data, playlistId);
        if (!result) { setError('Rascunho incompatível com o contrato da API.'); return; }
        setDraft(result); setPlanned(draftOrder(result));
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && currentKey.current === requestKey) setError(playlistDraftError(err));
      }).finally(() => {
        if (!controller.signal.aborted && currentKey.current === requestKey) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, key, playlistId]);

  if (!allowed) return <p className="text-xs text-gray-600">Ordenação exige DOOH FULL e papel ADMINISTRATIVO ou TI.</p>;
  const selected = playlists.find((p) => p.id === playlistId && p.status === 'ACTIVE' && p.draftVersion !== null);
  const canSave = Boolean(!loading && !busy && selected && draft && draftOrderChanged(draft, planned));

  function shift(id: string, direction: -1 | 1) {
    if (!draft || loading || busy) return;
    setPlanned((current) => shiftDraftItem(draft, current, id, direction) ?? current);
    setError(''); setNotice('');
  }

  async function saveOrder() {
    if (!canSave || !draft || !selected || !allowed) return;
    const before = draft;
    const desired = [...planned];
    const payload = reorderCasRequest(before, desired);
    if (!payload || !validDraftOrder(before, desired)) return;
    const summary = desired.slice(0, 12).map((id, index) => `${index + 1}. ${id.slice(0, 8)}`).join('\n') +
      (desired.length > 12 ? `\n… e mais ${desired.length - 12} item(ns), em sequência.` : '');
    if (!window.confirm(`Salvar a nova ordem do rascunho de "${selected.name}"?\n${summary}\nNenhuma publicação ou programação ocorrerá.`)) return;
    const controller = new AbortController();
    writeRef.current = controller;
    const requestKey = currentKey.current;
    const isCurrent = () => !controller.signal.aborted && currentKey.current === requestKey;
    setBusy(true); setError(''); setNotice('');
    try {
      const preflight = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items`, { signal: controller.signal });
      if (!isCurrent()) return;
      const fresh = parsePlaylistDraft(preflight.data, playlistId);
      if (!fresh || !draftStillCurrent(before, fresh)) {
        setError('Rascunho alterado desde a leitura. Atualize e revise a ordem antes de salvar.'); return;
      }
      const { data } = await apiClient.put<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}/draft/items/order-cas`, payload, { signal: controller.signal });
      if (!isCurrent()) return;
      if (!parseReorderConfirmation(data, before, desired)) {
        setError('Não foi possível confirmar a gravação. Consulte o rascunho antes de repetir.'); return;
      }
      setNotice('Ordem do rascunho atualizada. Nenhuma publicação foi realizada.');
      setRefresh((n) => n + 1);
      onChanged();
    } catch (err: unknown) {
      if (isCurrent()) setError(playlistDraftError(err));
    } finally {
      if (writeRef.current === controller) writeRef.current = null;
      if (isCurrent()) setBusy(false);
    }
  }

  return <section aria-label="Ordenação de itens de playlist D15C-04" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <h4 className="font-semibold text-gray-900">Ordenação de itens — D15C-04</h4>
    <p className="text-xs text-gray-600">Use Subir/Descer para reorganizar até 200 itens. A ordem só será gravada após revisão e confirmação. Somente rascunhos podem ser alterados.</p>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[220px] flex-1 space-y-1 text-sm"><span className="block">Playlist ativa com rascunho</span>
        <select aria-label="Playlist para ordenar" className="w-full rounded-md border border-gray-300 bg-white p-2" value={playlistId} disabled={busy}
          onChange={(e) => { writeRef.current?.abort(); setPlaylistId(e.target.value); }}>
          <option value="">Selecione uma playlist</option>
          {playlists.filter((p) => p.status === 'ACTIVE' && p.draftVersion !== null).map((p) =>
            <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!playlistId || busy || loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando ordem atual…</p>}
    {draft && <>
      <p className="text-xs text-gray-700">{draft.items.length} item(ns). Alterações locais não são salvas automaticamente.</p>
      {draft.items.length < 2 ? <p className="text-xs text-gray-600">É necessário ter pelo menos dois itens para reordenar.</p> :
        <ol className="space-y-1">{planned.map((id, index) => {
          const item = draft.items.find((row) => row.id === id);
          return <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-2 text-xs">
            <span>#{index + 1} · versão {item?.mediaVersionId.slice(0, 8)}… · {item?.durationMs} ms</span>
            <span className="flex gap-1">
              <Button type="button" variant="outline" size="sm" disabled={busy || loading || index === 0} aria-label={`Subir item ${index + 1}`} onClick={() => shift(id, -1)}>Subir</Button>
              <Button type="button" variant="outline" size="sm" disabled={busy || loading || index === planned.length - 1} aria-label={`Descer item ${index + 1}`} onClick={() => shift(id, 1)}>Descer</Button>
            </span>
          </li>;
        })}</ol>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!canSave} onClick={() => { void saveOrder(); }}>{busy ? 'Salvando…' : 'Revisar e salvar ordem'}</Button>
        <Button type="button" variant="outline" disabled={busy || loading || !draftOrderChanged(draft, planned)} onClick={() => setPlanned(draftOrder(draft))}>Descartar mudanças locais</Button>
      </div>
    </>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-xs text-green-800">{notice}</p>}
    <p className="text-xs text-amber-800">Ordenar não publica playlist, não atualiza manifests e não altera a programação do Marketplace.</p>
  </section>;
}
