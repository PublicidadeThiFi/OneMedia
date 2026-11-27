import type { OperationalScreen } from './doohOperationalScreenContract';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const version = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,18})$/.test(v) && BigInt(v) <= 9223372036854775807n;
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const nullableDate = (v: unknown): v is string | null => v === null || date(v);
export type ScreenLicenseDiagnostic = {
  granted: boolean; accessMode: 'FULL' | 'READ_ONLY' | 'NONE'; reason: string;
  commercialDeadline: 'DATED' | 'EXEMPT' | 'UNKNOWN'; commercialValidUntil: string | null;
  offlineMaximumSeconds: 86400; offlineConfiguredSeconds: number | null; offlineAuthorizationState: 'UNKNOWN';
};
const licenseReasons = ['ACTIVE_SUBSCRIPTION','TRIAL_ACTIVE','TRIAL_EXEMPT','GRACE_PERIOD','CANCELED_ACCESS_UNTIL_END','TRIAL_EXPIRED','PAST_DUE','CANCELED','NO_SUBSCRIPTION','MODULE_NOT_GRANTED','ENTITLEMENT_CONFLICT','LEGACY_COMPATIBILITY'];
export function parseScreenLicense(raw: unknown): ScreenLicenseDiagnostic | null {
  if (!object(raw) || typeof raw.granted !== 'boolean' || typeof raw.accessMode !== 'string' || !['FULL','READ_ONLY','NONE'].includes(raw.accessMode) || typeof raw.reason !== 'string' || !licenseReasons.includes(raw.reason) || typeof raw.commercialDeadline !== 'string' || !['DATED','EXEMPT','UNKNOWN'].includes(raw.commercialDeadline) || !nullableDate(raw.commercialValidUntil) || raw.offlineMaximumSeconds !== 86400 || raw.offlineAuthorizationState !== 'UNKNOWN') return null;
  const seconds = raw.offlineConfiguredSeconds;
  if (seconds !== null && (typeof seconds !== 'number' || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 86400)) return null;
  if ((raw.commercialDeadline === 'DATED') !== (raw.commercialValidUntil !== null)) return null;
  if (raw.commercialDeadline !== 'UNKNOWN' && (!raw.granted || raw.accessMode !== 'FULL')) return null;
  if (raw.commercialDeadline === 'EXEMPT' && raw.reason !== 'TRIAL_EXEMPT') return null;
  return { granted:raw.granted, accessMode:raw.accessMode as ScreenLicenseDiagnostic['accessMode'], reason:raw.reason, commercialDeadline:raw.commercialDeadline as ScreenLicenseDiagnostic['commercialDeadline'], commercialValidUntil:raw.commercialValidUntil, offlineMaximumSeconds:86400, offlineConfiguredSeconds:seconds, offlineAuthorizationState:'UNKNOWN' };
}
export type ScreenDiagnostic = {
  observedAt: string;
  player: null | {
    lifecycleStatus: 'ACTIVE' | 'INACTIVE' | 'RETIRED'; lastSeenAt: string | null;
    currentManifestVersion: string; desiredManifestVersion: string; credentialActive: boolean;
    scheduleState: 'UNKNOWN' | 'OUTSIDE_WINDOW' | 'NO_MATCH' | 'READY';
    integrity: 'NOT_AVAILABLE' | 'INVALID' | 'VERIFIED_SERVER_PAYLOAD';
    window: { from: string; to: string } | null; manifestPublishedAt: string | null;
    license: ScreenLicenseDiagnostic | null;
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
    scheduleState:p.scheduleState as Player['scheduleState'], integrity:p.integrity as Player['integrity'], window, manifestPublishedAt:p.manifestPublishedAt,license:parseScreenLicense(p.license),lastEvent } };
}
/** Code accepted in the panel, device has not finished its side yet (no credential, never seen). Transient. */
export function screenAwaitingDeviceConnection(screen: OperationalScreen): boolean {
  const p = screen.player;
  return !!p && p.lifecycleStatus === 'ACTIVE' && p.credentialActive === false && !p.lastSeenAt;
}
function sinceText(lastSeenAt: string | null | undefined): string {
  const t = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
  if (!Number.isFinite(t)) return '';
  const minutes = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (minutes < 60) return ` há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? ` há ${hours} h` : ` há ${Math.round(hours / 24)} dias`;
}
export function screenOperationalSummary(screen: OperationalScreen) {
  const p = screen.player;
  const current = p?.currentManifestVersion, desired = p?.desiredManifestVersion;
  const connecting = screenAwaitingDeviceConnection(screen);
  const silent = screen.status === 'NO_RECENT_CONTACT';
  // F12: plain words. "Sem conexão há X" uses the device's last contact reported by the server.
  const connection = !p ? 'Sem aparelho' : p.lifecycleStatus !== 'ACTIVE' ? 'Aparelho desativado' : connecting ? 'Concluindo a conexão do aparelho' : p.credentialActive === false ? 'O aparelho precisa ser conectado de novo' : silent ? `Sem conexão${sinceText(p.lastSeenAt)}` : 'Conectada';
  // Without recent contact nothing is "being installed": the new version waits for the device to come back.
  const programming = !p ? 'Sem aparelho' : connecting ? 'Aguardando o aparelho' : screen.status === 'PLAYING' ? 'Em exibição' : screen.status === 'INSTALL_FAILED' ? 'Falha ao instalar a programação' : current === undefined || desired === undefined ? 'Situação indisponível' : BigInt(current) > BigInt(desired) ? 'Precisa de suporte: versões divergentes' : current !== desired ? (silent ? 'Nova programação aguardando a TV voltar' : 'Instalando a nova programação') : current === '0' ? 'Sem conteúdo publicado' : silent ? 'Sem conexão agora; última programação instalada' : 'Programação instalada, fora de exibição';
  const attention = !connecting && (!p || p.lifecycleStatus !== 'ACTIVE' || p.credentialActive === false || silent || screen.status === 'INSTALL_FAILED' || current === undefined || desired === undefined || current === '0' || (current !== desired && screen.status !== 'UPDATE_PENDING'));
  return { connection, programming, attention };
}
export function diagnosticScheduleText(p: NonNullable<ScreenDiagnostic['player']>) {
  if (p.integrity === 'INVALID') return 'Programação registrada inconsistente. Solicite suporte.';
  if (p.scheduleState === 'NO_MATCH') return 'Fora do horário de exibição na versão reportada.';
  if (p.scheduleState === 'OUTSIDE_WINDOW') return 'Fora da janela registrada; verifique a atualização.';
  if (p.scheduleState === 'READY') return 'Conteúdo previsto para este horário na versão reportada.';
  return 'Horário de exibição não confirmado.';
}

/** F11d — numbers for the DOOH home. Derived only from what the API reported; nothing inferred. */
export type DoohScreensOverview = { total: number; playing: number; attention: number; connecting: number; withoutDevice: number };

export function summarizeDoohScreens(screens: readonly OperationalScreen[]): DoohScreensOverview {
  let playing = 0, attention = 0, connecting = 0, withoutDevice = 0;
  for (const screen of screens) {
    if (!screen.player) withoutDevice++;
    else if (screenAwaitingDeviceConnection(screen)) connecting++;
    else if (screen.status === 'PLAYING') playing++;
    if (screen.player && screenOperationalSummary(screen).attention) attention++;
  }
  return { total: screens.length, playing, attention, connecting, withoutDevice };
}

/** One sentence for the top of the home: what matters right now. */
export function doohOverviewHeadline(o: DoohScreensOverview): string {
  if (o.total === 0) return 'Crie sua primeira tela e conecte um aparelho para começar.';
  if (o.attention > 0) return o.attention === 1 ? '1 tela precisa de atenção.' : `${o.attention} telas precisam de atenção.`;
  if (o.connecting > 0) return 'Concluindo a conexão de um aparelho.';
  if (o.playing === o.total) return o.total === 1 ? 'Sua tela está exibindo.' : 'Todas as telas estão exibindo.';
  if (o.withoutDevice > 0) return o.withoutDevice === 1 ? '1 tela ainda não tem aparelho conectado.' : `${o.withoutDevice} telas ainda não têm aparelho conectado.`;
  return 'Tudo certo com as suas telas.';
}
