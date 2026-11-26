import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { screenNextStep } from '../lib/doohJourneyGuidance';
import { screenOperationalSummary } from '../lib/doohScreenDiagnosticContract';
import { DoohScreenDiagnostic } from './DoohScreenDiagnostic';
import { Button } from './ui/button';
import { DoohScreenContentWizard } from './DoohScreenContentWizard';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { friendlyOperationalScreenError, parseOperationalScreen, parseOperationalScreenPage,
  type OperationalScreen } from '../lib/doohOperationalScreenContract';

/** UX09: opt-in, tenant-scoped operational registry. Legacy inventory remains below. */
export function DoohOperationalScreensPanel({ onConnect }: { onConnect: () => void }) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const key = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, [...(user?.roles ?? [])].sort()]);
  return <OperationalScreensForContext key={key} onConnect={onConnect} />;
}
function OperationalScreensForContext({ onConnect }: { onConnect: () => void }) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const available = Boolean(companyId && snapshot?.companyId === companyId &&
    snapshot.modules.DOOH.granted && snapshot.modules.DOOH.accessMode !== 'NONE' &&
    roles.some(role => role === 'ADMINISTRATIVO' || role === 'TI'));
  const writable = available && snapshot?.modules.DOOH.accessMode === 'FULL';
  const [diagnosticId, setDiagnosticId] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);
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
  const [createOpen, setCreateOpen] = useState(false);
  const editorOpen = Boolean(contentScreenId);
  const [orientation, setOrientation] = useState<'LANDSCAPE' | 'PORTRAIT'>('LANDSCAPE');
  const [fitMode, setFitMode] = useState<'CONTAIN' | 'COVER'>('CONTAIN');
  const [deviceChoice, setDeviceChoice] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setScreenList(null); setDiagnosticId(''); setError('');
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
    if (!writable || busy || editorOpen || mode !== 'enabled' || !name.trim() || name.trim().length > 120) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.post<unknown>('/dooh/operational-screens', { name: name.trim(), orientation, fitMode });
      const newScreen = parseOperationalScreen(data);
      if (!newScreen || newScreen.name !== name.trim()) throw Error('Unexpected API response');
      setName(''); setCreateOpen(false); setPage(1); setReload(v => v + 1);
      setMessage('Tela criada. Ela pode ficar vazia até você conectar um aparelho e adicionar conteúdo.');
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  async function bindPlayer(screen: OperationalScreen) {
    const playerId = deviceChoice[screen.id];
    if (!writable || busy || editorOpen || !playerId || !players.some(p => p.id === playerId && p.lifecycleStatus === 'ACTIVE')) return;
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
      <p className="mt-1 text-sm text-gray-600">Conecte suas TVs, monitores ou totens e escolha o que será exibido.</p></div>
      <Button type="button" variant="outline" disabled={mode === 'loading' || busy || editorOpen} onClick={() => setReload(v => v + 1)}>Atualizar</Button>
    </div>
    {mode === 'loading' && <p role="status" className="text-sm text-gray-600">Carregando telas…</p>}
    {mode === 'error' && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {mode === 'enabled' && <>
      {writable && (screenList?.total !== 0 && !createOpen ? <Button type="button" variant="outline" disabled={busy || editorOpen} onClick={() => setCreateOpen(true)}>Adicionar outra tela</Button> : <form onSubmit={e => void createScreen(e)} className="space-y-3 rounded-lg bg-indigo-50 p-4">
        <h3 className="font-semibold text-gray-900">Adicionar tela</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span>Nome da tela</span><input className="w-full rounded-md border border-gray-300 bg-white p-2" placeholder="Ex.: TV da recepção" value={name} required aria-describedby="ux12-screen-name-help" maxLength={120} onChange={e => setName(e.target.value)} disabled={!writable || busy || editorOpen} /></label>
          <label className="space-y-1 text-sm"><span>Posição</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={orientation} onChange={e => setOrientation(e.target.value as 'LANDSCAPE' | 'PORTRAIT')} disabled={!writable || busy || editorOpen}><option value="LANDSCAPE">Horizontal</option><option value="PORTRAIT">Vertical</option></select></label>
          <label className="space-y-1 text-sm"><span>Preferência de ajuste</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={fitMode} onChange={e => setFitMode(e.target.value as 'CONTAIN' | 'COVER')} disabled={!writable || busy || editorOpen}><option value="CONTAIN">Mostrar inteira</option><option value="COVER">Preencher a tela (pode cortar)</option></select></label>
        </div>
        <p id="ux12-screen-name-help" className="text-xs text-gray-600">{name.trim() ? 'Use um nome que identifique o aparelho.' : 'Defina um nome para a tela, como TV da recepção.'}</p>
        <Button type="submit" disabled={!writable || busy || editorOpen || !name.trim()}>Criar minha tela</Button>
        {screenList?.total !== 0 && <Button type="button" variant="ghost" disabled={busy || editorOpen} onClick={() => setCreateOpen(false)}>Cancelar</Button>}
        <p className="text-xs text-gray-600">Você pode criar a tela agora e adicionar a mídia depois. A preferência de ajuste será usada pela programação quando integrada. Criar uma tela não consome licença de player.</p>
      </form>)}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {screenList?.total === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">{writable ? 'Nenhuma tela cadastrada. Comece pelo nome no formulário acima.' : 'Nenhuma tela cadastrada nesta empresa.'}</p>}
      {screenList && screenList.items.length > 0 && <div className="rounded-lg border p-3 text-sm space-y-2">
        <p><strong>{screenList.items.filter(s => screenOperationalSummary(s).attention).length}</strong> de {screenList.items.length} tela(s) desta página precisam de atenção ou conferência.</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={onlyAttention} disabled={busy || editorOpen} onChange={e=>{setOnlyAttention(e.target.checked);setDiagnosticId('');}} /> Mostrar somente telas que precisam de atenção</label>
        <p className="text-xs text-gray-600">Dados da última consulta; use Atualizar para conferir novamente. Sem contato recente, a exibição atual não pode ser confirmada.</p>
      </div>}
      {onlyAttention && screenList?.items.length && !screenList.items.some(s=>screenOperationalSummary(s).attention) ? <p className="text-sm text-gray-600">Nenhuma tela desta página sinalizada.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">{screenList?.items.filter(s=>!onlyAttention || screenOperationalSummary(s).attention || s.id===contentScreenId).map(screen => { const next = screen.player?.credentialActive === false ? { action: 'attention', text: 'Verifique a autorização do aparelho na área de diagnóstico.' } : screenNextStep(screen, writable); const summary = screenOperationalSummary(screen); return <article key={screen.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div><h3 className="font-semibold text-gray-900">{screen.name}</h3><p className="text-sm text-gray-600">{summary.connection}</p></div>
        <p className="text-xs text-gray-600">{screen.orientation === 'LANDSCAPE' ? 'Horizontal' : 'Vertical'} · {screen.fitMode === 'CONTAIN' ? 'Mostrar inteira' : 'Preencher a tela'}</p>
        <div className="rounded-md bg-gray-50 p-2 text-sm space-y-1">
          <p className="font-medium">{summary.programming}</p>
          {screen.player && <><p className="text-xs text-gray-600">Última comunicação: {screen.player.lastSeenAt && Number.isFinite(Date.parse(screen.player.lastSeenAt)) ? new Date(screen.player.lastSeenAt).toLocaleString('pt-BR') : 'Não informada'}</p>
          <p className="text-xs text-gray-600">Desejada: {screen.player.desiredManifestVersion === undefined ? 'Indisponível' : screen.player.desiredManifestVersion === '0' ? 'Nenhuma' : `v${screen.player.desiredManifestVersion}`} · Reportada: {screen.player.currentManifestVersion === undefined ? 'Indisponível' : screen.player.currentManifestVersion === '0' ? 'Nenhuma' : `v${screen.player.currentManifestVersion}`}</p></>}
        </div>
        <p className="text-sm text-indigo-900">{next.text}</p>
        {screen.player && !editorOpen && <Button type="button" variant="outline" aria-expanded={diagnosticId===screen.id} onClick={()=>setDiagnosticId(v=>v===screen.id?'':screen.id)}>{diagnosticId===screen.id?'Fechar diagnóstico':'Diagnóstico avançado'}</Button>}
        {diagnosticId===screen.id && companyId && !editorOpen && <DoohScreenDiagnostic key={`${companyId}:${screen.id}:${screen.playerId}`} companyId={companyId} screen={screen} />}

        {writable && !editorOpen && next.action === 'attention' && <Button type="button" disabled={busy} onClick={() => setReload(v => v + 1)}>Verificar situação</Button>}
        {writable && !editorOpen && <Button type="button" variant={next.action === 'content' ? 'default' : 'outline'} disabled={busy || mode !== 'enabled'} onClick={() => setContentScreenId(screen.id)}>{screen.status === 'WAITING_FOR_PROGRAMMING' ? 'Adicionar conteúdo' : 'Gerenciar conteúdo'}</Button>}
        {screen.player ? <p className="text-sm text-gray-700">Aparelho: <strong>{screen.player.name}</strong>{screen.commercialUnit ? ` · Inventário: ${screen.commercialUnit.label}` : ''}</p> : writable && !editorOpen ? <div className="space-y-2">
          <p className="text-sm text-gray-700">A tela ainda não tem um aparelho vinculado.</p>
          <Button type="button" variant={deviceChoice[screen.id] ? "outline" : "default"} disabled={busy} onClick={onConnect}>Conectar um novo aparelho</Button>
          <p className="text-xs text-gray-600">Não encontrou o aparelho? Pesquise pelo nome; o pareamento feito anteriormente permanece válido.</p>
          <form onSubmit={e => { e.preventDefault(); setPlayerQuery(playerQueryInput.trim()); }} className="flex gap-2">
            <input aria-label="Buscar aparelho pelo nome" placeholder="Nome do aparelho" className="min-w-0 flex-1 rounded-md border p-2 text-sm" value={playerQueryInput} maxLength={120} onChange={e => setPlayerQueryInput(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy}>Buscar</Button>
          </form>
          <label className="block space-y-1 text-sm"><span>Ou escolha um aparelho já pareado</span>
            <select className="w-full rounded-md border p-2" value={deviceChoice[screen.id] ?? ''} onChange={e => setDeviceChoice(v => ({...v,[screen.id]:e.target.value}))} disabled={!writable || busy || editorOpen}><option value="">Selecione o aparelho</option>{players.filter(player => player.lifecycleStatus === 'ACTIVE').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <Button type="button" variant={deviceChoice[screen.id] ? "default" : "outline"} disabled={!writable || busy || !deviceChoice[screen.id]} onClick={() => void bindPlayer(screen)}>Conectar aparelho à tela</Button>
        </div> : null}
      </article>})}</div>
      {contentScreenId && screenList?.items.some(screen => screen.id === contentScreenId) && <DoohScreenContentWizard key={contentScreenId} screen={screenList.items.find(screen => screen.id === contentScreenId)!} onClose={() => setContentScreenId('')} />}
      {screenList && <div className="flex items-center justify-between text-sm"><span>{screenList.total} tela(s) cadastrada(s) · página {screenList.page}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || editorOpen || page <= 1} onClick={() => setPage(n => Math.max(n - 1, 1))}>Anterior</Button><Button type="button" variant="outline" disabled={busy || editorOpen || page * 20 >= screenList.total} onClick={() => setPage(n => n + 1)}>Próxima</Button></div></div>}
      {!writable && <p className="text-xs text-gray-600">Somente leitura: sua permissão não permite cadastrar ou conectar aparelhos.</p>}
    </>}
  </section>;
}
