import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { useDoohMediaPilotCapabilities } from '../lib/useDoohMediaPilotCapabilities';
import type { DoohLibraryFolder } from '../lib/doohMediaLibraryContract';
import {
  canUploadDoohMedia, confirmDoohUploadFinalized, doohUploadError,
  normalizeDoohUploadName, parseDoohUploadIntent, suggestDoohMediaName, validateDoohUploadFile,
  validDoohUploadFolder,
} from '../lib/doohMediaUploadContract';

interface Props { companyId: string; folders: readonly DoohLibraryFolder[]; onChanged: (mediaId: string, autoProcessing: boolean) => void; }
type PendingFinalize = {
  intentId: string; companyId: string; contextKey: string; name: string;
  folderId: string | null; file: { mimeType: string; size: number };
};

/** UX08 — direct S3 signed PUT; backend optionally queues safe processing. No publish/delete or credentials exposed. */
export function DoohMediaUpload({ companyId, folders, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const contextKey = JSON.stringify([user?.id, user?.companyId, companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, [...(user?.roles ?? [])].sort()]);
  const eligible = canUploadDoohMedia(user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles ?? [], true) &&
    user?.companyId === companyId;
  const pilot = useDoohMediaPilotCapabilities(companyId, contextKey, Boolean(eligible));
  const writable = eligible && pilot.uploadEnabled;
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const controller = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        pending.folderId, pending.name, pending.file, folders, pilot.autoProcessingEnabled);
      if (!media) {
        setError('Não conseguimos confirmar o envio. Confira na lista de mídias antes de enviar de novo.');
        setNeedsFinalize(false); pendingFinalize.current = null;
        return;
      }
      pendingFinalize.current = null; setNeedsFinalize(false);
      setFile(null); setNameInput(''); setFolderId('root');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice(pilot.autoProcessingEnabled
        ? 'Arquivo recebido. Preparação iniciada automaticamente; a Biblioteca acompanhará o resultado.'
        : 'Arquivo recebido. Para utilizá-lo, é necessário iniciar a preparação.');
      onChanged(media.id, pilot.autoProcessingEnabled);
    } catch (e: unknown) {
      if (abort.signal.aborted || contextRef.current !== pending.contextKey) return;
      setError(`${doohUploadError(e, 'finalize')} Se o arquivo já foi enviado, use “Repetir finalização” sem enviá-lo novamente.`);
      setNeedsFinalize(true);
    } finally {
      if (contextRef.current === pending.contextKey) setPhase('idle');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canStart || !file || !normalizedName || !validFile || !writable) return;
    const thisKey = contextKey;
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
      if (!intent) { setError('Não foi possível iniciar o envio. Tente de novo em instantes.'); return; }
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

  if (!eligible) return <p className="text-xs text-gray-600">Sua conta não tem permissão para enviar arquivos. Solicite acesso a um administrador.</p>;
  if (!pilot.uploadEnabled) return <p className="text-xs text-amber-800">O envio não está disponível nesta conta. Confira sua conexão ou solicite ajuda ao administrador.</p>;

  return <section aria-label="Enviar imagem ou vídeo" className="space-y-3 rounded-xl border border-indigo-200 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Enviar mídia</h4>
      <p className="text-xs text-gray-600">Escolha um arquivo. A plataforma verifica e prepara a mídia para uso. O envio não inicia a exibição na tela.</p>
    </div>
    <form onSubmit={(e) => void submit(e)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Arquivo (PNG, JPEG ou MP4; outros formatos conforme plano)</span>
        <input ref={fileInputRef} aria-label="Arquivo de mídia DOOH" type="file" disabled={isBusy || needsFinalize}
          accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,.avi,.mkv,.pdf"
          onChange={(e) => { const candidate = e.target.files?.[0] ?? null; setFile(candidate);
            setNameInput(candidate ? suggestDoohMediaName(candidate.name, candidate.type) : ''); setError(''); }}
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
        <Button type="submit" disabled={!canStart}>{isBusy ? 'Enviando arquivo…' : 'Enviar mídia'}</Button>
        {needsFinalize && <Button type="button" variant="outline" onClick={() => void retryFinalize()}>Tentar concluir de novo</Button>}
        <span className="text-xs text-gray-600">{pilot.autoProcessingEnabled ? 'Após o envio, a preparação começa automaticamente.' : 'Após o envio, inicie a preparação na Biblioteca.'}</span>
      </div>
    </form>
    {file && !validFile && <p role="alert" className="text-sm text-amber-800">Formato ou tamanho não aceito. Use imagem JPG ou PNG, ou vídeo MP4.</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
