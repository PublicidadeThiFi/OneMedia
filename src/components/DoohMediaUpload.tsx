import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohLibraryFolder } from '../lib/doohMediaLibraryContract';
import {
  canUploadDoohMedia, confirmDoohUploadFinalized, doohUploadError,
  normalizeDoohUploadName, parseDoohUploadIntent, validateDoohUploadFile,
  validDoohUploadFolder,
} from '../lib/doohMediaUploadContract';

const uploadUiEnabled = import.meta.env.VITE_DOOH_MEDIA_UPLOAD_UI_ENABLED === 'true';
interface Props { companyId: string; folders: readonly DoohLibraryFolder[]; onChanged: () => void; }
type PendingFinalize = {
  intentId: string; companyId: string; contextKey: string; name: string;
  folderId: string | null; file: { mimeType: string; size: number };
};

/** D15B-04 — direct S3 signed PUT; no publish/process/delete or credentials exposed. */
export function DoohMediaUpload({ companyId, folders, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, [...(user?.roles ?? [])].sort()]);
  const writable = canUploadDoohMedia(user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles ?? [], uploadUiEnabled) &&
    user?.companyId === companyId;
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const controller = useRef<AbortController | null>(null);
  const pendingFinalize = useRef<PendingFinalize | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [folderId, setFolderId] = useState('root');
  const [phase, setPhase] = useState<'idle' | 'init' | 'put' | 'finalize'>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsFinalize, setNeedsFinalize] = useState(false);
  const isBusy = phase !== 'idle';
  const normalizedName = normalizeDoohUploadName(nameInput);
  const validFile = validateDoohUploadFile(file);
  const selectedFolder = folderId === 'root' ? null : folderId;
  const canStart = Boolean(writable && !isBusy && !needsFinalize && normalizedName && validFile &&
    validDoohUploadFolder(selectedFolder, folders));

  useEffect(() => {
    return () => { controller.current?.abort(); pendingFinalize.current = null; };
  }, [contextKey]);
  useEffect(() => {
    setFile(null); setNameInput(''); setFolderId('root'); setError(''); setNotice('');
    setNeedsFinalize(false); pendingFinalize.current = null; controller.current?.abort();
  }, [contextKey]);

  async function finalize(pending: PendingFinalize, abort: AbortController) {
    if (abort.signal.aborted || contextRef.current !== pending.contextKey) return;
    setPhase('finalize');
    try {
      const response = await apiClient.post<unknown>(
        `/dooh/media/uploads/${encodeURIComponent(pending.intentId)}/finalize`, {}, { signal: abort.signal },
      );
      if (abort.signal.aborted || contextRef.current !== pending.contextKey) return;
      const media = confirmDoohUploadFinalized(response.data, pending.companyId,
        pending.folderId, pending.name, pending.file, folders);
      if (!media) {
        setError('Finalização retornou resultado incompatível. Consulte a Biblioteca antes de repetir o upload.');
        setNeedsFinalize(false); pendingFinalize.current = null;
        return;
      }
      pendingFinalize.current = null; setNeedsFinalize(false);
      setFile(null); setNameInput(''); setFolderId('root');
      setNotice('Upload confirmado. Mídia registrada como PENDING; o processamento e a publicação são etapas separadas.');
      onChanged();
    } catch (e: unknown) {
      if (abort.signal.aborted || contextRef.current !== pending.contextKey) return;
      setError(`${doohUploadError(e, 'finalize')} Se o S3 recebeu o arquivo, use “Repetir finalização”, sem reenviar o binário.`);
      setNeedsFinalize(true);
    } finally {
      if (contextRef.current === pending.contextKey) setPhase('idle');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canStart || !file || !normalizedName || !validFile || !writable) return;
    const thisKey = contextKey;
    if (!window.confirm(`Enviar “${normalizedName}” (${file.name}) ao armazenamento da Biblioteca DOOH? O conteúdo ficará PENDING até processamento posterior.`)) return;
    const abort = new AbortController(); controller.current = abort;
    pendingFinalize.current = null; setError(''); setNotice(''); setPhase('init');
    let stage: 'init' | 'put' = 'init';
    try {
      const init = await apiClient.post<unknown>('/dooh/media/uploads/init', {
        name: normalizedName, fileName: validFile.fileName, mimeType: validFile.mimeType,
        size: validFile.size, ...(selectedFolder ? { folderId: selectedFolder } : {}),
      }, { signal: abort.signal });
      if (abort.signal.aborted || contextRef.current !== thisKey) return;
      const intent = parseDoohUploadIntent(init.data, validFile);
      if (!intent) { setError('A API retornou uma autorização S3 inválida; upload interrompido.'); return; }
      stage = 'put'; setPhase('put');
      // Direct-to-S3, never use apiClient; it includes API authentication interceptors.
      // No redirects, credentials, response body, signed URL or headers are logged.
      const put = await fetch(intent.url, {
        method: 'PUT', body: file, credentials: 'omit', redirect: 'error', signal: abort.signal,
        headers: { ...intent.headers, 'Content-Type': intent.contentType },
      });
      if (abort.signal.aborted || contextRef.current !== thisKey) return;
      if (!put.ok) { setError(doohUploadError(null, 'put')); return; }
      const pending: PendingFinalize = { intentId: intent.intentId, companyId, contextKey: thisKey,
        name: normalizedName, folderId: selectedFolder, file: { mimeType: validFile.mimeType, size: validFile.size } };
      pendingFinalize.current = pending;
      await finalize(pending, abort);
    } catch (e: unknown) {
      if (!abort.signal.aborted && contextRef.current === thisKey) {
        setError(doohUploadError(e, stage));
      }
    } finally {
      if (controller.current === abort) controller.current = null;
      if (contextRef.current === thisKey) setPhase('idle');
    }
  }

  async function retryFinalize() {
    const pending = pendingFinalize.current;
    if (!pending || !writable || isBusy || contextRef.current !== pending.contextKey) return;
    const abort = new AbortController(); controller.current = abort;
    setNeedsFinalize(false); setError('');
    await finalize(pending, abort);
    if (controller.current === abort) controller.current = null;
  }

  if (!uploadUiEnabled) return <p className="text-xs text-gray-600">Upload de mídia DOOH ainda bloqueado nesta compilação. A liberação exige autorização de QA e configuração segura do S3.</p>;
  if (!writable) return <p className="text-xs text-gray-600">Upload exige DOOH FULL e função ADMINISTRATIVO ou TI.</p>;

  return <section aria-label="Upload de mídia DOOH D15B-04" className="space-y-3 rounded-xl border border-indigo-200 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Enviar mídia — D15B-04</h4>
      <p className="text-xs text-gray-600">Envio direto ao S3 usando URL temporária. O servidor valida cota e objeto antes de registrar a mídia como PENDING. Nada é publicado automaticamente.</p>
    </div>
    <form onSubmit={(e) => void submit(e)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Arquivo (imagem, vídeo ou PDF)</span>
        <input aria-label="Arquivo de mídia DOOH" type="file" disabled={isBusy || needsFinalize}
          accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,.avi,.mkv,.pdf"
          onChange={(e) => { const candidate = e.target.files?.[0] ?? null; setFile(candidate);
            setNameInput(candidate ? candidate.name.replace(/\.[^/.]+$/, '') : ''); setError(''); }}
          className="w-full rounded-md border border-gray-300 p-2" />
      </label>
      <label className="space-y-1 text-sm"><span className="block">Nome na biblioteca</span>
        <input aria-label="Nome da mídia para upload" disabled={isBusy || needsFinalize} maxLength={160}
          value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2" />
      </label>
      <label className="space-y-1 text-sm"><span className="block">Pasta de destino</span>
        <select aria-label="Pasta de destino do upload" disabled={isBusy || needsFinalize} value={folderId}
          onChange={(e) => setFolderId(e.target.value)} className="w-full rounded-md border border-gray-300 p-2">
          <option value="root">Raiz</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{`${'— '.repeat(Math.min(8, f.depth))}${f.name}`}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-3 items-center md:col-span-3">
        <Button type="submit" disabled={!canStart}>{isBusy ? 'Enviando…' : 'Autorizar e enviar'}</Button>
        {needsFinalize && <Button type="button" variant="outline" onClick={() => void retryFinalize()}>Repetir finalização (sem reenviar)</Button>}
        <span className="text-xs text-gray-600">PUT único até 5 GiB; sem upload multipart ou processamento automático.</span>
      </div>
    </form>
    {file && !validFile && <p role="alert" className="text-sm text-amber-800">Arquivo não permitido, MIME incompatível ou tamanho fora do limite.</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
