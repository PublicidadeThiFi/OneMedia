import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import { buildInitialPublication } from './doohGuidedInitialPublicationContract.ts';
import type { GuidedContentDraft } from './doohGuidedScreenContentContract.ts';
import type { GuidedScheduleLink } from './doohGuidedPublicationContract.ts';
import { localInputFor } from './doohGuidedPublicationContract.ts';
import type { DoohScheduleSummary } from './doohScheduleCatalogContract.ts';
import type { DoohPlayerDetailView } from './doohPlayerDetailContract.ts';
const record = (v:unknown):Record<string,unknown>|null => v && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown>:null;
const version = (v:unknown):v is string => typeof v==='string' && /^[1-9]\d{0,18}$/.test(v) && BigInt(v)<=9223372036854775807n;
export const republicationEnabled = (v:unknown) => record(v)?.enabled===true;
export function canReviewRepublication(link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null) {
  return !!(link && schedule && player && playerId && link.screenId===screenId && link.playerId===playerId && player.id===playerId && player.lifecycleStatus==='ACTIVE' && player.credentialActive && !player.screen && version(player.desiredManifestVersion) && player.currentManifestVersion===player.desiredManifestVersion && link.scheduleId===schedule.id && link.playlistVersionId===schedule.playlistVersionId && link.status==='PUBLISHED' && schedule.status==='PUBLISHED' && schedule.priority==='STANDARD' && schedule.targetCount===1 && schedule.startsAt && schedule.endsAt && schedule.publishedAt);
}
export function buildRepublication(draft:GuidedContentDraft|null,link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null,endLocal:string,timezone:string,weekdays:readonly number[],dailyStartMinute:number|null,dailyEndMinute:number|null,now:number) {
  if(!draft || draft.screenId!==screenId || !draft.draftId || !schedule || !player || !canReviewRepublication(link,schedule,player,screenId,playerId))return null;
  if(!Number.isFinite(now) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endLocal))return null;
  const end=Date.parse(endLocal);
  if(!Number.isFinite(end)||localInputFor(end)!==endLocal||end-now<60_000||end-now>30*86_400_000)return null;
  if(!timezone||timezone.length>64)return null;
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{return null;}
  if(weekdays.length>7||new Set(weekdays).size!==weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<1||d>7))return null;
  if((dailyStartMinute===null)!==(dailyEndMinute===null) || (dailyStartMinute!==null && (!Number.isInteger(dailyStartMinute)||!Number.isInteger(dailyEndMinute)||dailyStartMinute<0||dailyEndMinute!>1440||dailyStartMinute>=dailyEndMinute!)))return null;
  const body=buildInitialPublication(draft,playerId,{playlistVersionId:draft.draftId,timezone,startsAt:new Date(now).toISOString(),endsAt:new Date(end).toISOString(),weekdays:[...weekdays].sort((a,b)=>a-b),dailyStartMinute,dailyEndMinute});
  return body?{...body,expectedScheduleId:schedule.id,expectedScheduleUpdatedAt:schedule.updatedAt,expectedManifestVersion:player.desiredManifestVersion}:null;
}
export function parseRepublicationReceipt(raw:unknown,screenId:string,playerId:string,previousScheduleId:string,playlistVersionId:string,previousManifestVersion:string) {
  const v=record(raw);
  return !!(v && v.screenId===screenId && v.playerId===playerId && v.previousScheduleId===previousScheduleId && typeof v.scheduleId==='string' && playlistUuid.test(v.scheduleId) && v.scheduleId!==previousScheduleId && v.playlistVersionId===playlistVersionId && v.status==='UPDATE_PREPARED' && version(v.manifestVersion) && version(previousManifestVersion) && BigInt(v.manifestVersion)>BigInt(previousManifestVersion));
}
