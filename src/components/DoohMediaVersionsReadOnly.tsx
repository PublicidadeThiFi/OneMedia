import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohLibraryMedia } from '../lib/doohMediaLibraryContract';
import {
  canReadDoohMediaVersions, parseDoohVersions, doohVersionsError,
  type DoohVersionInventory,
} from '../lib/doohMediaVersionsContract';

const statusLabels = { PENDING: 'Pendente', PROCESSING: 'Processando', READY: 'Pronta', ERROR: 'Erro' } as const;
interface Props { companyId: string; media: readonly DoohLibraryMedia[]; }

/** D15B-06 — leitura exclusiva, sem geração de links ou acesso ao binário. */
export function DoohMediaVersionsReadOnly({ companyId, media }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const allowed = user?.companyId === companyId && canReadDoohMediaVersions(companyId,
    snapshot?.companyId, access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [selectedId, setSelectedId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [response, setResponse] = useState<{ key: string; value: DoohVersionInventory } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify([contextKey, selectedId, refresh]);
  const latestKey = useRef(key);
  latestKey.current = key;

  useEffect(() => { setSelectedId(''); setResponse(null); setError(''); }, [contextKey]);
  useEffect(() => {
    if (selectedId && !media.some((item) => item.id === selectedId)) setSelectedId('');
  }, [selectedId, media]);
  useEffect(() => {
    setResponse(null); setError('');
    if (!allowed || !selectedId || !media.some((item) => item.id === selectedId)) {
      setLoading(false); return;
    }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selectedId)}/versions`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || latestKey.current !== key) return;
        const parsed = parseDoohVersions(data, selectedId);
        if (!parsed) { setError('Versões incompatíveis com o contrato da API.'); return; }
        setResponse({ key, value: parsed });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && latestKey.current === key) setError(doohVersionsError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted && latestKey.current === key) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, selectedId, key, media]);

  if (!allowed) return <p className="text-xs text-gray-600">Consulta de versões disponível para funções técnicas com permissão DOOH.</p>;
  const inventory = response?.key === key ? response.value : null;
  const selected = media.find((item) => item.id === selectedId);
  return <section aria-label="Versões processadas DOOH D15B-06" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Versões e validação técnica — D15B-06</h4>
      <p className="text-xs text-gray-600">Consulta das últimas 50 versões registradas. A verificação de metadados não atesta integridade real no S3, compatibilidade de codecs, publicação, reprodução ou proof-of-play.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-60 flex-1 space-y-1 text-sm"><span className="block">Mídia</span>
        <select aria-label="Mídia para consulta de versões DOOH" value={selectedId} disabled={loading}
          onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2">
          <option value="">Selecione uma mídia carregada</option>
          {media.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.versionCount} versão(ões)</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!selectedId || loading}
        onClick={() => setRefresh((number) => number + 1)}>Atualizar versões</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando versões…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {inventory && <>
      <p className="text-xs text-gray-600">{inventory.versions.length} versão(ões) retornada(s) de {inventory.total} registrada(s) para {selected?.name ?? 'a mídia selecionada'}.
        {inventory.limited ? ' Resultado parcial: máximo de 50 versões recentes.' : ''}</p>
      {inventory.versions.length === 0 ? <p className="text-sm text-gray-600">Ainda não existem versões registradas para esta mídia.</p> :
        <ul aria-label="Inventário de versões DOOH" className="space-y-2">
          {inventory.versions.map((version) => <li key={version.id} className="space-y-1 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700">
            <div className="flex flex-wrap justify-between gap-2"><strong>Versão {version.version} · {statusLabels[version.status]}</strong>
              <span>{new Date(version.createdAt).toLocaleString('pt-BR')}</span></div>
            <p>{version.verification === 'READY_METADATA_OK' ? 'Metadados de versão pronta presentes (verificação estrutural).' :
              version.verification === 'REVIEW_REQUIRED' ? 'Atenção: versão READY sem checksum ou asset disponível válido.' :
              'Versão não concluída. Não presumir conteúdo pronto.'}</p>
            <p>{version.widthPx !== null && version.heightPx !== null ? `${version.widthPx} × ${version.heightPx} px · ` : ''}
              {version.durationMs !== null ? `${(version.durationMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s · ` : ''}
              {version.processedAsset ? `${version.processedAsset.mimeType} · ${version.processedAsset.available ? 'asset registrado' : 'asset indisponível'}` : 'sem asset processado'}</p>
            {version.checksum && <p>SHA-256 registrado: <code>{version.checksum.slice(0, 12)}…</code> (não verificado contra bytes)</p>}
          </li>)}
        </ul>}
    </>}
  </section>;
}
