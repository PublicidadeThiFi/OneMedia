import type { OperationalScreen } from './doohOperationalScreenContract';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const version = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,18})$/.test(v) && BigInt(v) <= 9223372036854775807n;
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const nullableDate = (v: unknown): v is string | null => v === null || date(v);
export type ScreenDiagnostic = {
  observedAt: string;
  player: null | {
    lifecycleStatus: 'ACTIVE' | 'INACTIVE' | 'RETIRED'; lastSeenAt: string | null;
    currentManifestVersion: string; desiredManifestVersion: string; credentialActive: boolean;
    scheduleState: 'UNKNOWN' | 'OUTSIDE_WINDOW' | 'NO_MATCH' | 'READY';
    integrity: 'NOT_AVAILABLE' | 'INVALID' | 'VERIFIED_SERVER_PAYLOAD';
    window: { from: string; to: string } | null; manifestPublishedAt: string | null;
    lastEvent: { result: 'PLAYED' | 'FAILED' | 'INTERRUPTED' | 'OTHER'; receivedAt: string; startedAt: string } | null;
  };
};
export function parseScreenDiagnostic(raw: unknown, companyId: string, screen: OperationalScreen): ScreenDiagnostic | null {
  if (!object(raw) || !companyId || raw.companyId !== companyId || raw.screenId !== screen.id || raw.scope !== 'TECHNICAL_SNAPSHOT_ONLY' || !date(raw.observedAt)) return null;
  if (raw.player === null) return screen.playerId === null ? { observedAt: raw.observedAt, player: null } : null;
  const p = raw.player;
  if (!object(p) || !screen.playerId || p.id !== screen.playerId ||
      !['ACTIVE','INACTIVE','RETIRED'].includes(String(p.lifecycleStatus)) || !nullableDate(p.lastSeenAt) ||
      !version(p.currentManifestVersion) || !version(p.desiredManifestVersion) || typeof p.credentialActive !== 'boolean' ||
      !['UNKNOWN','OUTSIDE_WINDOW','NO_MATCH','READY'].includes(String(p.scheduleState)) ||
      !['NOT_AVAILABLE','INVALID','VERIFIED_SERVER_PAYLOAD'].includes(String(p.integrity)) || !nullableDate(p.manifestPublishedAt)) return null;
  let window: {from:string;to:string} | null = null;
  if (p.integrity === 'VERIFIED_SERVER_PAYLOAD') {
    if (!object(p.window) || !date(p.window.from) || !date(p.window.to) || Date.parse(p.window.to) <= Date.parse(p.window.from) ||
        Date.parse(p.window.to) - Date.parse(p.window.from) > 86400000 || p.currentManifestVersion === '0' || p.manifestPublishedAt === null || p.scheduleState === 'UNKNOWN') return null;
    const now = Date.parse(raw.observedAt), inside = Date.parse(p.window.from) <= now && now < Date.parse(p.window.to);
    if (inside === (p.scheduleState === 'OUTSIDE_WINDOW')) return null;
    window = { from: p.window.from, to: p.window.to };
  } else if (p.window !== null || p.scheduleState !== 'UNKNOWN') return null;
  let lastEvent: NonNullable<ScreenDiagnostic['player']>['lastEvent'] = null;
  if (p.lastEvent !== null) {
    const e = p.lastEvent;
    if (!object(e) || !['PLAYED','FAILED','INTERRUPTED','OTHER'].includes(String(e.result)) || !date(e.receivedAt) || !date(e.startedAt)) return null;
    lastEvent = { result: e.result as NonNullable<NonNullable<ScreenDiagnostic['player']>['lastEvent']>['result'], receivedAt:e.receivedAt,startedAt:e.startedAt };
  }
  type Player = NonNullable<ScreenDiagnostic['player']>;
  return { observedAt: raw.observedAt, player: { lifecycleStatus: p.lifecycleStatus as Player['lifecycleStatus'], lastSeenAt:p.lastSeenAt,
    currentManifestVersion:p.currentManifestVersion, desiredManifestVersion:p.desiredManifestVersion, credentialActive:p.credentialActive,
    scheduleState:p.scheduleState as Player['scheduleState'], integrity:p.integrity as Player['integrity'], window, manifestPublishedAt:p.manifestPublishedAt,lastEvent } };
}
export function screenOperationalSummary(screen: OperationalScreen) {
  const p = screen.player;
  const current = p?.currentManifestVersion, desired = p?.desiredManifestVersion;
  const connection = !p ? 'Sem aparelho vinculado' : p.lifecycleStatus !== 'ACTIVE' ? 'Dispositivo inativo' : p.credentialActive === false ? 'Autorização do aparelho indisponível' : screen.status === 'NO_RECENT_CONTACT' ? 'Sem contato recente' : 'Contato recente na última consulta';
  const programming = !p ? 'Sem aparelho' : current === undefined || desired === undefined ? 'Versões indisponíveis' : BigInt(current) > BigInt(desired) ? 'Divergência de versões' : current !== desired ? 'Aguardando atualização' : current === '0' ? 'Aguardando programação' : 'Programação instalada informada';
  const attention = !p || p.lifecycleStatus !== 'ACTIVE' || p.credentialActive === false || screen.status === 'NO_RECENT_CONTACT' || current === undefined || desired === undefined || current !== desired || current === '0';
  return { connection, programming, attention };
}
export function diagnosticScheduleText(p: NonNullable<ScreenDiagnostic['player']>) {
  if (p.integrity === 'INVALID') return 'Programação registrada inconsistente. Solicite suporte.';
  if (p.scheduleState === 'NO_MATCH') return 'Fora do horário de exibição na versão reportada.';
  if (p.scheduleState === 'OUTSIDE_WINDOW') return 'Fora da janela registrada; verifique a atualização.';
  if (p.scheduleState === 'READY') return 'Conteúdo previsto para este horário na versão reportada.';
  return 'Horário de exibição não confirmado.';
}
