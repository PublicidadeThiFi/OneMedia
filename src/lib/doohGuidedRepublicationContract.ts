import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import { buildInitialPublication } from './doohGuidedInitialPublicationContract.ts';
import type { GuidedContentDraft } from './doohGuidedScreenContentContract.ts';
import type { GuidedScheduleLink } from './doohGuidedPublicationContract.ts';
import { localInputFor } from './doohGuidedPublicationContract.ts';
import type { DoohScheduleSummary } from './doohScheduleCatalogContract.ts';
import type { InspectedPublishedPlaylist } from './doohPublishedVersionInspectionContract.ts';
import type { DoohPlayerDetailView } from './doohPlayerDetailContract.ts';
const record = (v:unknown):Record<string,unknown>|null => v && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown>:null;
const version = (v:unknown):v is string => typeof v==='string' && /^[1-9]\d{0,18}$/.test(v) && BigInt(v)<=9223372036854775807n;
export const republicationEnabled = (v:unknown) => record(v)?.enabled===true;
export function canReviewRepublication(link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null) {
  return !!(link && schedule && player && playerId && link.screenId===screenId && link.playerId===playerId && player.id===playerId && player.lifecycleStatus==='ACTIVE' && player.credentialActive && !player.screen && version(player.desiredManifestVersion) && player.currentManifestVersion===player.desiredManifestVersion && link.scheduleId===schedule.id && link.playlistVersionId===schedule.playlistVersionId && link.status==='PUBLISHED' && schedule.status==='PUBLISHED' && schedule.priority==='STANDARD' && schedule.targetCount===1 && schedule.startsAt && schedule.endsAt && schedule.publishedAt);
}
export function buildRepublication(draft:GuidedContentDraft|null,link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null,endLocal:string,timezone:string,weekdays:readonly number[],dailyStartMinute:number|null,dailyEndMinute:number|null,now:number,startLocal?:string) {
  if(!draft || draft.screenId!==screenId || !draft.draftId || !schedule || !player || !canReviewRepublication(link,schedule,player,screenId,playerId))return null;
  if(!Number.isFinite(now) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endLocal))return null;
  const start=startLocal===undefined?now:Date.parse(startLocal);
  if(startLocal!==undefined&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startLocal)||!Number.isFinite(start)||localInputFor(start)!==startLocal||start<=now+60_000||start>now+7*86_400_000))return null;
  const end=Date.parse(endLocal);
  if(!Number.isFinite(end)||localInputFor(end)!==endLocal||end-start<60_000||end-start>30*86_400_000)return null;
  if(!timezone||timezone.length>64)return null;
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{return null;}
  if(weekdays.length>7||new Set(weekdays).size!==weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<1||d>7))return null;
  if((dailyStartMinute===null)!==(dailyEndMinute===null) || (dailyStartMinute!==null && (!Number.isInteger(dailyStartMinute)||!Number.isInteger(dailyEndMinute)||dailyStartMinute<0||dailyEndMinute!>1440||dailyStartMinute>=dailyEndMinute!)))return null;
  const body=buildInitialPublication(draft,playerId,{playlistVersionId:draft.draftId,timezone,startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),weekdays:[...weekdays].sort((a,b)=>a-b),dailyStartMinute,dailyEndMinute});
  return body?{...body,expectedScheduleId:schedule.id,expectedScheduleUpdatedAt:schedule.updatedAt,expectedManifestVersion:player.desiredManifestVersion}:null;
}
export function parseRepublicationReceipt(raw:unknown,screenId:string,playerId:string,previousScheduleId:string,playlistVersionId:string,previousManifestVersion:string) {
  const v=record(raw);
  return !!(v && v.screenId===screenId && v.playerId===playerId && v.previousScheduleId===previousScheduleId && typeof v.scheduleId==='string' && playlistUuid.test(v.scheduleId) && v.scheduleId!==previousScheduleId && v.playlistVersionId===playlistVersionId && v.status==='UPDATE_PREPARED' && version(v.manifestVersion) && version(previousManifestVersion) && BigInt(v.manifestVersion)>BigInt(previousManifestVersion));
}

export const futureRepublicationEnabled=(raw:unknown)=>republicationEnabled(raw)&&record(raw)?.futureEnabled===true;
export type FutureRepublicationView={id:string;status:'PENDING'|'ACTIVATED'|'CANCELLED'|'FAILED';startsAt:string;endsAt:string;finishedAt:string|null};
const iso=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function parseFutureRepublication(raw:unknown,screenId:string):{intent:FutureRepublicationView|null}|null {
  const envelope=record(raw);if(!envelope||envelope.screenId!==screenId)return null;
  if(envelope.intent===null)return {intent:null};
  const v=record(envelope.intent);if(!v||typeof v.id!=='string'||!playlistUuid.test(v.id)||!iso(v.startsAt)||!iso(v.endsAt)||Date.parse(v.endsAt)<=Date.parse(v.startsAt))return null;
  const status=v.status;if(status!=='PENDING'&&status!=='ACTIVATED'&&status!=='CANCELLED'&&status!=='FAILED')return null;
  if(status==='PENDING'?v.finishedAt!==null:!iso(v.finishedAt))return null;
  return {intent:{id:v.id,status,startsAt:v.startsAt,endsAt:v.endsAt,finishedAt:v.finishedAt as string|null}};
}
export function futureRepublicationReceipt(raw:unknown,screenId:string,startsAt:string,endsAt:string){
  const v=record(raw);return !!(v&&v.screenId===screenId&&v.status==='PENDING'&&typeof v.intentId==='string'&&playlistUuid.test(v.intentId)&&v.startsAt===startsAt&&v.endsAt===endsAt);
}
export function futureRepublicationCancelled(raw:unknown,screenId:string,intentId:string){const v=record(raw);return !!(v&&v.screenId===screenId&&v.intentId===intentId&&v.cancelled===true);}


export const pausePublicationEnabled=(raw:unknown)=>republicationEnabled(raw)&&record(raw)?.pauseEnabled===true;
export function buildPausePublication(link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null,playlistId:string|null) {
  if(!playlistId||!playlistUuid.test(playlistId)||!schedule||!player||!playerId||!canReviewRepublication(link,schedule,player,screenId,playerId))return null;
  return {expectedPlayerId:playerId,expectedPlaylistId:playlistId,expectedScheduleId:schedule.id,expectedScheduleUpdatedAt:schedule.updatedAt,expectedManifestVersion:player.desiredManifestVersion,confirmation:'PAUSAR_PROGRAMACAO_GUIADA' as const};
}
export function parsePausePublicationReceipt(raw:unknown,screenId:string,body:NonNullable<ReturnType<typeof buildPausePublication>>){
  const v=record(raw);return !!(v&&v.screenId===screenId&&v.playerId===body.expectedPlayerId&&v.scheduleId===body.expectedScheduleId&&v.status==='PAUSE_PREPARED'&&version(v.manifestVersion)&&BigInt(v.manifestVersion)===BigInt(body.expectedManifestVersion)+1n);
}
export function buildResumePublication(snapshot:InspectedPublishedPlaylist|null,link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null,playlistId:string|null,endLocal:string,now:number){
  if(!snapshot||!link||!schedule||link.status!=='PAUSED'||schedule.status!=='PAUSED'||snapshot.playlistId!==playlistId||snapshot.versionId!==schedule.playlistVersionId||!snapshot.items.length||snapshot.items.length>200)return null;
  // The existing reviewer verifies all scope and version invariants. Only the status is normalized for the paused path.
  const base=buildPausePublication({...link,status:'PUBLISHED'},{...schedule,status:'PUBLISHED'},player,screenId,playerId,playlistId);
  if(!base||!Number.isFinite(now)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endLocal))return null;
  const end=Date.parse(endLocal);
  if(!Number.isFinite(end)||localInputFor(end)!==endLocal||end-now<60_000||end-now>30*86_400_000)return null;
  return {...base,confirmation:'PUBLICAR_PROGRAMACAO_GUIADA' as const,playlistVersionId:snapshot.versionId,expectedItems:snapshot.items,startsAt:new Date(now).toISOString(),endsAt:new Date(end).toISOString(),timezone:schedule.timezone,weekdays:[...schedule.weekdays].sort((a,b)=>a-b),dailyStartMinute:schedule.dailyStartMinute,dailyEndMinute:schedule.dailyEndMinute};
}

export const restorationEnabled=(raw:unknown)=>republicationEnabled(raw)&&record(raw)?.restoreEnabled===true;
export type RestorationEntry={scheduleId:string;scheduleUpdatedAt:string;playlistVersionId:string;version:number;checksum:string;publishedAt:string;timezone:string;weekdays:number[];dailyStartMinute:number|null;dailyEndMinute:number|null;items:{id:string;position:number;mediaVersionId:string;durationMs:number;name:string}[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&playlistUuid.test(v);
export function parsePublicationHistory(raw:unknown,screenId:string,playlistId:string,playerId:string):{entries:RestorationEntry[];truncated:boolean}|null{
  const root=record(raw);if(!root||root.screenId!==screenId||root.playlistId!==playlistId||root.playerId!==playerId||typeof root.truncated!=='boolean'||!Array.isArray(root.entries)||root.entries.length>50)return null;
  const entries:RestorationEntry[]=[];
  for(const value of root.entries){
    const v=record(value);if(!v||!uuid(v.scheduleId)||!uuid(v.playlistVersionId)||!iso(v.scheduleUpdatedAt)||!iso(v.publishedAt)||typeof v.version!=='number'||!Number.isSafeInteger(v.version)||v.version<1||typeof v.checksum!=='string'||!/^[a-f0-9]{64}$/i.test(v.checksum)||typeof v.timezone!=='string'||!v.timezone||v.timezone.length>64||!Array.isArray(v.weekdays)||v.weekdays.length>7||new Set(v.weekdays).size!==v.weekdays.length||v.weekdays.some(d=>!Number.isInteger(d)||d<1||d>7)||!Array.isArray(v.items)||!v.items.length||v.items.length>200||entries.some(e=>e.scheduleId===v.scheduleId))return null;
    try{new Intl.DateTimeFormat('en-US',{timeZone:v.timezone});}catch{return null;}
    const first=v.dailyStartMinute,last=v.dailyEndMinute;
    if(!((first===null&&last===null)||(typeof first==='number'&&typeof last==='number'&&Number.isInteger(first)&&Number.isInteger(last)&&first>=0&&last<=1440&&first<last)))return null;
    const items:RestorationEntry['items']=[];
    for(const rawItem of v.items){const i=record(rawItem);if(!i||!uuid(i.id)||!uuid(i.mediaVersionId)||i.position!==items.length||typeof i.durationMs!=='number'||!Number.isInteger(i.durationMs)||i.durationMs<1||i.durationMs>86400000||typeof i.name!=='string'||!i.name.trim()||items.some(x=>x.id===i.id))return null;items.push({id:i.id,mediaVersionId:i.mediaVersionId,position:i.position,durationMs:i.durationMs,name:i.name});}
    entries.push({scheduleId:v.scheduleId,scheduleUpdatedAt:v.scheduleUpdatedAt,playlistVersionId:v.playlistVersionId,version:v.version,checksum:v.checksum,publishedAt:v.publishedAt,timezone:v.timezone,weekdays:v.weekdays,dailyStartMinute:first as number|null,dailyEndMinute:last as number|null,items});
  }
  return {entries,truncated:root.truncated};
}
export function buildRestorePublication(entry:RestorationEntry|null,draft:GuidedContentDraft|null,link:GuidedScheduleLink|null,schedule:DoohScheduleSummary|null,player:DoohPlayerDetailView|null,screenId:string,playerId:string|null,endLocal:string,now:number){
  if(!entry||!draft?.draftId||draft.screenId!==screenId||!uuid(draft.draftId)||!uuid(draft.playlistId)||!schedule||entry.scheduleId===schedule.id||!player||!link||!((link.status==='PAUSED'&&schedule.status==='PAUSED')?canReviewRepublication({...link,status:'PUBLISHED'},{...schedule,status:'PUBLISHED'},player,screenId,playerId):canReviewRepublication(link,schedule,player,screenId,playerId))||!Number.isFinite(now)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endLocal))return null;
  const end=Date.parse(endLocal);if(!Number.isFinite(end)||localInputFor(end)!==endLocal||end-now<60000||end-now>30*86400000)return null;
  return {expectedPlayerId:playerId!,expectedPlaylistId:draft.playlistId,expectedScheduleId:schedule.id,expectedScheduleUpdatedAt:schedule.updatedAt,expectedManifestVersion:player.desiredManifestVersion,expectedPaused:link.status==='PAUSED',sourceScheduleId:entry.scheduleId,sourceScheduleUpdatedAt:entry.scheduleUpdatedAt,sourceChecksum:entry.checksum,expectedRestoreDraftId:draft.draftId,playlistVersionId:entry.playlistVersionId,expectedItems:entry.items.map(({id,position,mediaVersionId,durationMs})=>({id,position,mediaVersionId,durationMs})),startsAt:new Date(now).toISOString(),endsAt:new Date(end).toISOString(),timezone:entry.timezone,weekdays:[...entry.weekdays].sort((a,b)=>a-b),dailyStartMinute:entry.dailyStartMinute,dailyEndMinute:entry.dailyEndMinute,confirmation:'PUBLICAR_PROGRAMACAO_GUIADA' as const,renewalMode:'NONE' as const};
}
export function parseRestoreReceipt(raw:unknown,screenId:string,body:NonNullable<ReturnType<typeof buildRestorePublication>>){const v=record(raw);return !!(v&&v.restoredScheduleId===body.sourceScheduleId&&v.restoredPlaylistVersionId===body.playlistVersionId&&parseRepublicationReceipt(v,screenId,body.expectedPlayerId,body.expectedScheduleId,body.expectedRestoreDraftId,body.expectedManifestVersion));}
