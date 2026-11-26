/** D15A1-02: contract-only, minimal projections; no device/session secrets. */
export type PairResult = { playerId: string; name: string; lifecycle: 'ACTIVE' | 'INACTIVE'; idempotentReplay: boolean };
export type ScreenCandidate = { id: string; label: string; mediaPointId: string; isActive: boolean };
const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
export const isUuidV4 = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
/** Backend accepts 6–32 chars and normalizes separator/case, but the normalized code must be valid. */
export function validPairingCode(code: string): string | null {
  const raw = code.trim();
  if (raw.length < 6 || raw.length > 32 || !/^[A-Za-z0-9\s-]+$/.test(raw)) return null;
  const normalized = raw.toUpperCase().replace(/[\s-]/g, '');
  return normalized.length >= 6 && normalized.length <= 32 && /^[A-Z0-9]+$/.test(normalized) ? normalized : null;
}
export function parsePairResult(value: unknown): PairResult | null {
  if (!object(value) || value.status !== 'PAIRED' || !object(value.player) ||
      !isUuidV4(value.player.id) || typeof value.player.name !== 'string' ||
      !['ACTIVE', 'INACTIVE'].includes(String(value.player.lifecycleStatus)) ||
      typeof value.idempotentReplay !== 'boolean') return null;
  return { playerId: value.player.id, name: value.player.name,
    lifecycle: value.player.lifecycleStatus as PairResult['lifecycle'], idempotentReplay: value.idempotentReplay };
}
export function parseScreenCandidate(value: unknown, companyId: string, expectedId: string): ScreenCandidate | null {
  if (!object(value) || !isUuidV4(expectedId) || value.id !== expectedId ||
      value.companyId !== companyId || value.unitType !== 'SCREEN' ||
      typeof value.isActive !== 'boolean' || typeof value.label !== 'string' ||
      value.label.length > 256 || !isUuidV4(value.mediaPointId)) return null;
  return { id: expectedId, label: value.label, mediaPointId: value.mediaPointId, isActive: value.isActive };
}
export function parseAssignmentResult(value: unknown, playerId: string, screenId: string): boolean {
  if (!object(value) || typeof value.changed !== 'boolean' || !isUuidV4(value.assignmentId) ||
      !object(value.player) || value.player.id !== playerId || !object(value.player.currentAssignment) ||
      !object(value.player.currentAssignment.mediaUnit)) return false;
  return value.player.currentAssignment.mediaUnit.id === screenId;
}
/** No secrets or raw backend error text leave this contract. */
export function safePairingError(error: unknown): string {
  const response = object(error) && object(error.response) ? error.response : null;
  const code = object(response?.data) ? response.data.code : undefined;
  if (code === 'DOOH_SCREEN_ALREADY_ASSIGNED') return 'Esta unidade comercial já tem um aparelho. Escolha outra unidade ou mantenha a tela independente.';
  if (code === 'DOOH_PAIRING_ALREADY_CLAIMED' || code === 'DOOH_PAIRING_ALREADY_COMPLETED') return 'Este código já foi utilizado. Procure o aparelho em Minhas telas antes de gerar outro código.';
  if (code === 'DOOH_INSTALLATION_ALREADY_OWNED') return 'Este aparelho já pertence a outra empresa. Não é possível vinculá-lo aqui.';
  if (code === 'DOOH_PLAYER_ACTIVATION_PAUSED') return 'Novas ativações estão temporariamente suspensas. Tente mais tarde.';
  if (code === 'DOOH_LICENSE_UPGRADE_REQUIRED') return 'O limite de aparelhos ativos do seu plano foi atingido. Faça upgrade antes de ativar outro aparelho.';
  if (code === 'DOOH_LICENSE_QUOTA_NOT_CONFIGURED') return 'O plano não possui limite de aparelhos configurado. Consulte o responsável pela assinatura.';
  if (code === 'DOOH_PLAYER_RETIRED') return 'Este aparelho foi retirado de operação. Consulte Gerenciar dispositivos.';
  switch (response?.status) {
    case 400: return 'Código ou dados de pareamento inválidos.';
    case 401: return 'Sessão expirada. Autentique-se novamente.';
    case 402:
    case 403: return 'Acesso ou licença DOOH insuficiente para a operação.';
    case 404: return 'Código/registro não encontrado. Confira o dispositivo e a empresa.';
    case 409: return 'Conflito de estado, quota, pausa global ou vínculo existente. Confirme as condições antes de repetir.';
    case 410: return 'Código expirado ou pareamento já consumido. Gere outro código no dispositivo.';
    case 429: return 'Limite temporário de tentativas atingido. Aguarde antes de repetir.';
    default: return 'Não houve confirmação da operação. Confira o estado atual antes de tentar novamente.';
  }
}
