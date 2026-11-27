/** UX09 — strict, UI-only projection. No credentials or commercial grants exposed. */
export type OperationalScreen = {
  id: string;
  name: string;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  fitMode: 'CONTAIN' | 'COVER';
  locationLabel: string | null;
  playerId: string | null;
  contentPlaylistId: string | null;
  commercialUnit: { id: string; label: string } | null;
  status: 'WAITING_FOR_PLAYER' | 'PLAYER_INACTIVE' | 'NO_RECENT_CONTACT' | 'UPDATE_PENDING' | 'INSTALL_FAILED' | 'WAITING_FOR_PROGRAMMING' | 'VERSION_REPORTED' | 'PLAYING';
  player: { id: string; name: string; lifecycleStatus: string; lastSeenAt: string | null; currentManifestVersion?: string; desiredManifestVersion?: string; credentialActive?: boolean; appVersion?: string | null; runtime?: PlayerRuntimeReport | null } | null;
};
/** F11 — the device's own bounded report (release, playback state, last error code). */
export type PlayerRuntimeReport = { playbackState: string | null; lastErrorCode: string | null; reportedAt: string | null };
const states = new Set(['WAITING_FOR_PLAYER', 'PLAYER_INACTIVE', 'NO_RECENT_CONTACT', 'UPDATE_PENDING', 'INSTALL_FAILED', 'WAITING_FOR_PROGRAMMING', 'VERSION_REPORTED', 'PLAYING']);
const runtimeCode = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(value) ? value : null;
function parseRuntime(value: unknown): PlayerRuntimeReport | null {
  if (!record(value)) return null;
  return { playbackState: runtimeCode(value.playbackState), lastErrorCode: runtimeCode(value.lastErrorCode), reportedAt: typeof value.reportedAt === 'string' ? value.reportedAt : null };
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(x: unknown): x is Record<string, unknown> { return !!x && typeof x === 'object' && !Array.isArray(x); }
export function parseOperationalScreen(input: unknown): OperationalScreen | null {
  if (!record(input) || typeof input.id !== 'string' || !uuid.test(input.id) ||
      typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 ||
      (input.orientation !== 'LANDSCAPE' && input.orientation !== 'PORTRAIT') ||
      (input.fitMode !== 'CONTAIN' && input.fitMode !== 'COVER') ||
      typeof input.status !== 'string' || !states.has(input.status) ||
      (input.locationLabel !== null && typeof input.locationLabel !== 'string') ||
      (input.playerId !== null && (typeof input.playerId !== 'string' || !uuid.test(input.playerId))) ||
      (input.contentPlaylistId !== undefined && input.contentPlaylistId !== null && (typeof input.contentPlaylistId !== 'string' || !uuid.test(input.contentPlaylistId))) ||
      (input.commercialUnit !== null && !record(input.commercialUnit)) ||
      (input.player !== null && !record(input.player))) return null;
  const player = input.player;
  if (player && (!uuid.test(String(player.id)) || typeof player.name !== 'string' ||
      typeof player.lifecycleStatus !== 'string' ||
      (player.lastSeenAt !== null && typeof player.lastSeenAt !== 'string'))) return null;
  if ((player === null) !== (input.playerId === null) || (player && player.id !== input.playerId)) return null;
  const version = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d{0,18})$/.test(value) && BigInt(value) <= 9223372036854775807n;
  if (player && (player.currentManifestVersion !== undefined || player.desiredManifestVersion !== undefined) &&
      (!version(player.currentManifestVersion) || !version(player.desiredManifestVersion))) return null;
  if (player && player.credentialActive !== undefined && typeof player.credentialActive !== 'boolean') return null;
  const unit = input.commercialUnit;
  if (unit && (!uuid.test(String(unit.id)) || typeof unit.label !== 'string')) return null;
  return {
    id: input.id, name: input.name, orientation: input.orientation, fitMode: input.fitMode,
    locationLabel: input.locationLabel, playerId: input.playerId, contentPlaylistId: (input.contentPlaylistId as string | null | undefined) ?? null, status: input.status as OperationalScreen['status'],
    player: player ? { id: String(player.id), name: String(player.name), lifecycleStatus: String(player.lifecycleStatus), lastSeenAt: player.lastSeenAt as string | null, ...(version(player.currentManifestVersion) && version(player.desiredManifestVersion) ? { currentManifestVersion: player.currentManifestVersion, desiredManifestVersion: player.desiredManifestVersion } : {}), ...(typeof player.credentialActive === 'boolean' ? { credentialActive: player.credentialActive } : {}), ...(player.appVersion !== undefined ? { appVersion: runtimeCode(player.appVersion) } : {}), ...(player.runtime !== undefined ? { runtime: parseRuntime(player.runtime) } : {}) } : null,
    commercialUnit: unit ? { id: String(unit.id), label: String(unit.label) } : null,
  };
}
export function parseOperationalScreenPage(input: unknown): { items: OperationalScreen[]; meta: { page: number; pageSize: number; total: number } } | null {
  if (!record(input) || !Array.isArray(input.items) || !record(input.meta) ||
      !Number.isInteger(input.meta.page) || Number(input.meta.page) < 1 ||
      !Number.isInteger(input.meta.pageSize) || Number(input.meta.pageSize) < 1 ||
      !Number.isInteger(input.meta.total) || Number(input.meta.total) < 0) return null;
  const parsed = input.items.map(parseOperationalScreen);
  if (parsed.some(item => !item)) return null;
  return { items: parsed as OperationalScreen[], meta: {
    page: Number(input.meta.page), pageSize: Number(input.meta.pageSize), total: Number(input.meta.total),
  }};
}
export const operationalScreenStatusText: Record<OperationalScreen['status'], string> = {
  WAITING_FOR_PLAYER: 'Aguardando conexão do aparelho',
  PLAYER_INACTIVE: 'Dispositivo inativo',
  NO_RECENT_CONTACT: 'Sem contato recente',
  UPDATE_PENDING: 'Instalando a nova programação',
  INSTALL_FAILED: 'O aparelho não conseguiu instalar a programação',
  WAITING_FOR_PROGRAMMING: 'Aguardando programação',
  VERSION_REPORTED: 'Programação instalada',
  PLAYING: 'Em exibição',
};
/** Plain-language reason for an install/playback error reported by the device. */
export function playerErrorText(code: string | null | undefined): string | null {
  if (!code) return null;
  const base = code.split('.')[0];
  if (base === 'PLAYER_STORAGE_QUOTA') return 'Falta espaço de armazenamento no aparelho.';
  if (base === 'PLAYER_STORAGE_UNAVAILABLE' || base === 'PLAYER_STORAGE_ABORTED' || base === 'PLAYER_INDEXEDDB_UNAVAILABLE') return 'O navegador do aparelho não permitiu salvar a programação. Use o navegador em janela normal (não privada).';
  if (base === 'PLAYER_STORAGE_CONFLICT') return 'O Player está aberto em mais de uma aba no aparelho. Deixe apenas uma aberta.';
  if (base === 'PLAYER_API_CONNECTION_FAILED' || base === 'PLAYER_ASSET_NETWORK_FAILED') return 'O aparelho está sem conexão estável com a internet.';
  if (base.startsWith('PLAYER_ASSET_') || base === 'PLAYER_MEDIA_INTEGRITY') return 'Uma mídia não pôde ser baixada ou conferida. O aparelho tentará de novo automaticamente.';
  if (base === 'PLAYER_LICENSE_DENIED' || base === 'PLAYER_LICENSE_EXPIRED' || base === 'PLAYER_PROGRAMMING_DENIED') return 'A licença da empresa não permite receber programação neste momento.';
  return `O aparelho informou o código ${base}.`;
}
export function friendlyOperationalScreenError(error: unknown): string {
  if (!record(error) || !record(error.response)) return 'Não foi possível concluir. Confira sua conexão e tente novamente.';
  const code = record(error.response.data) ? error.response.data.code : undefined;
  if (code === 'DOOH_OPERATIONAL_LEGACY_ASSIGNMENT_CONFLICT' || code === 'DOOH_OPERATIONAL_COMMERCIAL_UNIT_OCCUPIED') return 'O vínculo comercial está ocupado ou é incompatível. Preserve a associação existente e escolha outro aparelho.';
  if (code === 'DOOH_OPERATIONAL_SCREEN_NOT_FOUND' || code === 'DOOH_PLAYER_NOT_FOUND') return 'A tela ou aparelho não foi encontrado nesta empresa. Atualize a lista.';
  if (code === 'DOOH_PLAYER_LINKED_TO_OTHER_SCREEN') return 'Esse dispositivo já está conectado a outra tela.';
  if (code === 'DOOH_OPERATIONAL_SCREEN_ALREADY_PAIRED') return 'Desconecte o aparelho atual antes de escolher outro.';
  if (code === 'DOOH_PLAYER_NOT_ACTIVE') return 'O dispositivo precisa estar ativo para ser conectado.';
  if (code === 'DOOH_OPERATIONAL_SCREENS_COMPANY_NOT_ALLOWED') return 'O cadastro simplificado ainda não está liberado para esta empresa.';
  return 'A operação não foi concluída. Atualize a página e tente novamente.';
}
