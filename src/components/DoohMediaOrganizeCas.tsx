import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
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
  /** F13: opened from a media card's menu, for one file and one action. */
  fixedMediaId?: string;
  fixedOperation?: Operation;
  onCancel?: () => void;
}

/** D15B-03: only metadata rename / folder move; no upload, delete, processing or publication. */
export function DoohMediaOrganizeCas({ companyId, folders, media, onChanged, fixedMediaId, fixedOperation, onCancel }: Props) {
  const fixedItem = fixedMediaId ? media.find((item) => item.id === fixedMediaId) : undefined;
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const writable = canOrganizeDoohMedia(user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles ?? []) &&
    user?.companyId === companyId;
  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles]);
  const liveContext = useRef(contextKey);
  liveContext.current = contextKey;

  const [operation, setOperation] = useState<Operation>(fixedOperation ?? 'rename');
  const [selectedId, setSelectedId] = useState(fixedItem?.id ?? '');
  const [nameInput, setNameInput] = useState(fixedItem?.name ?? '');
  const [targetFolder, setTargetFolder] = useState(fixedItem?.folderId ?? 'root');
  const [busy, setBusy] = useState(false);
  const { ask, confirmUi } = useInlineConfirm();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSelectedId(fixedItem?.id ?? ''); setOperation(fixedOperation ?? 'rename'); setTargetFolder(fixedItem?.folderId ?? 'root'); setNameInput(fixedItem?.name ?? '');
    setError(''); setNotice('');
  }, [contextKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setError('Alguém alterou esta mídia há pouco. Atualize e confira antes de salvar.');
        return;
      }
      if (liveContext.current !== requestContext) return;
      const confirmed = operation === 'rename'
        ? await ask(`Renomear a mídia "${selected.name}" para "${targetName}"? Apenas o nome será alterado.`)
        : await ask(`Mover a mídia "${selected.name}" de "${folders.find((f) => f.id === selected.folderId)?.name ?? 'Raiz'}" para "${folders.find((f) => f.id === destination)?.name ?? 'Raiz'}"? Nenhum arquivo será excluído.`);
      if (!confirmed || liveContext.current !== requestContext) return;
      const payload = prepareDoohMediaCasPayload(current, operation, nameInput, destination, folders);
      if (!payload) return;
      const response = await apiClient.patch<unknown>(`/dooh/media/${encodeURIComponent(selected.id)}/organize-cas`, payload);
      if (liveContext.current !== requestContext) return;
      if (!verifyDoohMediaCasResponse(response.data, companyId, current, operation,
        operation === 'rename' ? targetName : destination, folders)) {
        setError('Não conseguimos confirmar se a alteração foi salva. Atualize para conferir.');
        return;
      }
      setSelectedId(''); setNameInput(''); setTargetFolder('root');
      setNotice('Organização confirmada. Atualizando catálogo e pastas.');
      onChanged();
    } catch (requestError: unknown) {
      if (liveContext.current === requestContext) setError(doohMediaOrganizeError(requestError));
    } finally { setBusy(false); }
  }

  if (fixedMediaId) return <section aria-label={operation === 'rename' ? 'Renomear mídia' : 'Mover mídia'} className="space-y-2 rounded-lg border border-indigo-200 bg-white p-3">
    <form onSubmit={(event) => void submit(event)} className="space-y-2">
      {operation === 'rename' ? <label className="block space-y-1 text-sm"><span className="block font-medium">Novo nome</span>
        <input aria-label="Novo nome da mídia DOOH" autoFocus disabled={busy || !selected} maxLength={160} value={nameInput}
          onChange={(event) => setNameInput(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2" />
      </label> : <label className="block space-y-1 text-sm"><span className="block font-medium">Mover para a pasta</span>
        <select aria-label="Destino da mídia DOOH" value={targetFolder} disabled={busy || !selected} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => setTargetFolder(event.target.value)}>
          <option value="root">Sem pasta</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name}`}</option>)}
        </select>
      </label>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!canSubmit}>{busy ? 'Salvando…' : operation === 'rename' ? 'Salvar nome' : 'Mover'}</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
    {confirmUi}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p>}
  </section>;
  return <section aria-label="Renomear ou mover mídia" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
    <div>
      <h4 className="font-semibold text-gray-900">Renomear ou mover mídia</h4>
      <p className="text-xs text-gray-600">Troque o nome de uma mídia ou mude a pasta dela. Nada é apagado e nada muda nas telas.</p>
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
    {confirmUi}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
