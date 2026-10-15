import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { canReadDoohPlaylists, type DoohPlaylistDetail } from '../lib/doohPlaylistCatalogContract';
import { canInspectPublishedVersion, parseInspectedPublishedVersion, publishedInspectionError,
  type InspectedPublishedPlaylist } from '../lib/doohPublishedVersionInspectionContract';

interface Props { companyId: string; detail: DoohPlaylistDetail }
const timestamp = (value: string) => new Date(value).toLocaleString('pt-BR');
const duration = (value: number) => `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;

/** D15C-06: consulta exclusivamente GET de itens PUBLISHED; sem ações de publicação ou distribuição. */
export function DoohPublishedVersionInspector({ companyId, detail }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const mode = snapshot?.modules.DOOH.accessMode;
  const granted = snapshot?.modules.DOOH.granted;
  const allowed = user?.companyId === companyId && detail.id.length > 0 &&
    canReadDoohPlaylists(companyId, snapshot?.companyId, granted, mode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, detail.id,
    snapshot?.companyId, granted, mode, [...roles].sort()]);
  const versions = detail.versions.filter((entry) => entry.status === 'PUBLISHED');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; value: InspectedPublishedPlaylist } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = versions.find((entry) => String(entry.version) === selectedVersion);
  const referenceKey = JSON.stringify(selected ? [selected.id, selected.version, selected.checksumPrefix,
    selected.publishedAt, selected.itemCount] : []);
  const requestKey = JSON.stringify([contextKey, referenceKey, refresh]);
  const liveKey = useRef(requestKey);
  liveKey.current = requestKey;

  useEffect(() => { setSelectedVersion(''); setResult(null); setError(''); }, [contextKey]);
  useEffect(() => {
    setResult(null); setError('');
    if (!allowed || !selected || !canInspectPublishedVersion(selected)) { setBusy(false); return; }
    const controller = new AbortController();
    const key = requestKey;
    setBusy(true);
    void apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(detail.id)}/versions/${selected.version}/items`,
      { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || liveKey.current !== key) return;
        const parsed = parseInspectedPublishedVersion(data, detail.id, selected);
        if (!parsed) { setError('A composição publicada diverge do histórico ou contém dados inválidos. Revisão técnica necessária.'); return; }
        setResult({ key, value: parsed });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && liveKey.current === key) setError(publishedInspectionError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted && liveKey.current === key) setBusy(false);
      });
    return () => controller.abort();
  }, [allowed, detail.id, requestKey]);

  if (!allowed) return <p className="text-xs text-gray-600">Consulta de versões requer acesso DOOH e função técnica.</p>;
  const inspected = result?.key === requestKey ? result.value : null;
  return <section aria-label="D15C-06 inspeção de versões publicadas" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
    <h5 className="text-sm font-semibold text-gray-900">Verificação de versões publicadas — D15C-06</h5>
    <p className="text-xs text-amber-800">Verificação estrutural dos registros: NÃO comprova integridade criptográfica dos arquivos,
      disponibilidade no S3, distribuição, reprodução, audiência ou Proof-of-Play.</p>
    {detail.versionsTruncated && <p className="text-xs text-amber-800">O histórico exibido contém somente as 50 versões mais recentes; outras versões não estão disponíveis nesta consulta.</p>}
    {versions.length === 0 ? <p className="text-xs text-gray-600">Nenhuma versão PUBLISHED na janela retornada.</p> :
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[230px] flex-1 space-y-1 text-xs"><span className="block">Versão registrada</span>
          <select aria-label="Selecionar versão publicada para inspeção" className="w-full rounded-md border border-gray-300 bg-white p-2"
            value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}>
            <option value="">Selecione uma versão</option>
            {versions.map((entry) => <option key={entry.id} value={String(entry.version)}>
              Versão {entry.version} — {entry.itemCount} item(ns)
            </option>)}
          </select>
        </label>
        <Button type="button" variant="outline" disabled={!selected || busy} onClick={() => setRefresh((n) => n + 1)}>Conferir novamente</Button>
      </div>}
    {selected && !canInspectPublishedVersion(selected) && <p role="alert" className="text-xs text-red-800">Metadados históricos insuficientes para conferência. Não solicitar itens.</p>}
    {busy && <p role="status" className="text-xs text-gray-600">Consultando composição publicada…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    {inspected && <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-800">Versão {inspected.version} · {inspected.items.length} item(ns) · duração total {duration(inspected.totalDurationMs)}</p>
      <p className="text-xs text-gray-600">Registro publicado em {timestamp(inspected.publishedAt)} · SHA-256 registrado: {inspected.checksumPrefix}…</p>
      <p className="text-xs text-amber-800">Identidade da versão, prefixo do checksum, quantidade, posições e durações conferem com os metadados consultados. O SHA-256 completo não foi recalculado.</p>
      <div className="max-h-64 overflow-y-auto"><ol className="space-y-1">{inspected.items.map((item) =>
        <li key={item.id} className="rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700">
          Posição {item.position + 1} · versão de mídia {item.mediaVersionId.slice(0, 8)}… · {duration(item.durationMs)}
        </li>)}</ol></div>
    </div>}
  </section>;
}
