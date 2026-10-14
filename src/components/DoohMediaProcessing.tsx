import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohLibraryMedia, DoohLibraryFolder } from '../lib/doohMediaLibraryContract';
import { parseDoohMediaCasSnapshot } from '../lib/doohMediaOrganizeCasContract';
import {
  canReadDoohProcessing, canRequestDoohProcessing, parseDoohProcessingHistory,
  canEnqueueDoohProcessing, confirmDoohProcessingEnqueued, doohProcessingError,
  type DoohProcessingJob,
} from '../lib/doohMediaProcessingContract';

const processingQaUiEnabled = import.meta.env.VITE_DOOH_MEDIA_PROCESSING_QA_UI_ENABLED === 'true';
const statusLabels = { QUEUED: 'Na fila', RUNNING: 'Em execução', COMPLETED: 'Concluído', FAILED: 'Falhou' } as const;
interface Props { companyId: string; media: readonly DoohLibraryMedia[]; folders: readonly DoohLibraryFolder[]; onChanged: () => void; }

/** D15B-05: histórico GET e fila POST opcional, desabilitada por padrão.
 * Nenhum worker é iniciado, nenhuma mídia é publicada e não existe retry automático.
 */
export function DoohMediaProcessing({ companyId, media, folders, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const access = snapshot?.modules.DOOH;
  const canRead = user?.companyId === companyId && canReadDoohProcessing(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const canQueue = user?.companyId === companyId && canRequestDoohProcessing(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles, processingQaUiEnabled);
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<{ key: string; items: DoohProcessingJob[] } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const requestKey = JSON.stringify([contextKey, selectedId, refresh]);
  const activeKey = useRef(requestKey);
  activeKey.current = requestKey;
  const pending = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedId(''); setHistory(null); setError(''); setNotice(''); setConfirmation('');
  }, [contextKey]);
  useEffect(() => {
    if (selectedId && !media.some((item) => item.id === selectedId)) setSelectedId('');
  }, [media, selectedId]);
  useEffect(() => {
    setHistory(null); setError(''); setConfirmation('');
    abortRef.current?.abort();
    if (!canRead || !selectedId || !media.some((item) => item.id === selectedId)) {
      setLoading(false); return;
    }
    const controller = new AbortController(); abortRef.current = controller;
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selectedId)}/processing`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || activeKey.current !== requestKey) return;
        const parsed = parseDoohProcessingHistory(data, selectedId);
        if (!parsed) { setError('Histórico de processamento incompatível com o contrato da API.'); return; }
        setHistory({ key: requestKey, items: parsed });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && activeKey.current === requestKey) setError(doohProcessingError(err, 'read'));
      })
      .finally(() => {
        if (!controller.signal.aborted && activeKey.current === requestKey) setLoading(false);
      });
    return () => controller.abort();
  }, [canRead, selectedId, requestKey, media]);

  const selected = media.find((item) => item.id === selectedId);
  const visible = history?.key === requestKey ? history.items : null;
  const canStart = Boolean(canQueue && visible && selected && canEnqueueDoohProcessing(selected, visible) &&
    confirmation === 'PROCESSAR' && !loading && !busy && !pending.current);

  async function enqueue(event: FormEvent) {
    event.preventDefault();
    if (!canStart || !selected || !visible || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const stableKey = requestKey;
    try {
      // GETs reduzem solicitações obsoletas. A regra transacional do backend é a autoridade.
      const [snapshotResponse, historyResponse] = await Promise.all([
        apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}`),
        apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}/processing`),
      ]);
      if (activeKey.current !== stableKey) return;
      const current = parseDoohMediaCasSnapshot(snapshotResponse.data, companyId, selected.id, folders);
      const recent = parseDoohProcessingHistory(historyResponse.data, selected.id);
      if (!current || current.status !== selected.status || current.updatedAt !== selected.updatedAt ||
          !recent || !canEnqueueDoohProcessing(current, recent)) {
        setError('A mídia ou o processamento foi alterado. Atualize a Biblioteca antes de continuar.'); return;
      }
      if (!window.confirm(`Enfileirar processamento da mídia “${selected.name}” em ambiente de QA? A fila não inicia o worker nem garante READY.`) ||
          activeKey.current !== stableKey) return;
      const queued = await apiClient.post<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}/process`, {});
      if (activeKey.current !== stableKey) return;
      const receipt = confirmDoohProcessingEnqueued(queued.data);
      if (!receipt) { setError('A API não confirmou um job válido. Consulte o histórico antes de repetir.'); return; }
      setNotice(receipt.alreadyQueued ? 'Um job existente foi retornado. Consulte o histórico.' :
        'Job enfileirado. Não foi iniciado um worker; consulte o histórico para acompanhar.');
      setConfirmation(''); setRefresh((number) => number + 1); onChanged();
    } catch (err: unknown) {
      if (activeKey.current === stableKey) setError(doohProcessingError(err, 'queue'));
    } finally { pending.current = false; setBusy(false); }
  }

  if (!canRead) return <p className="text-xs text-gray-600">Histórico DOOH disponível apenas para função técnica com permissão de leitura.</p>;
  return <section aria-label="Processamento de mídias DOOH D15B-05" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Processamento de mídias — D15B-05</h4>
      <p className="text-xs text-gray-600">Histórico real dos últimos 50 jobs por mídia. Um job na fila não comprova conversão, publicação, reprodução ou proof-of-play.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-60 flex-1 space-y-1 text-sm"><span className="block">Mídia</span>
        <select value={selectedId} aria-label="Mídia para consultar processamento DOOH" disabled={busy}
          onChange={(event) => { setSelectedId(event.target.value); setNotice(''); }}
          className="w-full rounded-md border border-gray-300 bg-white p-2">
          <option value="">Selecione uma mídia carregada</option>
          {media.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.status}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" disabled={!selectedId || loading || busy}
        onClick={() => { setNotice(''); setRefresh((value) => value + 1); }}>Atualizar histórico</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando jobs…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {visible && (visible.length === 0 ? <p className="text-sm text-gray-600">Nenhum job registrado para esta mídia.</p> :
      <ul aria-label="Jobs de processamento DOOH" className="space-y-2">
        {visible.map((job) => <li key={job.id} className="flex flex-wrap justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <div><strong>Versão {job.version}</strong> · {statusLabels[job.status]} · tentativa(s) {job.attempts}
            {job.failed && <span className="ml-2 text-amber-800">Falha registrada; consulte suporte técnico para diagnóstico.</span>}
          </div>
          <span>Solicitado em {new Date(job.createdAt).toLocaleString('pt-BR')}</span>
        </li>)}
      </ul>)}
    {!processingQaUiEnabled ? <p className="text-xs text-amber-800">Enfileiramento bloqueado nesta compilação. O worker atual é manual e permitido somente em ambiente isolado; nenhum job será criado por esta tela.</p> :
      <form onSubmit={(event) => void enqueue(event)} className="space-y-2 border-t border-gray-200 pt-3">
        <p className="text-xs text-amber-800">Enfileiramento reservado a QA com backend explicitamente habilitado. Não execute em produção. O processamento efetivo depende de worker isolado.</p>
        <label className="block space-y-1 text-sm">Confirmação textual: PROCESSAR
          <input aria-label="Confirmação de processamento DOOH" value={confirmation} disabled={!canQueue || busy}
            onChange={(event) => setConfirmation(event.target.value)} maxLength={16}
            className="block w-full max-w-xs rounded-md border border-gray-300 bg-white p-2" />
        </label>
        <Button type="submit" disabled={!canStart}>{busy ? 'Conferindo…' : 'Enfileirar para QA'}</Button>
      </form>}
  </section>;
}
