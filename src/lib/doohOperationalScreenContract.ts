/** UX09 — strict, UI-only projection. No credentials or commercial grants exposed. */
export type OperationalScreen = {
  id: string;
  name: string;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  fitMode: 'CONTAIN' | 'COVER';
  locationLabel: string | null;
  playerId: string | null;
  commercialUnit: { id: string; label: string } | null;
  status: 'WAITING_FOR_PLAYER' | 'PLAYER_INACTIVE' | 'NO_RECENT_CONTACT' | 'UPDATE_PENDING' | 'WAITING_FOR_PROGRAMMING' | 'VERSION_REPORTED';
  player: { id: string; name: string; lifecycleStatus: string; lastSeenAt: string | null } | null;
};
const states = new Set(['WAITING_FOR_PLAYER', 'PLAYER_INACTIVE', 'NO_RECENT_CONTACT', 'UPDATE_PENDING', 'WAITING_FOR_PROGRAMMING', 'VERSION_REPORTED']);
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
      (input.commercialUnit !== null && !record(input.commercialUnit)) ||
      (input.player !== null && !record(input.player))) return null;
  const player = input.player;
  if (player && (!uuid.test(String(player.id)) || typeof player.name !== 'string' ||
      typeof player.lifecycleStatus !== 'string' ||
      (player.lastSeenAt !== null && typeof player.lastSeenAt !== 'string'))) return null;
  const unit = input.commercialUnit;
  if (unit && (!uuid.test(String(unit.id)) || typeof unit.label !== 'string')) return null;
  return {
    id: input.id, name: input.name, orientation: input.orientation, fitMode: input.fitMode,
    locationLabel: input.locationLabel, playerId: input.playerId, status: input.status as OperationalScreen['status'],
    player: player ? { id: String(player.id), name: String(player.name), lifecycleStatus: String(player.lifecycleStatus), lastSeenAt: player.lastSeenAt as string | null } : null,
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
  UPDATE_PENDING: 'Atualização pendente no aparelho',
  WAITING_FOR_PROGRAMMING: 'Aguardando programação',
  VERSION_REPORTED: 'Versão instalada informada',
};
export function friendlyOperationalScreenError(error: unknown): string {
  if (!record(error) || !record(error.response)) return 'Não foi possível concluir. Confira sua conexão e tente novamente.';
  const code = record(error.response.data) ? error.response.data.code : undefined;
  if (code === 'DOOH_PLAYER_LINKED_TO_OTHER_SCREEN') return 'Esse dispositivo já está conectado a outra tela.';
  if (code === 'DOOH_OPERATIONAL_SCREEN_ALREADY_PAIRED') return 'Desconecte o aparelho atual antes de escolher outro.';
  if (code === 'DOOH_PLAYER_NOT_ACTIVE') return 'O dispositivo precisa estar ativo para ser conectado.';
  if (code === 'DOOH_OPERATIONAL_SCREENS_COMPANY_NOT_ALLOWED') return 'O cadastro simplificado ainda não está liberado para esta empresa.';
  return 'A operação não foi concluída. Atualize a página e tente novamente.';
}
