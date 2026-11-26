/** UX10/F3B: UI only. The API remains the exclusive authority for publication and delivery. */
import { playlistUuid } from './doohPlaylistCatalogContract.ts';
const obj = (v: unknown): Record<string,unknown>|null => v && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown> : null;
const day = 86_400_000;
export interface GuidedScheduleLink { screenId: string; scheduleId: string|null; status: 'DRAFT'|'PUBLISHED'|'PAUSED'|'ARCHIVED'|null; playerId: string|null; playlistVersionId: string|null; }
export type GuidedSchedulePlan = { playlistVersionId: string; timezone: string; startsAt: string; endsAt: string; weekdays: number[]; dailyStartMinute: number|null; dailyEndMinute: number|null };
export function parseGuidedScheduleLink(raw: unknown, screenId: string): GuidedScheduleLink|null {
  const v=obj(raw); if(!v||!playlistUuid.test(screenId)||v.screenId!==screenId||
    !(v.playerId===null||typeof v.playerId==='string'&&playlistUuid.test(v.playerId)))return null;
  if(v.scheduleId===null&&v.status===null&&v.playlistVersionId===null) return {screenId,scheduleId:null,status:null,playerId:v.playerId as string|null,playlistVersionId:null};
  if(!playlistUuid.test(String(v.scheduleId))||!playlistUuid.test(String(v.playlistVersionId))||
    !['DRAFT','PUBLISHED','PAUSED','ARCHIVED'].includes(String(v.status)))return null;
  return {screenId,scheduleId:v.scheduleId as string,status:v.status as GuidedScheduleLink['status'],playerId:v.playerId as string|null,playlistVersionId:v.playlistVersionId as string};
}
export function parseGuidedScheduleReceipt(raw: unknown, screenId: string, playerId: string, versionId: string) {
  const v=obj(raw);
  return v&&v.screenId===screenId&&v.playerId===playerId&&v.playlistVersionId===versionId&&
    playlistUuid.test(String(v.scheduleId))&&['DRAFT','PUBLISHED'].includes(String(v.status))&&typeof v.created==='boolean'
    ? {scheduleId:v.scheduleId as string,status:v.status as 'DRAFT'|'PUBLISHED',created:v.created as boolean}:null;
}
export function parseGuidedScheduleCapability(raw:unknown):boolean|null {const v=obj(raw);return v&&typeof v.scheduleEnabled==='boolean'?v.scheduleEnabled:null;}
export function parseSimpleBooleanCapability(raw:unknown,name:'publishEnabled'):boolean|null {const v=obj(raw);return v&&typeof v[name]==='boolean'?v[name] as boolean:null;}
export function parseSchedulePublishCapability(raw:unknown):{enabled:boolean;qaOnly:boolean}|null {
  const v=obj(raw);return v&&typeof v.publishEnabled==='boolean'&&typeof v.qaOnly==='boolean'?{enabled:v.publishEnabled as boolean,qaOnly:v.qaOnly as boolean}:null;
}
export function parseManifestCapability(raw:unknown):{enabled:boolean;mode:'PILOT'|'QA'|'DISABLED'}|null {
  const v=obj(raw);return v&&typeof v.materializeEnabled==='boolean'&&['PILOT','QA','DISABLED'].includes(String(v.mode))&&
    v.materializeEnabled===(v.mode!=='DISABLED')?{enabled:v.materializeEnabled as boolean,mode:v.mode as 'PILOT'|'QA'|'DISABLED'}:null;
}
const localDateTime=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const isTime=(v:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function localInputFor(timestamp:number):string {
  const d=new Date(timestamp);if(!Number.isFinite(d.getTime()))return '';
  const local=new Date(timestamp-d.getTimezoneOffset()*60_000);
  return local.toISOString().slice(0,16);
}
export function buildGuidedSchedulePlan(versionId:string, fromLocal:string,toLocal:string,timezone:string,
    weekdays:readonly number[],dailyStart:string|null,dailyEnd:string|null,now:number):GuidedSchedulePlan|null {
  if(!playlistUuid.test(versionId)||!localDateTime.test(fromLocal)||!localDateTime.test(toLocal)||
     typeof timezone!=='string'||timezone.length>64||!timezone||!Number.isFinite(now))return null;
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{return null;}
  const from=new Date(fromLocal),to=new Date(toLocal),a=from.getTime(),b=to.getTime();
  // Date normalization (DST gaps, impossible calendar dates) is not silently accepted.
  if(!Number.isFinite(a)||!Number.isFinite(b)||localInputFor(a)!==fromLocal||localInputFor(b)!==toLocal||
     a<now-60_000||a>now+7*day||b<=a||b-a>30*day)return null;
  if(weekdays.length>7||weekdays.some(x=>!Number.isInteger(x)||x<1||x>7)||new Set(weekdays).size!==weekdays.length)return null;
  let dailyStartMinute:null|number=null,dailyEndMinute:null|number=null;
  if(dailyStart!==null||dailyEnd!==null){
    if(!dailyStart||!dailyEnd||!isTime(dailyStart)||!isTime(dailyEnd))return null;
    dailyStartMinute=Number(dailyStart.slice(0,2))*60+Number(dailyStart.slice(3));
    dailyEndMinute=Number(dailyEnd.slice(0,2))*60+Number(dailyEnd.slice(3));
    if(dailyStartMinute>=dailyEndMinute)return null;
  }
  return {playlistVersionId:versionId,timezone,startsAt:from.toISOString(),endsAt:to.toISOString(),
    weekdays:[...weekdays].sort((x,y)=>x-y),dailyStartMinute,dailyEndMinute};
}
export function preflightWindow(startsAt:string,endsAt:string,now:number):{from:string;to:string}|null {
  const start=Math.max(now+15_000,Date.parse(startsAt));const end=Math.min(start+24*60*60_000,Date.parse(endsAt));
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>now+7*day||end-start<60_000)return null;
  return {from:new Date(start).toISOString(),to:new Date(end).toISOString()};
}
export function guidedPublishError(error:unknown):string {
  const response=obj(obj(error)?.response),status=response?.status;
  const code=obj(response?.data)?.code;
  if(code==='DOOH_GUIDED_FUTURE_PREVIOUS_WINDOW_TOO_SHORT')return 'A programação atual não tem autorização suficiente até a data escolhida. Antecipe o início ou revise a autorização de renovação.';
  if(code==='DOOH_GUIDED_FUTURE_ALREADY_PENDING')return 'Já existe uma alteração agendada. Atualize a situação e cancele a anterior antes de substituir.';
  if(code==='DOOH_GUIDED_FUTURE_WINDOW_INVALID')return 'Escolha uma data futura válida, entre um minuto e sete dias à frente.';
  if(code==='DOOH_MANIFEST_PAUSE_SCOPE')return 'Outra programação também se aplica a este aparelho. Revise os vínculos e as agendas antes de pausar; nenhuma programação foi substituída.';
  if(code==='DOOH_GUIDED_PAUSE_STALE'||code==='DOOH_GUIDED_PAUSE_SCHEDULE_CHANGED')return 'A programação pausada ou a revisão do aparelho mudou. Atualize e confira o conteúdo publicado e os horários antes de retomar.';
  if(status===409)return 'O conteúdo, os horários ou o aparelho mudaram. Atualize e revise antes de continuar.';
  if(status===403||status===402)return 'Operação não liberada para esta empresa ou permissão.';
  if(status===503)return 'A programação guiada ainda não foi habilitada no servidor.';
  if(status===401)return 'Sessão expirada; entre novamente.';
  if(status===404)return 'Tela, mídia, agenda ou dispositivo não encontrado nesta empresa.';
  return 'Resultado não confirmado. Atualize o painel e confira os registros antes de repetir.';
}
