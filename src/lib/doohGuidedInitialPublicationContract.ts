import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import { guidedSnapshotToCas, type GuidedContentDraft } from './doohGuidedScreenContentContract.ts';
import { publishCasPayload } from './doohPlaylistPublishContract.ts';
import type { GuidedSchedulePlan } from './doohGuidedPublicationContract.ts';
import type { DoohScheduleSummary } from './doohScheduleCatalogContract.ts';

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
export function initialPublicationEnabled(raw: unknown) { return object(raw)?.enabled === true; }
export function buildInitialPublication(draft: GuidedContentDraft|null, playerId: string|null, plan: GuidedSchedulePlan|null) {
  if (!draft || !playerId || !playlistUuid.test(playerId) || !plan || !draft.items.every(i=>i.mediaStatus==='READY')) return null;
  const snapshot=guidedSnapshotToCas(draft), body=publishCasPayload(snapshot);
  if (!snapshot || !body || plan.playlistVersionId!==snapshot.draftId) return null;
  return {...plan,expectedPlaylistId:snapshot.playlistId,expectedPlayerId:playerId,expectedItems:body.expectedItems,confirmation:'PUBLICAR_PROGRAMACAO_GUIADA' as const};
}
export function existingGuidedPlan(schedule: DoohScheduleSummary|null, draftId: string|null): GuidedSchedulePlan|null {
  if (!schedule || !draftId || !playlistUuid.test(draftId) || !schedule.startsAt || !schedule.endsAt || schedule.priority!=='STANDARD' ||
      (schedule.status!=='DRAFT'&&schedule.status!=='PUBLISHED') || schedule.targetCount!==1) return null;
  return {playlistVersionId:draftId,timezone:schedule.timezone,startsAt:schedule.startsAt,endsAt:schedule.endsAt,
    weekdays:schedule.weekdays,dailyStartMinute:schedule.dailyStartMinute,dailyEndMinute:schedule.dailyEndMinute};
}
export function parseInitialPublicationReceipt(raw:unknown,screenId:string,playerId:string,expectedVersions:readonly string[],expectedScheduleId:string|null) {
  const v=object(raw);
  return v&&v.screenId===screenId&&v.playerId===playerId&&v.status==='UPDATE_PREPARED'&&
    typeof v.playlistVersionId==='string'&&playlistUuid.test(v.playlistVersionId)&&expectedVersions.includes(v.playlistVersionId)&&playlistUuid.test(String(v.scheduleId))&&(!expectedScheduleId||v.scheduleId===expectedScheduleId)&&typeof v.manifestVersion==='string'&&
    /^[1-9]\d{0,18}$/.test(v.manifestVersion)&&BigInt(v.manifestVersion)<=9223372036854775807n&&typeof v.alreadyPrepared==='boolean'
    ? {manifestVersion:v.manifestVersion,alreadyPrepared:v.alreadyPrepared}:null;
}

/** Do not expose technical identifiers or claim that a failed request made no changes. */
export function initialPublicationError(error:unknown):string {
  const response=object(object(error)?.response), code=object(response?.data)?.code;
  if(code==='DOOH_GUIDED_INITIAL_NO_PLAYABLE_WINDOW')return 'Escolha um período com pelo menos um minuto de exibição nos próximos sete dias.';
  if(code==='DOOH_GUIDED_INITIAL_CONTENT_CHANGED'||code==='DOOH_GUIDED_INITIAL_SCHEDULE_CHANGED'||code==='DOOH_GUIDED_INITIAL_STALE')return 'A sequência ou a programação mudou. Confira os dados atualizados antes de confirmar novamente.';
  if(code==='DOOH_GUIDED_INITIAL_EXISTING_MANIFEST'||code==='DOOH_GUIDED_INITIAL_MANIFEST_SCOPE'||code==='DOOH_GUIDED_INITIAL_COMMERCIAL_LINK')return 'Há uma programação ou vínculo que precisa de revisão na operação avançada. Nenhuma atualização de outra tela será substituída.';
  if(code==='DOOH_GUIDED_INITIAL_PREFLIGHT_NOT_READY')return 'A programação pode ter sido salva, mas a atualização do aparelho ainda não está pronta. Confira os horários e o conteúdo antes de retomar.';
  if(response?.status===401)return 'Sua sessão expirou. Entre novamente e confira o que foi salvo.';
  if(response?.status===403||response?.status===402||response?.status===503)return 'A publicação não está autorizada neste momento. Confira a situação da tela e as permissões.';
  return 'A atualização não foi confirmada. Consulte a situação salva antes de confirmar novamente; algumas etapas podem já ter sido concluídas.';
}
