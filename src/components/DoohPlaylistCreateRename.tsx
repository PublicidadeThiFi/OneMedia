import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohPlaylistDetail, type DoohPlaylistSummary } from '../lib/doohPlaylistCatalogContract';
import { canWriteDoohPlaylists, doohPlaylistWriteError, normalizeDoohPlaylistName,
  parseDoohPlaylistCreated, parseDoohPlaylistRenamed, playlistSnapshotCurrent,
  validPlaylistSnapshot } from '../lib/doohPlaylistWriteContract';

interface Props { companyId: string; playlists: readonly DoohPlaylistSummary[]; onChanged: () => void }

/** D15C-02: POST inicial de playlist + PATCH exclusivo CAS para renomear.
 * Não altera versões, itens, agendas, manifestações ou status de publicação.
 */
export function DoohPlaylistCreateRename({ companyId, playlists, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const [operation, setOperation] = useState<'create' | 'rename'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const control = useRef<AbortController | null>(null);
  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId,
    snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, user?.roles]);
  const liveContext = useRef(contextKey);
  liveContext.current = contextKey;
  const writable = companyId === user?.companyId && canWriteDoohPlaylists(
    companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted,
    snapshot?.modules.DOOH.accessMode, user?.roles ?? []);

  useEffect(() => {
    setOperation('create'); setSelectedId(''); setNameInput(''); setError(''); setNotice(''); setBusy(false);
    return () => { control.current?.abort(); };
  }, [contextKey]);

  if (!writable) return <p className="text-xs text-gray-600">A criação e renomeação de playlists exigem acesso DOOH FULL e papel ADMINISTRATIVO ou TI.</p>;

  const current = playlists.find((entry) => entry.id === selectedId);
  const name = normalizeDoohPlaylistName(nameInput);
  const canSubmit = Boolean(!busy && name && (operation === 'create' ||
    (validPlaylistSnapshot(current) && current?.name !== name)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!writable || !canSubmit || !name) return;
    const create = operation === 'create';
    const previous = create ? null : current;
    if (!create && !validPlaylistSnapshot(previous)) return;
    const confirmed = window.confirm(create
      ? `Criar a playlist "${name}" com um rascunho vazio? Não haverá publicação ou agendamento.`
      : `Renomear a playlist "${previous!.name}" para "${name}"? As versões existentes permanecerão intactas.`);
    if (!confirmed) return;
    const initialContext = liveContext.current;
    const controller = new AbortController();
    control.current = controller;
    setBusy(true); setError(''); setNotice('');
    const stillCurrent = () => !controller.signal.aborted && liveContext.current === initialContext;
    try {
      if (create) {
        const { data } = await apiClient.post<unknown>('/dooh/playlists', { name }, { signal: controller.signal });
        if (!stillCurrent()) return;
        const parsed = parseDoohPlaylistCreated(data, companyId, name, playlists.map((p) => p.id));
        if (!parsed) { setError('Resposta de criação incompatível com a API. Consulte o catálogo antes de tentar novamente.'); return; }
        setNotice('Playlist criada com rascunho inicial. Nenhuma publicação foi realizada.');
      } else {
        // Mitigação de interface; proteção definitiva no UPDATE atômico do backend.
        const before = previous!;
        const preflight = await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(before.id)}`,
          { signal: controller.signal });
        if (!stillCurrent()) return;
        const fresh = parseDoohPlaylistDetail(preflight.data, companyId, before.id);
        if (!fresh || !playlistSnapshotCurrent(before, fresh)) {
          setError('A playlist foi alterada. Atualize o catálogo e revise a operação.'); return;
        }
        const { data } = await apiClient.patch<unknown>(
          `/dooh/playlists/${encodeURIComponent(before.id)}/rename-cas`,
          { expectedName: before.name, expectedUpdatedAt: before.updatedAt, name },
          { signal: controller.signal },
        );
        if (!stillCurrent()) return;
        const parsed = parseDoohPlaylistRenamed(data, companyId, before, name);
        if (!parsed) { setError('Resposta de renomeação incompatível. Atualize o catálogo antes de tentar novamente.'); return; }
        setNotice('Playlist renomeada com comparação atômica. As versões foram preservadas.');
      }
      if (stillCurrent()) { setNameInput(''); setSelectedId(''); onChanged(); }
    } catch (reason: unknown) {
      if (stillCurrent()) setError(doohPlaylistWriteError(reason));
    } finally {
      if (control.current === controller) control.current = null;
      if (stillCurrent()) setBusy(false);
    }
  }

  return <section aria-label="Operações seguras de playlists D15C-02" className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <h4 className="font-semibold text-gray-900">Criar e renomear playlists</h4>
    <p className="text-xs text-gray-600">Criação gera somente um rascunho vazio. Renomeação utiliza confirmação e controle atômico de concorrência. Sem publicação.</p>
    <form onSubmit={(event) => { void submit(event); }} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Operação</span>
        <select aria-label="Operação de playlist" value={operation} disabled={busy}
          className="w-full rounded-md border border-gray-300 bg-white p-2" onChange={(event) => {
            setOperation(event.target.value === 'rename' ? 'rename' : 'create');
            setSelectedId(''); setNameInput(''); setError(''); setNotice('');
          }}><option value="create">Criar playlist</option><option value="rename">Renomear playlist</option></select>
      </label>
      {operation === 'rename' && <label className="space-y-1 text-sm"><span className="block">Playlist ativa</span>
        <select aria-label="Selecionar playlist ativa" disabled={busy} value={selectedId}
          className="w-full rounded-md border border-gray-300 bg-white p-2" onChange={(event) => {
            const candidate = playlists.find((p) => p.id === event.target.value && p.status === 'ACTIVE');
            setSelectedId(candidate?.id ?? ''); setNameInput(candidate?.name ?? ''); setError(''); setNotice('');
          }}><option value="">Selecione uma playlist</option>{playlists.filter((p) => p.status === 'ACTIVE')
            .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>}
      <label className="space-y-1 text-sm"><span className="block">{operation === 'create' ? 'Nome da playlist' : 'Novo nome'}</span>
        <input aria-label="Nome da playlist DOOH" value={nameInput} maxLength={160} disabled={busy}
          onChange={(event) => setNameInput(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white p-2" />
      </label>
      <div className="flex items-end"><Button type="submit" disabled={!canSubmit}>{busy ? 'Salvando…' : operation === 'create' ? 'Criar playlist' : 'Renomear playlist'}</Button></div>
    </form>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
