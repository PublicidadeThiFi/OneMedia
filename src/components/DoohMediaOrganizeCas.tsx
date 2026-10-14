import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohLibraryFolder, DoohLibraryMedia } from '../lib/doohMediaLibraryContract';
import {
  canOrganizeDoohMedia, doohMediaOrganizeError, normalizeDoohMediaName,
  parseDoohMediaCasSnapshot, prepareDoohMediaCasPayload, unchangedDoohMediaSnapshot,
  validDoohMediaDestination, verifyDoohMediaCasResponse,
} from '../lib/doohMediaOrganizeCasContract';

type Operation = 'rename' | 'move';
interface Props {
  companyId: string;
  folders: readonly DoohLibraryFolder[];
  media: readonly DoohLibraryMedia[];
  onChanged: () => void;
}

/** D15B-03: only metadata rename / folder move; no upload, delete, processing or publication. */
export function DoohMediaOrganizeCas({ companyId, folders, media, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const writable = canOrganizeDoohMedia(user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles ?? []) &&
    user?.companyId === companyId;
  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles]);
  const liveContext = useRef(contextKey);
  liveContext.current = contextKey;

  const [operation, setOperation] = useState<Operation>('rename');
  const [selectedId, setSelectedId] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [targetFolder, setTargetFolder] = useState('root');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSelectedId(''); setOperation('rename'); setTargetFolder('root'); setNameInput('');
    setError(''); setNotice('');
  }, [contextKey]);

  if (!writable) return <p className="text-xs text-gray-600">
    Renomear ou mover mídias exige acesso DOOH FULL e perfil técnico; a consulta permanece disponível.
  </p>;

  const selected = media.find((item) => item.id === selectedId);
  const destination = targetFolder === 'root' ? null : targetFolder;
  const canSubmit = !busy && Boolean(selected && prepareDoohMediaCasPayload(
    selected, operation, nameInput, destination, folders));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !writable || !canSubmit) return;
    const requestContext = contextKey;
    const targetName = normalizeDoohMediaName(nameInput);
    if (operation === 'rename' && !targetName) return;
    if (operation === 'move' && !validDoohMediaDestination(destination, folders)) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      // Preflight improves UX only. Backend CAS remains the concurrency authority.
      const before = await apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}`);
      const current = parseDoohMediaCasSnapshot(before.data, companyId, selected.id, folders);
      if (!current || !unchangedDoohMediaSnapshot(selected, current)) {
        setError('A mídia foi alterada desde a última consulta. Atualize a Biblioteca.');
        return;
      }
      if (liveContext.current !== requestContext) return;
      const confirmed = operation === 'rename'
        ? window.confirm(`Renomear a mídia "${selected.name}" para "${targetName}"? Apenas o nome será alterado.`)
        : window.confirm(`Mover a mídia "${selected.name}" de "${folders.find((f) => f.id === selected.folderId)?.name ?? 'Raiz'}" para "${folders.find((f) => f.id === destination)?.name ?? 'Raiz'}"? Nenhum arquivo será excluído.`);
      if (!confirmed || liveContext.current !== requestContext) return;
      const payload = prepareDoohMediaCasPayload(current, operation, nameInput, destination, folders);
      if (!payload) return;
      const response = await apiClient.patch<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}/organize-cas`, payload);
      if (liveContext.current !== requestContext) return;
      if (!verifyDoohMediaCasResponse(response.data, companyId, current, operation,
        operation === 'rename' ? targetName : destination, folders)) {
        setError('A API não confirmou o estado esperado da mídia. Atualize a Biblioteca antes de repetir.');
        return;
      }
      setSelectedId(''); setNameInput(''); setTargetFolder('root');
      setNotice('Organização confirmada. Atualizando catálogo e pastas.');
      onChanged();
    } catch (requestError: unknown) {
      if (liveContext.current === requestContext) setError(doohMediaOrganizeError(requestError));
    } finally { setBusy(false); }
  }

  return <section aria-label="Organizar mídias DOOH D15B-03" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Organização de mídias — D15B-03</h4>
      <p className="text-xs text-gray-600">Renomear ou mover uma mídia entre pastas. O backend compara nome, pasta e versão antes de gravar. Nenhuma mídia é excluída ou publicada.</p>
    </div>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Mídia</span>
        <select aria-label="Mídia DOOH para organizar" value={selectedId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => { const item = media.find((m) => m.id === event.target.value); setSelectedId(event.target.value); setNameInput(item?.name ?? ''); setTargetFolder(item?.folderId ?? 'root'); setError(''); }}>
          <option value="">Selecione uma mídia carregada</option>
          {media.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm"><span className="block">Operação</span>
        <select aria-label="Operação de mídia DOOH" value={operation} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => { setOperation(event.target.value as Operation); setError(''); }}>
          <option value="rename">Renomear mídia</option><option value="move">Mover entre pastas</option>
        </select>
      </label>
      {operation === 'rename' ? <label className="space-y-1 text-sm"><span className="block">Novo nome</span>
        <input aria-label="Novo nome da mídia DOOH" disabled={busy || !selected} maxLength={160} value={nameInput}
          onChange={(event) => setNameInput(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2" />
      </label> : <label className="space-y-1 text-sm"><span className="block">Pasta de destino</span>
        <select aria-label="Destino da mídia DOOH" value={targetFolder} disabled={busy || !selected} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => setTargetFolder(event.target.value)}>
          <option value="root">Raiz (sem pasta)</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name}`}</option>)}
        </select>
      </label>}
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>{busy ? 'Salvando…' : operation === 'rename' ? 'Confirmar novo nome' : 'Confirmar movimentação'}</Button>
        <p className="text-xs text-gray-600">Somente até 100 mídias carregadas por filtro. Em caso de conflito, atualize antes de repetir.</p>
      </div>
    </form>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
