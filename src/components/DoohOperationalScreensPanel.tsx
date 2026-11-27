import { useEffect, useState, type FormEvent } from 'react';
import { doohFriendlyDate, doohFullDate } from '../lib/doohFriendlyDate';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { screenNextStep } from '../lib/doohJourneyGuidance';
import { screenAwaitingDeviceConnection, screenNeedsAttention, screenOperationalSummary, screenStatusBadge, type ScreenBadgeTone } from '../lib/doohScreenDiagnosticContract';
import { DoohScreenNowLine } from './DoohScreenNowLine';
import { DOOH_SECTION_PATHS } from '../lib/productNavigation';
import { DoohScreenDiagnostic } from './DoohScreenDiagnostic';
import { Button } from './ui/button';
import { DoohContextualPairing } from './DoohContextualPairing';
import { isUuidV4 } from '../lib/doohPlayerPairingContract';
import { DoohScreenContentWizard } from './DoohScreenContentWizard';
import { DoohArchivedScreens } from './DoohArchivedScreens';
import { DoohScreenTimeline } from './DoohScreenTimeline';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';
import { friendlyOperationalScreenError, playerErrorText, parseOperationalScreen, parseOperationalScreenPage,
  type OperationalScreen } from '../lib/doohOperationalScreenContract';

const BADGE_CLASS: Record<ScreenBadgeTone, string> = { ok: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200', warn: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200', error: 'bg-red-50 text-red-800 ring-1 ring-red-200', info: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200', muted: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' };
const BADGE_DOT: Record<ScreenBadgeTone, string> = { ok: 'bg-emerald-500', warn: 'bg-amber-500', error: 'bg-red-500', info: 'bg-indigo-500', muted: 'bg-gray-400' };
const MENU_ITEM = 'block w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none';

/** Tenant-scoped screens: create, connect, edit, disconnect and program each screen. */
type OperationalScreensProps = { initialMediaId?: string; contentOnly?: boolean; attentionOnly?: boolean };

export function DoohOperationalScreensPanel({ initialMediaId, contentOnly, attentionOnly }: OperationalScreensProps) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const key = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted, snapshot?.modules.DOOH.accessMode, [...(user?.roles ?? [])].sort()]);
  return <OperationalScreensForContext key={key} initialMediaId={initialMediaId} contentOnly={contentOnly} attentionOnly={attentionOnly} />;
}
function OperationalScreensForContext({ initialMediaId, contentOnly, attentionOnly }: OperationalScreensProps) {
  // F13: the home only lists the screens that need attention, so it reads one larger page.
  const pageSize = attentionOnly ? 100 : 20;
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
  const [pairScreenId, setPairScreenId] = useState('');
  const [preferredMediaId, setPreferredMediaId] = useState(isUuidV4(initialMediaId) ? initialMediaId : '');
  const [name, setName] = useState('');
  const [locationLabel,setLocationLabel] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const editorOpen = Boolean(contentScreenId || pairScreenId);
  const [orientation, setOrientation] = useState<'LANDSCAPE' | 'PORTRAIT'>('LANDSCAPE');
  const [fitMode, setFitMode] = useState<'CONTAIN' | 'COVER'>('CONTAIN');
  const [deviceChoice, setDeviceChoice] = useState<Record<string, string>>({});
  // F12: rename and disconnect on the card itself (no separate "manage devices" area).
  const [editId, setEditId] = useState('');
  const [editDraft, setEditDraft] = useState<{ name: string; locationLabel: string; orientation: 'LANDSCAPE' | 'PORTRAIT'; fitMode: 'CONTAIN' | 'COVER' }>({ name: '', locationLabel: '', orientation: 'LANDSCAPE', fitMode: 'CONTAIN' });
  const [unbindId, setUnbindId] = useState('');
  const [archiveId, setArchiveId] = useState('');
  const [menuId, setMenuId] = useState('');
  // F13: the "Mais opções" menu closes on Escape or on any click outside it.
  useEffect(() => {
    if (!menuId) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && event.target instanceof Element && event.target.closest('[data-screen-menu]')) return;
      setMenuId('');
    };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menuId]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // F11: keep installation/playback state current without manual reloads. Silent refresh of
  // the screen list only, paused while the tab is hidden. It keeps running while the content
  // editor is open (the editor is keyed by screen id), so the card right above it stays current.
  useEffect(() => {
    if (!available || mode !== 'enabled') return;
    const timer = window.setInterval(() => {
      if (document.hidden || busy) return;
      void apiClient.get<unknown>('/dooh/operational-screens', { params: { page, pageSize } }).then(screens => {
        const parsed = parseOperationalScreenPage(screens.data);
        if (parsed) setScreenList({ items: parsed.items, total: parsed.meta.total, page: parsed.meta.page });
      }).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [available, mode, busy, page, pageSize]);
  useEffect(() => {
    setScreenList(null); setDiagnosticId(''); setError('');
    if (!available) { setMode('disabled'); return; }
    const controller = new AbortController();
    setMode('loading');
    void Promise.all([
      apiClient.get<unknown>('/dooh/operational-screens', { params: { page, pageSize }, signal: controller.signal }),
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
      else { setMode('error'); setError('Não foi possível carregar as telas. Tente novamente em instantes.'); }
    });
    return () => controller.abort();
  }, [available, page, pageSize, reload, playerQuery]);
  // F12: the old pilot screens are gone; a company without the module sees one plain sentence.
  if (!available || mode === 'disabled') return <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
    As telas digitais ainda não estão liberadas para a sua empresa ou para o seu perfil. Fale com a OneMedia.
  </section>;
  async function createScreen(e: FormEvent) {
    e.preventDefault();
    if (!writable || busy || editorOpen || mode !== 'enabled' || !name.trim() || name.trim().length > 120) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.post<unknown>('/dooh/operational-screens', { name: name.trim(), orientation, fitMode, ...(locationLabel.trim()?{locationLabel:locationLabel.trim()}: {}) });
      const newScreen = parseOperationalScreen(data);
      if (!newScreen || newScreen.name !== name.trim()) throw Error('Unexpected API response');
      setName(''); setLocationLabel(''); setCreateOpen(false); setPage(1); setReload(v => v + 1);
      setMessage('Tela criada. Ela pode ficar vazia até você conectar um aparelho e adicionar conteúdo.');
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  function startEdit(screen: OperationalScreen) {
    setUnbindId(''); setError(''); setMessage('');
    setEditDraft({ name: screen.name, locationLabel: screen.locationLabel ?? '', orientation: screen.orientation, fitMode: screen.fitMode });
    setEditId(screen.id);
  }
  async function saveScreen(e: FormEvent, screen: OperationalScreen) {
    e.preventDefault();
    const nextName = editDraft.name.trim();
    if (!writable || busy || !nextName || nextName.length > 120 || editDraft.locationLabel.length > 160) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.patch<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}`, {
        name: nextName, orientation: editDraft.orientation, fitMode: editDraft.fitMode,
        locationLabel: editDraft.locationLabel.trim() ? editDraft.locationLabel.trim() : null });
      const result = parseOperationalScreen(data);
      if (!result || result.id !== screen.id || result.name !== nextName) throw Error('Unexpected API response');
      setScreenList(prev => prev && ({...prev, items: prev.items.map(item => item.id === result.id ? result : item)}));
      setEditId(''); setMessage(`Tela “${result.name}” atualizada.`);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  async function unbindPlayer(screen: OperationalScreen) {
    if (!writable || busy || !screen.playerId) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.delete<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/player`);
      const result = parseOperationalScreen(data);
      if (!result || result.id !== screen.id || result.playerId) throw Error('Unexpected API response');
      setScreenList(prev => prev && ({...prev, items: prev.items.map(item => item.id === result.id ? result : item)}));
      setUnbindId(''); setMessage(`Aparelho desconectado da tela “${result.name}”. Ele pode ser conectado a outra tela.`);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  // F12: only an empty screen (no device, no Marketplace link) can be archived; the server checks it again.
  async function archiveScreen(screen: OperationalScreen) {
    if (!writable || busy || screen.playerId || screen.commercialUnit) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/archive`);
      const result = parseOperationalScreen(data);
      if (!result || result.id !== screen.id || !result.archivedAt) throw Error('Unexpected API response');
      setArchiveId(''); setMessage(`Tela “${result.name}” arquivada. Ela aparece em Telas arquivadas, onde pode ser restaurada.`);
      setReload(v => v + 1);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  async function bindPlayer(screen: OperationalScreen) {
    const playerId = deviceChoice[screen.id];
    if (!writable || busy || editorOpen || !playerId || !players.some(p => p.id === playerId && p.lifecycleStatus === 'ACTIVE' && (!p.currentAssignment || screen.commercialUnit?.id === p.currentAssignment.mediaUnit.id))) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await apiClient.put<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/player`, { playerId });
      const result = parseOperationalScreen(data);
      if (!result || result.id !== screen.id || result.playerId !== playerId) throw Error('Unexpected API response');
      setMessage(`Dispositivo associado à tela “${screen.name}”. Agora escolha o conteúdo.`);
      setScreenList(prev => prev && ({...prev,items:prev.items.map(item=>item.id===result.id?result:item)}));
      setContentScreenId(result.id);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }
  if (attentionOnly) {
    const needing = screenList?.items.filter(screenNeedsAttention) ?? [];
    return <section aria-label="Telas que precisam de atenção" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900">Precisa de atenção</h2>
        <a href={DOOH_SECTION_PATHS.screens} className="text-sm font-medium text-indigo-700 hover:underline">Ver todas as telas</a>
      </div>
      {mode === 'loading' && <p role="status" className="text-sm text-gray-600">Carregando telas…</p>}
      {mode === 'error' && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {mode === 'enabled' && screenList?.total === 0 && <p className="text-sm text-gray-600">Você ainda não tem telas. Comece em <a className="font-medium text-indigo-700 hover:underline" href={`${DOOH_SECTION_PATHS.screens}?ux=connect`}>Telas</a>.</p>}
      {mode === 'enabled' && screenList?.total !== 0 && needing.length === 0 && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Tudo certo: nenhuma tela precisa de atenção agora.</p>}
      {needing.length > 0 && <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {needing.map(screen => { const badge = screenStatusBadge(screen); const next = screenNextStep(screen, writable); return <li key={screen.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
          <span className="min-w-[220px] flex-1"><span className="block truncate font-medium text-gray-900">{screen.name}</span><span className="block text-sm text-gray-600">{next.text}</span></span>
          <span data-tone={badge.tone} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_CLASS[badge.tone]}`}><span aria-hidden="true" className={`size-2 rounded-full ${BADGE_DOT[badge.tone]}`} />{badge.label}</span>
          <a href={DOOH_SECTION_PATHS.screens} className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">Abrir</a>
        </li>; })}
      </ul>}
    </section>;
  }
  return <section aria-label="Telas operacionais" className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="text-lg font-bold text-gray-900">{contentOnly ? "Escolha a tela para programar" : "Minhas telas"}</h2>
      <div className="flex flex-wrap gap-2">
        {mode === 'enabled' && writable && !contentOnly && screenList?.total !== 0 && !createOpen && <Button type="button" disabled={busy || editorOpen} onClick={() => setCreateOpen(true)}>Adicionar tela</Button>}
        <Button type="button" variant="outline" disabled={mode === 'loading' || busy || editorOpen} onClick={() => setReload(v => v + 1)}>Atualizar</Button>
      </div>
    </div>
    {mode === 'loading' && <p role="status" className="text-sm text-gray-600">Carregando telas…</p>}
    {mode === 'error' && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {mode === 'enabled' && <>
      {preferredMediaId && <p role="status" className="rounded-lg bg-indigo-50 p-3 text-sm">Escolha a tela onde deseja usar a mídia selecionada.</p>}
      {writable && (screenList?.total !== 0 && !createOpen ? null : <form onSubmit={e => void createScreen(e)} className="space-y-3 rounded-lg bg-indigo-50 p-4">
        <h3 className="font-semibold text-gray-900">Adicionar tela</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span>Nome da tela</span><input className="w-full rounded-md border border-gray-300 bg-white p-2" placeholder="Ex.: TV da recepção" value={name} required aria-describedby="ux12-screen-name-help" maxLength={120} onChange={e => setName(e.target.value)} disabled={!writable || busy || editorOpen} /></label>
          <label className="space-y-1 text-sm"><span>Posição</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={orientation} onChange={e => setOrientation(e.target.value as 'LANDSCAPE' | 'PORTRAIT')} disabled={!writable || busy || editorOpen}><option value="LANDSCAPE">Horizontal</option><option value="PORTRAIT">Vertical</option></select></label>
          <label className="space-y-1 text-sm"><span>Preferência de ajuste</span><select className="w-full rounded-md border border-gray-300 bg-white p-2" value={fitMode} onChange={e => setFitMode(e.target.value as 'CONTAIN' | 'COVER')} disabled={!writable || busy || editorOpen}><option value="CONTAIN">Mostrar inteira</option><option value="COVER">Preencher a tela (pode cortar)</option></select></label>
        </div>
        <details className="text-sm"><summary className="cursor-pointer">Local físico (opcional)</summary><label className="block mt-2">Nome do local<input value={locationLabel} maxLength={160} disabled={busy || editorOpen} onChange={e=>setLocationLabel(e.target.value)} className="block w-full rounded-md border bg-white p-2" placeholder="Ex.: recepção" /></label></details>
        <p id="ux12-screen-name-help" className="text-xs text-gray-600">{name.trim() ? 'Use um nome que identifique o aparelho.' : 'Defina um nome para a tela, como TV da recepção.'}</p>
        <Button type="submit" disabled={!writable || busy || editorOpen || !name.trim()}>Criar minha tela</Button>
        {screenList?.total !== 0 && <Button type="button" variant="ghost" disabled={busy || editorOpen} onClick={() => setCreateOpen(false)}>Cancelar</Button>}
        <p className="text-xs text-gray-600">Você pode criar a tela agora e adicionar a mídia depois. Criar uma tela não consome licença de player.</p>
      </form>)}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {screenList?.total === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">{writable ? 'Nenhuma tela cadastrada. Comece pelo nome no formulário acima.' : 'Nenhuma tela cadastrada nesta empresa.'}</p>}
      {screenList && screenList.items.length > 0 && (() => { const attentionCount = screenList.items.filter(s => screenNeedsAttention(s)).length; return <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-gray-700">{attentionCount === 0 ? 'Nenhuma tela precisa de atenção.' : <><strong>{attentionCount}</strong> de {screenList.items.length} {screenList.items.length === 1 ? 'tela precisa' : 'telas precisam'} de atenção.</>} <span className="text-xs text-gray-500">Atualiza sozinho a cada 20 segundos.</span></p>
        {attentionCount > 0 && <Button type="button" size="sm" variant={onlyAttention ? 'default' : 'outline'} aria-pressed={onlyAttention} disabled={busy || editorOpen} onClick={() => { setOnlyAttention(v => !v); setDiagnosticId(''); }}>{onlyAttention ? 'Mostrar todas' : 'Só com problema'}</Button>}
      </div>; })()}
      {onlyAttention && screenList?.items.length && !screenList.items.some(s=>screenNeedsAttention(s)) ? <p className="text-sm text-gray-600">Nenhuma tela desta página sinalizada.</p> : null}
      <div className={contentOnly ? "grid gap-2" : "grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"}>{screenList?.items.filter(s=>!onlyAttention || screenNeedsAttention(s) || s.id===contentScreenId || s.id===pairScreenId).map(screen => { const next = screenAwaitingDeviceConnection(screen) ? { action: 'wait', text: 'O aparelho está concluindo a conexão. Isso leva alguns segundos com a tela do Player aberta.' } : screen.player?.credentialActive === false ? { action: 'attention', text: 'Verifique a autorização do aparelho na área de diagnóstico.' } : screenNextStep(screen, writable); const summary = screenOperationalSummary(screen); const badge = screenStatusBadge(screen); const showDevice = screen.player && (screen.player.name !== screen.name || screen.commercialUnit); const lastSeen = screen.player?.lastSeenAt && Number.isFinite(Date.parse(screen.player.lastSeenAt)) ? screen.player.lastSeenAt : '';
        // F13: Programação › Por tela is for programming only: one compact row per screen.
        if (contentOnly) return <article key={screen.id} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 truncate font-semibold text-gray-900">{screen.name}</h3>
              <span data-tone={badge.tone} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[badge.tone]}`}><span aria-hidden="true" className={`size-2 rounded-full ${BADGE_DOT[badge.tone]}`} />{badge.label}</span></div>
            {screen.player ? <DoohScreenNowLine screenId={screen.id} versionKey={`${screen.playerId}:${screen.player.currentManifestVersion ?? ''}`} /> : <p className="text-sm text-gray-600">Sem aparelho: você pode preparar o conteúdo agora.</p>}
          </div>
          {writable && !editorOpen && <Button type="button" variant={screen.player ? 'default' : 'outline'} disabled={busy || mode !== 'enabled'} onClick={() => setContentScreenId(screen.id)}>{preferredMediaId ? 'Usar mídia nesta tela' : 'Editar programação'}</Button>}
        </article>;
        return <article key={screen.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{screen.name}</h3>
            <p className="text-xs text-gray-500">{screen.orientation === 'LANDSCAPE' ? 'Horizontal' : 'Vertical'} · {screen.fitMode === 'CONTAIN' ? 'Mostrar inteira' : 'Preencher a tela'}{screen.locationLabel ? ` · ${screen.locationLabel}` : ''}</p></div>
          <span data-tone={badge.tone} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_CLASS[badge.tone]}`}><span aria-hidden="true" className={`size-2 rounded-full ${BADGE_DOT[badge.tone]}`} />{badge.label}</span>
        </div>
        {screen.player && <div className="space-y-0.5 text-sm">
          {summary.programming !== badge.label && <p className="text-gray-800">{summary.programming}</p>}
          {lastSeen && <p className="text-xs text-gray-500">Última comunicação: <time dateTime={lastSeen} title={doohFullDate(lastSeen)}>{doohFriendlyDate(lastSeen)}</time></p>}
          {screen.status === 'INSTALL_FAILED' && playerErrorText(screen.player.runtime?.lastErrorCode) && <p role="alert" className="text-xs text-red-700">{playerErrorText(screen.player.runtime?.lastErrorCode)}</p>}
        </div>}
        <p className={next.action === 'attention' ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900' : 'text-sm text-gray-600'}>{next.text}</p>
        {screen.player && !editorOpen && <DoohScreenTimeline screenId={screen.id} versionKey={`${screen.playerId}:${screen.player.currentManifestVersion ?? ''}`} />}
        {diagnosticId===screen.id && companyId && !editorOpen && <div className="space-y-2"><DoohScreenDiagnostic key={`${companyId}:${screen.id}:${screen.playerId}`} companyId={companyId} screen={screen} /><Button type="button" size="sm" variant="ghost" onClick={()=>setDiagnosticId('')}>Fechar diagnóstico</Button></div>}
        {!editorOpen && <div className="flex flex-wrap items-center gap-2">
          {writable && <Button type="button" variant={screen.player ? 'default' : 'outline'} disabled={busy || mode !== 'enabled'} onClick={() => setContentScreenId(screen.id)}>{preferredMediaId ? 'Usar mídia nesta tela' : screen.status === 'WAITING_FOR_PROGRAMMING' ? 'Adicionar conteúdo' : 'Gerenciar conteúdo'}</Button>}
          {next.action === 'attention' && <Button type="button" variant="outline" disabled={busy} onClick={() => setReload(v => v + 1)}>Atualizar situação</Button>}
          {(screen.player || (writable && editId !== screen.id)) && <div className="relative ml-auto" data-screen-menu>
            <Button type="button" variant="ghost" aria-haspopup="menu" aria-expanded={menuId === screen.id} aria-label={`Mais opções de ${screen.name}`} disabled={busy} onClick={() => setMenuId(v => v === screen.id ? '' : screen.id)}>Mais opções ⋯</Button>
            {menuId === screen.id && <div role="menu" className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              {screen.player && <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuId(''); setDiagnosticId(v => v === screen.id ? '' : screen.id); }}>{diagnosticId === screen.id ? 'Fechar diagnóstico' : 'Diagnóstico'}</button>}
              {writable && <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuId(''); startEdit(screen); }}>Editar tela</button>}
              {writable && screen.player && <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuId(''); setEditId(''); setArchiveId(''); setUnbindId(screen.id); }}>Desconectar aparelho</button>}
              {writable && !screen.player && !screen.commercialUnit && <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuId(''); setEditId(''); setUnbindId(''); setArchiveId(screen.id); }}>Arquivar tela</button>}
            </div>}
          </div>}
        </div>}
        {pairScreenId === screen.id && <DoohContextualPairing key={screen.id} screen={screen} writable={writable} onClose={() => { setPairScreenId(''); setReload(v=>v+1); }} onLinked={linked => { setPairScreenId(''); setScreenList(prev => prev && ({...prev, items: prev.items.map(item => item.id === linked.id ? linked : item)})); setMessage(`Aparelho conectado à tela “${linked.name}”. Agora escolha o conteúdo.`); setContentScreenId(linked.id); }} />}
        {writable && !editorOpen && archiveId === screen.id && !screen.player && !screen.commercialUnit && <div role="alertdialog" aria-label="Confirmar arquivamento" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>Arquivar <strong>{screen.name}</strong>? Ela sai desta lista e das contagens. O histórico é mantido e você pode restaurá-la em Telas arquivadas.</p>
          <div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => void archiveScreen(screen)}>Arquivar</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setArchiveId('')}>Cancelar</Button></div>
        </div>}
        {writable && !editorOpen && editId === screen.id && <form onSubmit={e => void saveScreen(e, screen)} className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm" aria-label={`Editar ${screen.name}`}>
          <label className="block space-y-1"><span>Nome da tela</span><input className="w-full rounded-md border bg-white p-2" value={editDraft.name} maxLength={120} required onChange={e => setEditDraft(v => ({...v, name: e.target.value}))} disabled={busy} /></label>
          <label className="block space-y-1"><span>Local (opcional)</span><input className="w-full rounded-md border bg-white p-2" value={editDraft.locationLabel} maxLength={160} onChange={e => setEditDraft(v => ({...v, locationLabel: e.target.value}))} disabled={busy} /></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1"><span>Posição</span><select className="w-full rounded-md border bg-white p-2" value={editDraft.orientation} onChange={e => setEditDraft(v => ({...v, orientation: e.target.value as 'LANDSCAPE' | 'PORTRAIT'}))} disabled={busy}><option value="LANDSCAPE">Horizontal</option><option value="PORTRAIT">Vertical</option></select></label>
            <label className="space-y-1"><span>Ajuste</span><select className="w-full rounded-md border bg-white p-2" value={editDraft.fitMode} onChange={e => setEditDraft(v => ({...v, fitMode: e.target.value as 'CONTAIN' | 'COVER'}))} disabled={busy}><option value="CONTAIN">Mostrar inteira</option><option value="COVER">Preencher a tela (pode cortar)</option></select></label>
          </div>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !editDraft.name.trim()}>Salvar</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setEditId('')}>Cancelar</Button></div>
        </form>}
        {writable && !editorOpen && unbindId === screen.id && screen.player && <div role="alertdialog" aria-label="Confirmar desconexão" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>Desconectar <strong>{screen.player.name}</strong> desta tela? O aparelho continua pareado à empresa e pode ser conectado a outra tela. A programação desta tela não é apagada.</p>
          <div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => void unbindPlayer(screen)}>Desconectar</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setUnbindId('')}>Cancelar</Button></div>
        </div>}
        {screen.player ? (showDevice && <p className="text-xs text-gray-500">Aparelho: <span className="font-medium text-gray-700">{screen.player.name}</span>{screen.commercialUnit ? ` · Inventário: ${screen.commercialUnit.label}` : ''}</p>) : writable && !editorOpen ? <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
          <Button type="button" variant={deviceChoice[screen.id] ? "outline" : "default"} disabled={busy} onClick={() => setPairScreenId(screen.id)}>Conectar um novo aparelho</Button>
          <details className="text-sm"><summary className="cursor-pointer text-gray-700">Usar um aparelho já pareado</summary><div className="mt-2 space-y-2">
          <form onSubmit={e => { e.preventDefault(); setPlayerQuery(playerQueryInput.trim()); }} className="flex gap-2">
            <input aria-label="Buscar aparelho pelo nome" placeholder="Nome do aparelho" className="min-w-0 flex-1 rounded-md border p-2 text-sm" value={playerQueryInput} maxLength={120} onChange={e => setPlayerQueryInput(e.target.value)} />
            <Button type="submit" variant="outline" disabled={busy}>Buscar</Button>
          </form>
          <label className="block space-y-1 text-sm"><span>Ou escolha um aparelho já pareado</span>
            <select className="w-full rounded-md border p-2" value={deviceChoice[screen.id] ?? ''} onChange={e => setDeviceChoice(v => ({...v,[screen.id]:e.target.value}))} disabled={!writable || busy || editorOpen}><option value="">Selecione o aparelho</option>{players.filter(player => player.lifecycleStatus === 'ACTIVE' && (!player.currentAssignment || screen.commercialUnit?.id === player.currentAssignment.mediaUnit.id) && !screenList?.items.some(other => other.id !== screen.id && other.playerId === player.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <Button type="button" variant={deviceChoice[screen.id] ? "default" : "outline"} disabled={!writable || busy || !deviceChoice[screen.id] || !players.some(p=>p.id===deviceChoice[screen.id])} onClick={() => void bindPlayer(screen)}>Conectar aparelho à tela</Button>
          </div></details>
        </div> : null}
      </article>})}</div>
      {contentScreenId && screenList?.items.some(screen => screen.id === contentScreenId) && <DoohScreenContentWizard key={contentScreenId} screen={screenList.items.find(screen => screen.id === contentScreenId)!} initialMediaId={preferredMediaId} onClose={() => {setContentScreenId('');setPreferredMediaId('');setReload(v=>v+1);}} />}
      {screenList && <div className="flex items-center justify-between text-sm"><span>{screenList.total} tela(s) cadastrada(s) · página {screenList.page}</span><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || editorOpen || page <= 1} onClick={() => setPage(n => Math.max(n - 1, 1))}>Anterior</Button><Button type="button" variant="outline" disabled={busy || editorOpen || page * 20 >= screenList.total} onClick={() => setPage(n => n + 1)}>Próxima</Button></div></div>}
      {!contentOnly && <DoohArchivedScreens key={reload} writable={writable} disabled={busy || editorOpen} onRestored={restored => { setMessage(`Tela “${restored.name}” restaurada.`); setReload(v => v + 1); }} />}
      {!writable && <p className="text-xs text-gray-600">Somente leitura: sua permissão não permite cadastrar ou conectar aparelhos.</p>}
    </>}
  </section>;
}
