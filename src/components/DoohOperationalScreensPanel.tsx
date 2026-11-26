import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohScreenContentWizard } from './DoohScreenContentWizard';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { friendlyOperationalScreenError, operationalScreenStatusText, parseOperationalScreen, parseOperationalScreenPage,
  type OperationalScreen } from '../lib/doohOperationalScreenContract';

/** UX09: opt-in, tenant-scoped operational registry. Legacy inventory remains below. */
export function DoohOperationalScreensPanel({ onConnect }: { onConnect: () => void }) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const available = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' &&
    roles.some(role => role === 'ADMINISTRATIVO' || role === 'TI'));
  const writable = available && snapshot?.modules.DOOH.accessMode === 'FULL';
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [playerQueryInput, setPlayerQueryInput] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [screenList, setScreenList] = useState<{ items: OperationalScreen[]; total: number; page: number } | null>(null);
  const [players, setPlayers] = useState<DoohPlayerInventoryItem[]>([]);
  const [mode, setMode] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [contentScreenId, setContentScreenId] = useState('');
  const [name, setName] = useState('');
  const [orientation, setOrientation] = useState<'LANDSCAPE' | 'PORTRAIT'>('LANDSCAPE');
  const [fitMode, setFitMode] = useState<'CONTAIN' | 'COVER'>('CONTAIN');
  const [deviceChoice, setDeviceChoice] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setScreenList(null); setError('');
    if (!available) { setMode('disabled'); return; }
    const controller = new AbortController();
    setMode('loading');
    void Promise.all([
      apiClient.get<unknown>('/dooh/operational-screens', { params: { page, pageSize: 20 }, signal: controller.signal }),
      apiClient.get<unknown>('/dooh/players', { params: { page: 1, pageSize: 100, ...(playerQuery ? {q: playerQuery} : {}) }, signal: controller.signal }),
    ]).then(([screens, devices]) => {
      if (controller.signal.aborted) return;
      const parsed = parseOperationalScreenPage(screens.data);
      const parsedPlayers = parseDoohPlayerInventoryResponse(devices.data);
      if (!parsed || !parsedPlayers) { setMode('error'); setError('Os registros recebidos não puderam ser conferidos.'); return; }
      setScreenList({ items: parsed.items, total: parsed.meta.total, page: parsed.meta.page });
      setPlayers(parsedPlayers.items);
      setMode('enabled');
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      const response = cause && typeof cause === 'object' && 'response' in cause ? (cause as {response?: {status?: number}}).response : undefined;
      if (response?.status === 403 || response?.status === 404 || response?.status === 503) setMode('disabled');
      else { setMode('error'); setError('Não foi possível carregar as telas. Use a área de inventário abaixo ou tente novamente.'); }
    });
    return () => controller.abort();
  }, [available, page, reload, playerQuery]);
  if (!available) return null;
  if (mode === 'disabled') return <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
    Cadastro simplificado de telas ainda não habilitado nesta empresa. As telas e dispositivos existentes continuam disponíveis abaixo.
  </section>;
  async function createScreen(e: FormEvent) {
    e.preventDefault();
    if (!writable || busy || mode !== 'enabled' || !name.trim() || name.trim().length > 120) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.post<unknown>('/dooh/operational-screens', { name: name.trim(), orientation, fitMode });
      const newScreen = parseOperationalScreen(data);
      if (!newScreen || newScreen.name !== name.trim()) throw Error('Unexpected API response');
      setName(''); setPage(1); setReload(v => v + 1);
      setMessage('Tela criada. Ela pode ficar vazia até você conectar um aparelho e adicionar conteúdo.');
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  async function bindPlayer(screen: OperationalScreen) {
    const playerId = deviceChoice[screen.id];
    if (!writable || busy || !playerId || !players.some(p => p.id === playerId && p.lifecycleStatus === 'ACTIVE')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.put<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/player`, { playerId });
      const result = parseOperationalScreen(data);
      if (!result || result.playerId !== playerId) throw Error('Unexpected API response');
      setMessage(`Dispositivo associado à tela “${screen.name}”. A programação pode ser adicionada depois.`);
      setReload(v => v + 1);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  return <section aria-label="Telas operacionais" className="space-y-4 rounded-xl border border-indigo-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-gray-900">Minhas telas</h2>
      <p className="mt-1 text-sm text-gray-600">Cadastre uma TV, monitor ou totem sem criar um ponto de mídia comercial.</p></div>
      <Button type="button" variant="outline" disabled={mode === 'loading' || busy} onClick={() => setReload(v => v + 1)}>Atualizar</Button>
    </div>
    {mode === 'loading' && <p role="status" className="text-sm text-gray-600">Carregando telas…</p>}
    {mode === 'error' && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {mode === 'enabled' && <>
      <form onSubmit={e => void createScreen(e)} className="space-y-3 rounded-lg bg-indigo-50 p-4">
        <h3 className="font-semibold text-gray-900">Adicionar tela</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span>Nome da tela</span><input className="w-full rounded-md border border-gray-300 bg-white p-2" placeholder="Ex.: TV da recepção" value={name} maxLength={120} onChange={e => setName(e.target.value)} disabled={!writable || busy} /></label>
          <label className="space-y-1 text-sm"><span>Posição</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={orientation} onChange={e => setOrientation(e.target.value as 'LANDSCAPE' | 'PORTRAIT')} disabled={!writable || busy}><option value="LANDSCAPE">Horizontal</option><option value="PORTRAIT">Vertical</option></select></label>
          <label className="space-y-1 text-sm"><span>Preferência de ajuste</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={fitMode} onChange={e => setFitMode(e.target.value as 'CONTAIN' | 'COVER')} disabled={!writable || busy}><option value="CONTAIN">Mostrar inteira</option><option value="COVER">Preencher a tela (pode cortar)</option></select></label>
        </div>
        <Button type="submit" disabled={!writable || busy || !name.trim()}>Criar minha tela</Button>
        <p className="text-xs text-gray-600">Você pode criar a tela agora e adicionar a mídia depois. A preferência de ajuste será usada pela programação quando integrada. Criar uma tela não consome licença de player.</p>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {screenList?.total === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">Nenhuma tela cadastrada. Comece pelo nome no formulário acima.</p>}
      <div className="grid gap-3 md:grid-cols-2">{screenList?.items.map(screen => <article key={screen.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div><h3 className="font-semibold text-gray-900">{screen.name}</h3><p className="text-sm text-gray-600">{operationalScreenStatusText[screen.status]}</p></div>
        <p className="text-xs text-gray-600">{screen.orientation === 'LANDSCAPE' ? 'Horizontal' : 'Vertical'} · {screen.fitMode === 'CONTAIN' ? 'Mostrar inteira' : 'Preencher a tela'}</p>
        <Button type="button" variant="outline" disabled={busy || mode !== 'enabled'} onClick={() => setContentScreenId(current => current === screen.id ? '' : screen.id)}>{contentScreenId === screen.id ? 'Fechar conteúdo' : 'Gerenciar conteúdo'}</Button>
        {screen.player ? <p className="text-sm text-gray-700">Aparelho: <strong>{screen.player.name}</strong>{screen.commercialUnit ? ` · Inventário: ${screen.commercialUnit.label}` : ''}</p> : <div className="space-y-2">
          <p className="text-sm text-gray-700">A tela ainda não tem um aparelho vinculado.</p>
          <button type="button" onClick={onConnect} className="text-sm font-semibold text-indigo-700 underline underline-offset-2">Gerar código no aparelho e parear</button>
          <p className="text-xs text-gray-600">Não encontrou o aparelho? Pesquise pelo nome; o pareamento feito anteriormente permanece válido.</p>
          <form onSubmit={e => { e.preventDefault(); setPlayerQuery(playerQueryInput.trim()); }} className="flex gap-2">
            <input aria-label="Buscar aparelho pelo nome" placeholder="Nome do aparelho" className="min-w-0 flex-1 rounded-md border p-2 text-sm" value={playerQueryInput} maxLength={120} onChange={e => setPlayerQueryInput(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy}>Buscar</Button>
          </form>
          <label className="block space-y-1 text-sm"><span>Ou escolha um aparelho já pareado</span>
            <select className="w-full rounded-md border p-2" value={deviceChoice[screen.id] ?? ''} onChange={e => setDeviceChoice(v => ({...v,[screen.id]:e.target.value}))} disabled={!writable || busy}><option value="">Selecione o aparelho</option>{players.filter(player => player.lifecycleStatus === 'ACTIVE').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <Button type="button" disabled={!writable || busy || !deviceChoice[screen.id]} onClick={() => void bindPlayer(screen)}>Conectar aparelho à tela</Button>
        </div>}
      </article>)}</div>
      {contentScreenId && screenList?.items.some(screen => screen.id === contentScreenId) && <DoohScreenContentWizard key={contentScreenId} screen={screenList.items.find(screen => screen.id === contentScreenId)!} onClose={() => setContentScreenId('')} />}
      {screenList && <div className="flex items-center justify-between text-sm"><span>{screenList.total} tela(s) cadastrada(s) · página {screenList.page}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || page <= 1} onClick={() => setPage(n => Math.max(n - 1, 1))}>Anterior</Button><Button type="button" variant="outline" disabled={busy || page * 20 >= screenList.total} onClick={() => setPage(n => n + 1)}>Próxima</Button></div></div>}
      {!writable && <p className="text-xs text-gray-600">Somente leitura: sua permissão não permite cadastrar ou conectar aparelhos.</p>}
    </>}
  </section>;
}
