/** D16A04 — strict advisory preflight projection and QA-only CAS request. */
import type { DoohPlayerDetailView } from './doohPlayerDetailContract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const BIG = 9223372036854775807n;
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const version = (v: unknown): v is string => typeof v === 'string' &&
  /^(0|[1-9]\d*)$/.test(v) && v.length <= 19 && BigInt(v) <= BIG;
export function validManifestWindow(from: string, to: string): boolean {
  if (!UTC.test(from) || !UTC.test(to)) return false;
  const start = Date.parse(from), end = Date.parse(to);
  return Number.isFinite(start) && Number.isFinite(end) &&
    new Date(start).toISOString() === from && new Date(end).toISOString() === to &&
    end > start && end - start <= 86_400_000;
}
export function canPublishManifestQa(companyId: string, sessionId: string | null | undefined,
  grantCompanyId: string | null | undefined, granted: boolean | undefined, mode: string | undefined,
  roles: readonly string[], enabled: boolean, lifecycle: string): boolean {
  return enabled && lifecycle === 'ACTIVE' && UUID.test(companyId) &&
    companyId === sessionId && companyId === grantCompanyId && granted === true && mode === 'FULL' &&
    roles.some((r) => r === 'ADMINISTRATIVO' || r === 'TI');
}
export type ManifestPreflightView = {
  companyId: string; playerId: string; from: string; to: string;
  status: 'READY' | 'REVIEW_REQUIRED'; issues: readonly string[];
  checksum: string | null; desired: string; current: string;
  segments: number | null; assets: number | null;
};
export function parseManifestPreflight(raw: unknown, companyId: string, player: DoohPlayerDetailView,
  from: string, to: string): ManifestPreflightView | null {
  const r = obj(raw), window = obj(r?.window);
  if (!r || !window || !UUID.test(companyId) || r.scope !== 'ADVISORY_READ_ONLY' ||
      r.companyId !== companyId || r.playerId !== player.id || player.lifecycleStatus !== 'ACTIVE' ||
      window.from !== from || window.to !== to || !validManifestWindow(from, to) ||
      r.manifestPublished !== false || r.authorization !== 'NOT_GRANTED' ||
      r.payloadIntegrity !== 'NOT_CHECKED' || r.distribution !== 'NOT_CHECKED' ||
      r.playback !== 'NOT_CHECKED' || !version(r.desiredManifestVersion) ||
      !version(r.currentManifestVersion) || r.desiredManifestVersion !== player.desiredManifestVersion ||
      r.currentManifestVersion !== player.currentManifestVersion ||
      !Array.isArray(r.issues) || r.issues.length > 20 ||
      !r.issues.every((x: unknown) => typeof x === 'string' && /^DOOH_MANIFEST_[A-Z_]+$/.test(x)) ||
      typeof r.applicableScheduleCount !== 'number' || !Number.isInteger(r.applicableScheduleCount) ||
      r.applicableScheduleCount < 0 || r.applicableScheduleCount > 100) return null;
  if (r.status !== 'READY' && r.status !== 'REVIEW_REQUIRED') return null;
  if (r.status === 'READY' && (!SHA.test(String(r.candidateChecksum)) || r.issues.length ||
      typeof r.segmentCount !== 'number' || !Number.isInteger(r.segmentCount) || r.segmentCount <= 0 ||
      typeof r.assetCount !== 'number' || !Number.isInteger(r.assetCount) || r.assetCount <= 0 ||
      r.readySegmentCount !== r.segmentCount)) return null;
  if (r.status === 'REVIEW_REQUIRED' &&
      (r.candidateChecksum !== null || r.issues.length === 0)) return null;
  return { companyId, playerId: player.id, from, to,
    status: r.status, issues: [...r.issues] as string[],
    checksum: r.status === 'READY' ? String(r.candidateChecksum) : null,
    desired: r.desiredManifestVersion, current: r.currentManifestVersion,
    segments: typeof r.segmentCount === 'number' ? r.segmentCount : null,
    assets: typeof r.assetCount === 'number' ? r.assetCount : null };
}
export function buildManifestCasRequest(view: ManifestPreflightView, confirmed: boolean) {
  if (!confirmed || view.status !== 'READY' || !view.checksum || !SHA.test(view.checksum) ||
      !version(view.current) || !version(view.desired) || !validManifestWindow(view.from, view.to)) return null;
  return { from: view.from, to: view.to, expectedCandidateChecksum: view.checksum,
    expectedCurrentManifestVersion: view.current, expectedDesiredManifestVersion: view.desired,
    confirmation: 'MATERIALIZAR_MANIFEST_QA' as const };
}
export function manifestCasResult(raw: unknown, view: ManifestPreflightView) {
  const r = obj(raw);
  if (!r || r.playerId !== view.playerId || !UUID.test(String(r.manifestId)) ||
      !version(r.version) || r.version === '0' || r.checksum !== view.checksum ||
      typeof r.alreadyPublished !== 'boolean') return null;
  if (!r.alreadyPublished && BigInt(r.version) !== BigInt(view.desired) + 1n) return null;
  if (r.alreadyPublished && r.version !== view.desired) return null;
  return { version: r.version as string, alreadyPublished: r.alreadyPublished as boolean };
}
export function manifestCasError(error: unknown): string {
  const status = obj(obj(error)?.response)?.status;
  if (status === 401) return 'Sessão expirada. Entre novamente.';
  if (status === 402 || status === 403) return 'Materialização indisponível. O QA Gate no servidor permanece bloqueado.';
  if (status === 404) return 'Player ou rota indisponível na API atual.';
  if (status === 409) return 'Dados alterados, conflito ou conteúdo não pronto. Atualize o preflight.';
  if (status === 429) return 'Limite de requisições atingido. Aguarde.';
  return 'Não foi possível concluir a consulta ou solicitação de QA.';
}
