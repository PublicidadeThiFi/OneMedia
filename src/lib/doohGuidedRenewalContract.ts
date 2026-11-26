import { playlistUuid } from './doohPlaylistCatalogContract.ts';
import { localInputFor } from './doohGuidedPublicationContract.ts';
export type RenewalChoice = 'NONE' | 'BOUNDED' | 'CONTINUOUS';
export type RenewalMode = 'NONE' | 'FINITE' | 'RECURRING' | 'CONTINUOUS';
export type RenewalCapability = {enabled:boolean;recurring:boolean};
export const NO_RENEWAL:RenewalCapability = {enabled:false,recurring:false};
const record=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
export function parseRenewalCapability(v:unknown):RenewalCapability {
  const r=record(v);return r?.enabled===true&&r.renewalEnabled===true?{enabled:true,recurring:r.recurringRenewalEnabled===true}:NO_RENEWAL;
}
export function reviewedRenewalMode(choice:RenewalChoice,cap:RenewalCapability,scheduled:boolean):RenewalMode|null {
  if(choice==='NONE')return 'NONE';
  if(!cap.enabled)return null;
  if(choice==='CONTINUOUS')return scheduled?null:'CONTINUOUS';
  if(choice==='BOUNDED')return scheduled?(cap.recurring?'RECURRING':null):'FINITE';
  return null;
}
/** A technical horizon, not a customer-selected end. Keep margin for minute truncation. */
export function technicalRenewalEnd(start:number):string {
  return Number.isFinite(start)?localInputFor(start+29*86_400_000):'';
}
export type RenewalGrantView={id:string;mode:Exclude<RenewalMode,'NONE'>;authorizedEndAt:string|null};
export function parseRenewalStatus(raw:unknown,screenId:string):{grant:RenewalGrantView|null}|null {
  const r=record(raw);if(!r||r.screenId!==screenId)return null;
  if(r.grant===null)return {grant:null};
  const g=record(r.grant);
  if(!g||typeof g.id!=='string'||!playlistUuid.test(g.id)||(g.mode!=='FINITE'&&g.mode!=='RECURRING'&&g.mode!=='CONTINUOUS'))return null;
  if(g.mode==='CONTINUOUS')return g.authorizedEndAt===null?{grant:{id:g.id,mode:g.mode,authorizedEndAt:null}}:null;
  if(typeof g.authorizedEndAt!=='string'||!Number.isFinite(Date.parse(g.authorizedEndAt)))return null;
  return {grant:{id:g.id,mode:g.mode,authorizedEndAt:g.authorizedEndAt}};
}
export function renewalRevoked(raw:unknown,screenId:string,grantId:string):boolean {
  const r=record(raw);return r?.screenId===screenId&&r.grantId===grantId&&r.revoked===true;
}
