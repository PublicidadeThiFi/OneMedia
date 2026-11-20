import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { parseDoohPlaylistCatalog, parseDoohPlaylistDetail,
  type DoohPlaylistSummary, type DoohPlaylistVersionSummary } from '../lib/doohPlaylistCatalogContract';

/** UX04: verified tenant playlist names -> published version UUID, without changing the schedule DTO. */
export function DoohPublishedPlaylistPicker({ companyId, value, onChange, disabled }: {
  companyId: string; value: string; onChange: (versionId: string) => void; disabled: boolean;
}) {
  const [items, setItems] = useState<DoohPlaylistSummary[] | null>(null);
  const [playlistId, setPlaylistId] = useState('');
  const [versions, setVersions] = useState<DoohPlaylistVersionSummary[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const link = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
  const suggestedPlaylistId = link?.get('playlistId') ?? '';
  const suggestedVersionId = link?.get('versionId') ?? '';

  useEffect(() => {
    setItems(null); setPlaylistId(''); setVersions(null); setError('');
    const controller = new AbortController();
    void apiClient.get<unknown>('/dooh/playlists', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseDoohPlaylistCatalog(data, companyId);
        if (!parsed) { setError('Não foi possível validar a lista da sua empresa.'); return; }
        setItems(parsed);
        if (suggestedPlaylistId && parsed.some(item => item.id === suggestedPlaylistId && item.currentVersion > 0))
          setPlaylistId(suggestedPlaylistId);
      }).catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar as listas publicadas.'); });
    return () => controller.abort();
  }, [companyId, suggestedPlaylistId]);

  useEffect(() => {
    setVersions(null); setError('');
    if (!playlistId || !items?.some(item => item.id === playlistId && item.currentVersion > 0)) return;
    const controller = new AbortController(); setLoading(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(playlistId)}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseDoohPlaylistDetail(data, companyId, playlistId);
        if (!parsed) { setError('A lista foi alterada. Atualize antes de continuar.'); return; }
        const published = parsed.versions.filter(version => version.status === 'PUBLISHED');
        setVersions(published);
        if (suggestedVersionId && published.some(version => version.id === suggestedVersionId)) onChange(suggestedVersionId);
      }).catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar as versões da lista.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, playlistId, items, suggestedVersionId]);

  return <div className="space-y-2 rounded-xl border border-indigo-100 bg-white p-3" aria-label="Escolher lista publicada">
    <label className="block text-sm font-medium text-gray-800">Qual lista será exibida?
      <select className="mt-1 block w-full rounded-md border border-gray-300 p-2" value={playlistId} disabled={disabled || !items}
        onChange={e => { setPlaylistId(e.target.value); onChange(''); }}>
        <option value="">Escolha pelo nome</option>
        {(items ?? []).filter(item => item.currentVersion > 0).map(item => <option key={item.id} value={item.id}>{item.name} · versão publicada {item.currentVersion}</option>)}
      </select>
    </label>
    {!playlistId && value && <p className="text-xs text-gray-700">Esta agenda já possui uma versão associada. Se não quiser trocá-la, mantenha a seleção atual.</p>}
    {playlistId && <label className="block text-sm font-medium text-gray-800">Versão da lista
      <select aria-label="Versão publicada da playlist" className="mt-1 block w-full rounded-md border border-gray-300 p-2" value={versions?.some(v => v.id === value) ? value : ''}
        disabled={disabled || loading || !versions} onChange={e => onChange(e.target.value)}>
        <option value="">Selecione a versão publicada</option>
        {(versions ?? []).map(version => <option key={version.id} value={version.id}>Versão {version.version} · {version.itemCount} mídia(s)</option>)}
      </select>
    </label>}
    {loading && <p role="status" className="text-sm text-gray-600">Consultando versões…</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {items?.length === 100 && <p className="text-xs text-amber-800">Exibindo até 100 listas recentes. Uma lista antiga pode não aparecer.</p>}
    {items && !items.some(item => item.currentVersion > 0) && <p className="text-sm text-gray-600">Nenhuma lista publicada encontrada. Publique uma lista antes de criar a agenda.</p>}
    <p className="text-xs text-gray-500">O sistema preenche o identificador internamente. A API verifica novamente a versão ao salvar.</p>
  </div>;
}
