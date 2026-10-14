import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohLibraryFolder } from '../lib/doohMediaLibraryContract';
import {
  canWriteDoohFolders, doohFolderWriteError, isDoohFolderPreflightCurrent,
  normalizeDoohFolderName, parseDoohFolderWriteResponse, validDoohFolderTarget,
} from '../lib/doohFolderOperationsContract';

interface Props {
  companyId: string;
  folders: readonly DoohLibraryFolder[];
  onChanged: () => void;
}

/** D15B-02 — creation and rename only. No folder deletion, media moves or uploads.
 * For rename, GET preflight mitigates stale edits; true CAS is not offered by this API.
 */
export function DoohFolderOperations({ companyId, folders, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const writable = user?.companyId === companyId && canWriteDoohFolders(
    user?.companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted,
    snapshot?.modules.DOOH.accessMode, user?.roles ?? [],
  );
  const [mode, setMode] = useState<'create' | 'rename'>('create');
  const [parentId, setParentId] = useState('root');
  const [selectedId, setSelectedId] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles]);
  const liveContext = useRef(contextKey);
  liveContext.current = contextKey;
  useEffect(() => {
    setMode('create'); setParentId('root'); setSelectedId(''); setNameInput('');
    setError(''); setNotice('');
  }, [contextKey]);

  if (!writable) return <p className="text-xs text-gray-600">Gestão de pastas disponível apenas para acesso DOOH FULL e função técnica. Este inventário permanece em leitura.</p>;

  const selected = folders.find((folder) => folder.id === selectedId);
  const name = normalizeDoohFolderName(nameInput);
  const intendedParent = parentId === 'root' ? null : parentId;
  const canSubmit = !busy && Boolean(name) && (
    mode === 'create' ? validDoohFolderTarget(intendedParent, folders) :
      Boolean(selected && name !== selected.name)
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !name || !writable) return;
    const creating = mode === 'create';
    const original = selected;
    const parent = creating ? intendedParent : original?.parentId;
    if (parent === undefined || !validDoohFolderTarget(parent, folders) ||
        (!creating && !original)) return;
    const confirmation = creating
      ? `Criar a pasta "${name}" ${parent === null ? 'na raiz' : `dentro de "${folders.find((f) => f.id === parent)?.name}"`}?`
      : `Renomear a pasta "${original?.name}" para "${name}"? O conteúdo não será movido.`;
    if (!window.confirm(confirmation)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (!creating && original) {
        const before = await apiClient.get<unknown>(`/dooh/folders/${encodeURIComponent(original.id)}`);
        if (!isDoohFolderPreflightCurrent(before.data, companyId, original, folders)) {
          setError('A pasta mudou desde a última consulta. Atualize a Biblioteca antes de renomear.');
          return;
        }
      }
      if (liveContext.current !== contextKey) {
        setError('O contexto da empresa ou acesso foi alterado. Atualize antes de tentar novamente.');
        return;
      }
      const response = creating
        ? await apiClient.post<unknown>('/dooh/folders', { name, ...(parent === null ? {} : { parentId: parent }) })
        : await apiClient.patch<unknown>(`/dooh/folders/${encodeURIComponent(original!.id)}`, { name });
      const verified = parseDoohFolderWriteResponse(response.data, companyId,
        creating ? 'create' : 'rename', { ...(creating ? {} : { id: original!.id }), name, parentId: parent }, folders);
      if (liveContext.current !== contextKey) return;
      if (!verified) {
        setError('A API não confirmou a pasta esperada. Atualize o inventário antes de tentar novamente.');
        return;
      }
      setNameInput(''); setSelectedId(''); setMode('create');
      setNotice('Alteração confirmada. Atualizando o inventário de pastas e mídias.');
      onChanged();
    } catch (requestError: unknown) {
      if (liveContext.current === contextKey) setError(doohFolderWriteError(requestError));
    }
    finally { setBusy(false); }
  }

  return <section aria-label="Gestão de pastas DOOH D15B-02" className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
    <div>
      <h4 className="font-semibold text-gray-900">Organizar pastas — D15B-02</h4>
      <p className="mt-1 text-xs text-gray-600">Criar pastas/subpastas e renomear pastas existentes. Não apaga pastas, move arquivos ou publica conteúdo.</p>
    </div>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Operação</span>
        <select aria-label="Operação de pasta DOOH" value={mode} disabled={busy}
          className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => { setMode(event.target.value as 'create' | 'rename'); setNameInput(''); setError(''); }}>
          <option value="create">Criar pasta</option><option value="rename">Renomear pasta</option>
        </select>
      </label>
      {mode === 'create' ? <label className="space-y-1 text-sm"><span className="block">Pasta pai</span>
        <select aria-label="Pasta pai DOOH" value={parentId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => setParentId(event.target.value)}>
          <option value="root">Raiz da Biblioteca</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name}`}</option>)}
        </select>
      </label> : <label className="space-y-1 text-sm"><span className="block">Pasta atual</span>
        <select aria-label="Selecionar pasta para renomear" value={selectedId} disabled={busy} className="w-full rounded-md border border-gray-300 bg-white p-2"
          onChange={(event) => { const folder = folders.find((f) => f.id === event.target.value); setSelectedId(event.target.value); setNameInput(folder?.name ?? ''); }}>
          <option value="">Selecione uma pasta</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{`${'— '.repeat(Math.min(folder.depth, 8))}${folder.name}`}</option>)}
        </select>
      </label>}
      <label className="space-y-1 text-sm"><span className="block">{mode === 'create' ? 'Nome da nova pasta' : 'Novo nome'}</span>
        <input aria-label="Nome de pasta DOOH" value={nameInput} disabled={busy} maxLength={120}
          onChange={(event) => setNameInput(event.target.value)} placeholder="Até 120 caracteres"
          className="w-full rounded-md border border-gray-300 bg-white p-2" />
      </label>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>{busy ? 'Salvando…' : mode === 'create' ? 'Criar pasta' : 'Renomear pasta'}</Button>
        <p className="text-xs text-gray-600">A renomeação confere o estado imediatamente antes da escrita, mas ainda não possui CAS atômico no backend.</p>
      </div>
    </form>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
