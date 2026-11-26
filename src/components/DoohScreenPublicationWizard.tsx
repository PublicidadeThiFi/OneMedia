import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { OperationalScreen } from '../lib/doohOperationalScreenContract';
import type { GuidedContentDraft } from '../lib/doohGuidedScreenContentContract';
import { guidedSnapshotToCas } from '../lib/doohGuidedScreenContentContract';
import { draftStillCurrent, parsePlaylistDraft } from '../lib/doohPlaylistDraftEditorContract';
import { parseDoohPlaylistDetail, type DoohPlaylistDetail } from '../lib/doohPlaylistCatalogContract';
import { parsePlaylistPublished, publishCasPayload, publishReviewReady } from '../lib/doohPlaylistPublishContract';
import { parseDoohSchedule, parseDoohScheduleTargets, type DoohScheduleSummary } from '../lib/doohScheduleCatalogContract';
import { buildSchedulePublishCas, parseSchedulePublishReceipt } from '../lib/doohSchedulePublishCasContract';
import { parseDoohPlayerDetail, type DoohPlayerDetailView } from '../lib/doohPlayerDetailContract';
import { parseManifestPreflight, buildManifestCasRequest, manifestCasResult, type ManifestPreflightView } from '../lib/doohManifestPublishCasContract';
import { buildGuidedSchedulePlan, localInputFor, preflightWindow, parseGuidedScheduleCapability,
  parseGuidedScheduleLink, parseGuidedScheduleReceipt, parseSimpleBooleanCapability,
  parseSchedulePublishCapability, parseManifestCapability, guidedPublishError,
  type GuidedScheduleLink } from '../lib/doohGuidedPublicationContract';

import { initialPublicationEnabled, buildInitialPublication, existingGuidedPlan, parseInitialPublicationReceipt, initialPublicationError } from '../lib/doohGuidedInitialPublicationContract';

import { republicationEnabled, canReviewRepublication, buildRepublication, parseRepublicationReceipt, futureRepublicationEnabled, parseFutureRepublication, futureRepublicationReceipt, futureRepublicationCancelled, type FutureRepublicationView } from '../lib/doohGuidedRepublicationContract';
import { restorationEnabled, parsePublicationHistory, buildRestorePublication, parseRestoreReceipt, type RestorationEntry, pausePublicationEnabled, buildPausePublication, parsePausePublicationReceipt, buildResumePublication } from '../lib/doohGuidedRepublicationContract';
import { parseInspectedPublishedVersion, type InspectedPublishedPlaylist } from '../lib/doohPublishedVersionInspectionContract';
import { NO_RENEWAL, parseRenewalCapability, reviewedRenewalMode, technicalRenewalEnd, parseRenewalStatus, renewalRevoked, type RenewalCapability, type RenewalChoice, type RenewalGrantView } from '../lib/doohGuidedRenewalContract';

function RenewalPolicy({cap,choice,scheduled,disabled,onChange}:{cap:RenewalCapability;choice:RenewalChoice;scheduled:boolean;disabled:boolean;onChange:(v:RenewalChoice)=>void}) {
  if(!cap.enabled)return null;
  return <div className="space-y-2 rounded border bg-gray-50 p-3">
    <label className="block font-medium">Atualizações automáticas da programação
      <select className="block w-full rounded border bg-white p-2" value={choice} disabled={disabled} onChange={e=>onChange(e.target.value as RenewalChoice)}>
        <option value="NONE">Sem renovação automática</option>
        <option value="BOUNDED" disabled={scheduled&&!cap.recurring}>Manter atualizada até a data final</option>
        <option value="CONTINUOUS" disabled={scheduled}>Exibir continuamente até eu interromper</option>
      </select>
    </label>
    <p className="text-xs">{choice==='CONTINUOUS'?'A data técnica é renovada pelo sistema. Você não está definindo uma data final. O acesso e a autorização precisam permanecer válidos.':choice==='BOUNDED'?'O sistema pode atualizar a programação automaticamente, mas nunca prorrogará a data final escolhida.':'Sem novo consentimento, esta publicação não delega renovações. A autorização registrada anteriormente é encerrada quando você republicar.'}</p>
    {scheduled&&!cap.recurring&&<p className="text-xs text-amber-800">A renovação de horários específicos ainda não foi liberada pelo servidor.</p>}
  </div>;
}

const minuteLabel=(value:number|null|undefined)=>value==null?'—':`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
const WEEKDAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
interface Props { screen: OperationalScreen; draft: GuidedContentDraft|null; onChanged: () => void; editorBlocked?: boolean; recommendPublication?: boolean; onPublishingChange?: (value:boolean)=>void; }
type Caps = {guided:boolean;playlist:boolean;schedule:boolean;qaOnly:boolean;manifest:boolean;mode:'PILOT'|'QA'|'DISABLED'};
const DENIED: Caps = {guided:false,playlist:false,schedule:false,qaOnly:true,manifest:false,mode:'DISABLED'};

/** UX10/F3B: explicit, independently confirmable CAS stages. No automatic retries or background publication. */
export function DoohScreenPublicationWizard({screen,draft,onChanged,editorBlocked=false,recommendPublication=false,onPublishingChange}:Props) {
  const {user}=useAuth();const {snapshot}=useProductAccess();
  const companyId=user?.companyId??'';
  const roles=user?.roles??[];
  const allowed=!!companyId&&snapshot?.companyId===companyId&&snapshot.modules.DOOH.granted&&snapshot.modules.DOOH.accessMode==='FULL'&&
    roles.some(r=>r==='ADMINISTRATIVO'||r==='TI');
  const contextKey=JSON.stringify([user?.id,companyId,snapshot?.companyId,snapshot?.modules.DOOH.accessMode,snapshot?.modules.DOOH.granted,screen.commercialUnit?.id,[...roles].sort(),screen.id,screen.playerId]);
  const activeKey=useRef(contextKey);activeKey.current=contextKey;
  const pending=useRef<AbortController|null>(null);
  const [refresh,setRefresh]=useState(0);
  const [caps,setCaps]=useState<Caps>(DENIED);
  const [playlist,setPlaylist]=useState<DoohPlaylistDetail|null>(null);
  const [link,setLink]=useState<GuidedScheduleLink|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [start,setStart]=useState(()=>localInputFor(Date.now()+10*60_000));
  const [end,setEnd]=useState(()=>localInputFor(Date.now()+14*86_400_000));
  const [timezone,setTimezone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
  const [limitedHours,setLimitedHours]=useState(false);
  const [startHour,setStartHour]=useState('08:00');
  const [endHour,setEndHour]=useState('20:00');
  const [weekdays,setWeekdays]=useState<number[]>([]);
  const [consent,setConsent]=useState(false);
  const [review,setReview]=useState<ManifestPreflightView|null>(null);
  const [manifestWindow,setManifestWindow]=useState<{from:string;to:string}|null>(null);
  const [show,setShow]=useState(false);
  const [single,setSingle]=useState(false);
  const [advanced,setAdvanced]=useState(false);
  const [linkedSchedule,setLinkedSchedule]=useState<DoohScheduleSummary|null>(null);
  const [prepared,setPrepared]=useState(false);
  const [replaceEnabled,setReplaceEnabled]=useState(false);
  const [pauseEnabled,setPauseEnabled]=useState(false);
  const [history,setHistory]=useState<{entries:RestorationEntry[];truncated:boolean}|null>(null);
  const [historyId,setHistoryId]=useState('');
  const [restoreEnd,setRestoreEnd]=useState('');
  const [restoreChoice,setRestoreChoice]=useState<RenewalChoice>('NONE');
  const [resumeSnapshot,setResumeSnapshot]=useState<InspectedPublishedPlaylist|null>(null);
  const [replacePlayer,setReplacePlayer]=useState<DoohPlayerDetailView|null>(null);
  const [replaceEnd,setReplaceEnd]=useState('');
  const [futureEnabled,setFutureEnabled]=useState(false);
  const [futureIntent,setFutureIntent]=useState<FutureRepublicationView|null>(null);
  const [futureStart,setFutureStart]=useState('');
  const [scheduleFuture,setScheduleFuture]=useState(false);
  const [replaceDays,setReplaceDays]=useState<number[]>([]);
  const [replaceDaily,setReplaceDaily]=useState(false);
  const [replaceFirst,setReplaceFirst]=useState(480);
  const [replaceLast,setReplaceLast]=useState(1200);
  const replaceRevision=useRef('');
  const [initialRenewal,setInitialRenewal]=useState<RenewalCapability>(NO_RENEWAL);
  const [replaceRenewal,setReplaceRenewal]=useState<RenewalCapability>(NO_RENEWAL);
  const [renewalChoice,setRenewalChoice]=useState<RenewalChoice>('NONE');
  const [renewalGrant,setRenewalGrant]=useState<RenewalGrantView|null>(null);
  useEffect(()=>()=>{pending.current?.abort();onPublishingChange?.(false);},[onPublishingChange]);

  useEffect(()=>{pending.current?.abort();setLoaded(false);setPlaylist(null);setLink(null);setCaps(DENIED);setReview(null);
    setManifestWindow(null);setError('');setNotice('');setBusy(false);setConsent(false);setSingle(false);setAdvanced(false);setLinkedSchedule(null);setPrepared(false);setReplaceEnabled(false);setPauseEnabled(false);setHistory(null);setHistoryId('');setRestoreEnd('');setRestoreChoice('NONE');setResumeSnapshot(null);setReplacePlayer(null);replaceRevision.current='';setReplaceEnd('');setFutureEnabled(false);setFutureIntent(null);setFutureStart('');setScheduleFuture(false);setInitialRenewal(NO_RENEWAL);setReplaceRenewal(NO_RENEWAL);setRenewalChoice('NONE');setRenewalGrant(null);onPublishingChange?.(false);},[contextKey]);

  useEffect(()=>{
    if(!allowed||!show){setLoaded(true);return;}
    const ctl=new AbortController(),key=contextKey;
    setLoaded(false);setReplaceEnabled(false);setPauseEnabled(false);setHistory(null);setHistoryId('');setRestoreEnd('');setRestoreChoice('NONE');setResumeSnapshot(null);setReplacePlayer(null);setFutureEnabled(false);setFutureIntent(null);setInitialRenewal(NO_RENEWAL);setReplaceRenewal(NO_RENEWAL);setRenewalGrant(null);setRenewalChoice('NONE');
    const read=async()=>{
      const c=await apiClient.get<unknown>('/dooh/operational-screens/schedule-capabilities',{signal:ctl.signal});
      if(ctl.signal.aborted||activeKey.current!==key)return;
      const enabled=parseGuidedScheduleCapability(c.data);
      if(enabled===null)throw Error('Invalid schedule capability');
      if(!enabled){setCaps(DENIED);setSingle(false);setLink(null);setPlaylist(null);return;}
      const [p,s,pl,sc,m,initial,republication]=await Promise.all([
        apiClient.get<unknown>('/dooh/playlists/publish-capabilities',{signal:ctl.signal}),
        apiClient.get<unknown>('/dooh/schedules/publish-capabilities',{signal:ctl.signal}),
        apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-schedule`,{signal:ctl.signal}),
        apiClient.get<unknown>('/dooh/manifests/publish-capabilities',{signal:ctl.signal}),
        draft?.playlistId?apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(draft.playlistId)}`,{signal:ctl.signal}):Promise.resolve({data:null as unknown}),
        apiClient.get<unknown>('/dooh/operational-screens/initial-publication-capabilities',{signal:ctl.signal}).catch(()=>({data:null as unknown})),
        apiClient.get<unknown>('/dooh/operational-screens/republication-capabilities',{signal:ctl.signal}).catch(()=>({data:null as unknown})),
      ]);
      if(ctl.signal.aborted||activeKey.current!==key)return;
      const pp=parseSimpleBooleanCapability(p.data,'publishEnabled'),ss=parseSchedulePublishCapability(s.data),
        mm=parseManifestCapability(sc.data),ll=parseGuidedScheduleLink(pl.data,screen.id);
      const detail=draft?.playlistId?parseDoohPlaylistDetail(m.data,companyId,draft.playlistId):null;
      if(pp===null||!ss||!mm||!ll||(draft?.playlistId&&!detail))throw Error('Invalid publication contract');
      setCaps({guided:true,playlist:pp,schedule:ss.enabled,qaOnly:ss.qaOnly,manifest:mm.enabled,mode:mm.mode});
      let saved:DoohScheduleSummary|null=null;
      const initialEnabled=initialPublicationEnabled(initial.data);
      const replaceCapability=republicationEnabled(republication.data);
      const pauseCapability=pausePublicationEnabled(republication.data);
      const futureCap=futureRepublicationEnabled(republication.data);
      let future:FutureRepublicationView|null=null;
      if(futureCap){
        const result=await apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/future-republication`,{signal:ctl.signal});
        const status=parseFutureRepublication(result.data,screen.id);
        if(!status)throw Error('Invalid future publication status');
        future=status.intent;
      }
      const initialRenewalCap=parseRenewalCapability(initial.data), replaceRenewalCap=parseRenewalCapability(republication.data);
      let activeGrant:RenewalGrantView|null=null;
      if(initialRenewalCap.enabled||replaceRenewalCap.enabled){
        const result=await apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/renewal`,{signal:ctl.signal});
        const status=parseRenewalStatus(result.data,screen.id);
        if(!status)throw Error('Invalid renewal status');
        activeGrant=status.grant;
      }
      if((initialEnabled||replaceCapability)&&ll.scheduleId){
        const result=await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(ll.scheduleId)}`,{signal:ctl.signal});
        saved=parseDoohSchedule(result.data,companyId);
        if(!saved||saved.id!==ll.scheduleId||saved.playlistVersionId!==ll.playlistVersionId||saved.status!==ll.status)throw Error('Schedule changed');
      }
      if(ctl.signal.aborted||activeKey.current!==key)return;
      let player:DoohPlayerDetailView|null=null;
      if(replaceCapability&&(saved?.status==='PUBLISHED'||(pauseCapability&&saved?.status==='PAUSED'))&&screen.playerId){
        const result=await apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(screen.playerId)}`,{signal:ctl.signal});
        player=parseDoohPlayerDetail(result.data,screen.playerId);
        if(!player)throw Error('Invalid player revision');
      }
      if(ctl.signal.aborted||activeKey.current!==key)return;
      let publishedSnapshot:InspectedPublishedPlaylist|null=null;
      if(pauseCapability&&saved?.status==='PAUSED'&&detail){
        const reference=detail.versions.find(v=>v.id===saved!.playlistVersionId&&v.status==='PUBLISHED'&&v.version===detail.currentVersion);
        if(reference){const result=await apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(detail.id)}/versions/${reference.version}/items`,{signal:ctl.signal});
          publishedSnapshot=parseInspectedPublishedVersion(result.data,detail.id,reference);if(!publishedSnapshot)throw Error('Invalid paused publication snapshot');}
      }
      if(ctl.signal.aborted||activeKey.current!==key)return;
      if(saved&&replaceCapability&&(saved.status==='PUBLISHED'||(pauseCapability&&saved.status==='PAUSED'))){
        const revision=JSON.stringify([contextKey,saved.id,saved.updatedAt,player?.desiredManifestVersion]);
        if(replaceRevision.current!==revision){
          replaceRevision.current=revision;
          setReplaceEnd(saved.endsAt&&Date.parse(saved.endsAt)>Date.now()?localInputFor(Date.parse(saved.endsAt)):'');
          setReplaceDays(saved.weekdays);setReplaceDaily(saved.dailyStartMinute!==null);
          setReplaceFirst(saved.dailyStartMinute??480);setReplaceLast(saved.dailyEndMinute??1200);
        }
      }
      let historyResult:ReturnType<typeof parsePublicationHistory>=null;
      if(restorationEnabled(republication.data)&&(saved?.status==='PUBLISHED'||(pauseCapability&&saved?.status==='PAUSED'))&&screen.playerId&&detail){
        const response=await apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/publication-history`,{signal:ctl.signal}).catch(()=>({data:null}));
        historyResult=parsePublicationHistory(response.data,screen.id,detail.id,screen.playerId);
      }
      if(ctl.signal.aborted||activeKey.current!==key)return;
      setHistory(historyResult);
      setPauseEnabled(pauseCapability);setResumeSnapshot(publishedSnapshot);setReplaceEnabled(replaceCapability);setFutureEnabled(futureCap);setFutureIntent(future);if(!futureCap)setScheduleFuture(false);setReplacePlayer(player);setInitialRenewal(initialRenewalCap);setReplaceRenewal(replaceRenewalCap);setRenewalGrant(activeGrant);
      setSingle(initialEnabled);setLinkedSchedule(saved);setLink(ll);setPlaylist(detail);
    };
    void read().catch((cause:unknown)=>{if(!ctl.signal.aborted&&activeKey.current===key){setCaps(DENIED);setSingle(false);setError(guidedPublishError(cause));}})
      .finally(()=>{if(!ctl.signal.aborted&&activeKey.current===key)setLoaded(true);});
    return()=>ctl.abort();
  },[allowed,show,contextKey,screen.id,draft?.playlistId,refresh,companyId]);

  const latestPublished=playlist?.versions.find(v=>v.status==='PUBLISHED'&&v.version===playlist.currentVersion)??null;
  const unreviewed=draft?.items.length??0;
  const chosen=latestPublished&&unreviewed===0?latestPublished:null;
  const needsQA=(import.meta.env.MODE==='qa'&&import.meta.env.VITE_DOOH_SCHEDULE_PUBLISH_QA_ENABLED!=='true');
  const scheduleAllowed=caps.schedule&&(!caps.qaOnly||!needsQA);
  const manifestAllowed=caps.manifest&&(caps.mode==='PILOT'||
    (caps.mode==='QA'&&import.meta.env.VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED==='true'));
  const plan=chosen?buildGuidedSchedulePlan(chosen.id,start,end,timezone,weekdays,
    limitedHours?startHour:null,limitedHours?endHour:null,Date.now()):null;
  const isBusy=busy||!loaded||editorBlocked;
  const initialScheduled=link?.scheduleId?!!(linkedSchedule&&(linkedSchedule.weekdays.length||linkedSchedule.dailyStartMinute!==null||linkedSchedule.dailyEndMinute!==null)):limitedHours;
  const initialMode=reviewedRenewalMode(renewalChoice,initialRenewal,initialScheduled);
  const initialPlan=draft?.draftId ? (link?.scheduleId ? existingGuidedPlan(linkedSchedule,draft.draftId) :
    buildGuidedSchedulePlan(draft.draftId,start,initialMode==='CONTINUOUS'?technicalRenewalEnd(Date.parse(start)):end,timezone,limitedHours?weekdays:[],limitedHours?startHour:null,limitedHours?endHour:null,Date.now())) : null;
  const initialBase=buildInitialPublication(draft,screen.playerId,initialPlan);
  const initialBody=initialBase&&initialMode?{...initialBase,...(initialRenewal.enabled?{renewalMode:initialMode}:{})}:null;
  const singleAllowed=single&&!!link&&link.playerId===screen.playerId&&!screen.commercialUnit&&screen.player?.lifecycleStatus==='ACTIVE'&&
    caps.playlist&&scheduleAllowed&&manifestAllowed;
  const replacing=replaceEnabled&&link?.status==='PUBLISHED';
  const paused=link?.status==='PAUSED';
  const pauseBody=pauseEnabled&&!screen.commercialUnit&&scheduleAllowed&&manifestAllowed?buildPausePublication(link,linkedSchedule,replacePlayer,screen.id,screen.playerId,screen.contentPlaylistId):null;
  const resumeMode=reviewedRenewalMode(renewalChoice,replaceRenewal,!!(linkedSchedule&&(linkedSchedule.weekdays.length||linkedSchedule.dailyStartMinute!==null)));
  const resumeBody=(now:number)=>{
    if(!paused||!pauseEnabled||screen.commercialUnit||!caps.playlist||!scheduleAllowed||!manifestAllowed||!resumeMode)return null;
    const body=buildResumePublication(resumeSnapshot,link,linkedSchedule,replacePlayer,screen.id,screen.playerId,screen.contentPlaylistId,resumeMode==='CONTINUOUS'?technicalRenewalEnd(now):replaceEnd,now);
    return body?{...body,...(replaceRenewal.enabled?{renewalMode:resumeMode}:{})}:null;
  };
  const replaceAllowed=replacing&&!screen.commercialUnit&&!!draft?.playlistId&&draft.playlistId===screen.contentPlaylistId&&caps.playlist&&scheduleAllowed&&manifestAllowed&&canReviewRepublication(link,linkedSchedule,replacePlayer,screen.id,screen.playerId);
  const replacementMode=reviewedRenewalMode(renewalChoice,replaceRenewal,replaceDays.length>0||replaceDaily);
  const replacementBody=(now:number)=>{
    if(!replacementMode)return null;
    const startMs=scheduleFuture?Date.parse(futureStart):now;
    const continuousEnd=scheduleFuture?technicalRenewalEnd(startMs):technicalRenewalEnd(now);
    const body=buildRepublication(draft,link,linkedSchedule,replacePlayer,screen.id,screen.playerId,replacementMode==='CONTINUOUS'?continuousEnd:replaceEnd,linkedSchedule?.timezone??timezone,replaceDays,replaceDaily?replaceFirst:null,replaceDaily?replaceLast:null,now,scheduleFuture?futureStart:undefined);
    return body?{...body,...(replaceRenewal.enabled?{renewalMode:replacementMode}:{})}:null;
  };
  const historical=history?.entries.find(e=>e.scheduleId===historyId)??null;
  const historicalScheduled=!!(historical&&(historical.weekdays.length||historical.dailyStartMinute!==null));
  const restoreMode=reviewedRenewalMode(restoreChoice,replaceRenewal,historicalScheduled);
  const restoreBody=(now:number)=>{
    if(!restoreMode||!(replaceAllowed||(paused&&pauseEnabled&&!screen.commercialUnit&&caps.playlist&&scheduleAllowed&&manifestAllowed))||draft?.playlistId!==screen.contentPlaylistId)return null;
    const body=buildRestorePublication(historical,draft,link,linkedSchedule,replacePlayer,screen.id,screen.playerId,restoreMode==='CONTINUOUS'?technicalRenewalEnd(now):restoreEnd,now);
    return body?{...body,renewalMode:restoreMode}:null;
  };
  const canPublishPlaylist=Boolean(allowed&&caps.playlist&&draft?.playlistId&&!link?.scheduleId&&
    playlist&&draft&&publishReviewReady(guidedSnapshotToCas(draft))&&draft.items.every(i=>i.mediaStatus==='READY'));

  async function run(action:(ctl:AbortController,key:string)=>Promise<string|void>) {
    if(busy||pending.current||!allowed||editorBlocked)return;
    const ctl=new AbortController();pending.current?.abort();pending.current=ctl;
    const key=contextKey,valid=()=>!ctl.signal.aborted&&activeKey.current===key;
    setBusy(true);onPublishingChange?.(true);setError('');setNotice('');
    try{const message=await action(ctl,key);if(valid()){if(message)setNotice(message);setRefresh(v=>v+1);onChanged();}}
    catch(cause:unknown){if(valid()){setError(action===publishInitial?initialPublicationError(cause):guidedPublishError(cause));setRefresh(v=>v+1);onChanged();}}
    finally{if(pending.current===ctl)pending.current=null;if(valid()){setBusy(false);onPublishingChange?.(false);setConsent(false);}}
  }

  async function revokeRenewal(ctl:AbortController,key:string){
    const grant=renewalGrant;
    if(!grant||!window.confirm('Revogar a renovação automática? Isso interrompe novas renovações, mas não interrompe imediatamente uma programação já autorizada.'))return;
    const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/renewal/${encodeURIComponent(grant.id)}/revoke`,undefined,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!renewalRevoked(result.data,screen.id,grant.id))throw Error('Renewal revocation not confirmed');
    setRenewalGrant(null);
    return 'Renovação automática revogada. A programação já autorizada pode continuar até sua validade.';
  }

  async function pausePublication(ctl:AbortController,key:string){
    if(!pauseBody||futureIntent?.status==='PENDING')throw Error('Pause unavailable');
    if(!window.confirm('Pausar esta tela? A renovação automática será revogada. Uma tela sem internet pode continuar exibindo até a autorização local expirar.'))return;
    const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/pause-publication`,pauseBody,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!parsePausePublicationReceipt(result.data,screen.id,pauseBody))throw Error('Unconfirmed pause');
    setPrepared(false);setRenewalChoice('NONE');
    return 'Pausa preparada no servidor. A tela precisa receber a atualização; não é confirmação de interrupção física.';
  }
  async function resumePublication(ctl:AbortController,key:string){
    const body=resumeBody(Date.now());
    if(!body||futureIntent?.status==='PENDING')throw Error('Resume unavailable');
    if(!window.confirm('Retomar o conteúdo anteriormente publicado com o período e a autorização agora escolhidos? O rascunho em edição não será publicado.'))return;
    const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/resume-publication`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!parseRepublicationReceipt(result.data,screen.id,body.expectedPlayerId,body.expectedScheduleId,body.playlistVersionId,body.expectedManifestVersion))throw Error('Unconfirmed resume');
    setPrepared(true);
    return 'Retomada preparada. A programação será exibida nos horários escolhidos após instalação e autorização da tela.';
  }

  async function restorePublication(ctl:AbortController,key:string){
    const body=restoreBody(Date.now());
    if(!body||futureIntent?.status==='PENDING')throw Error('Restore unavailable');
    if(!window.confirm('Restaurar esta programação anterior em uma nova publicação? Os horários serão preservados, o período será novo e a renovação automática anterior será revogada. Somente a nova autorização escolhida poderá ser registrada. Rascunhos alterados não serão sobrescritos.'))return;
    const response=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/restore-publication`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!parseRestoreReceipt(response.data,screen.id,body))throw Error('Unconfirmed restoration');
    setPrepared(true);setHistoryId('');setRestoreEnd('');
    return 'Programação anterior restaurada em uma nova publicação. Aguarde a instalação no aparelho.';
  }

  async function publishReplacement(ctl:AbortController,key:string){
    const body=replacementBody(Date.now());
    if(!replaceAllowed||!body||futureIntent?.status==='PENDING')throw Error('Replacement unavailable');
    if(scheduleFuture){
      if(!futureEnabled||!window.confirm(`Agendar alteração para ${new Date(body.startsAt).toLocaleString('pt-BR')}? A programação atual não será alterada agora. A ativação depende das permissões e da sincronização.`))return;
      const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/future-republication`,body,{signal:ctl.signal});
      if(ctl.signal.aborted||activeKey.current!==key)return;
      if(!futureRepublicationReceipt(result.data,screen.id,body.startsAt,body.endsAt))throw Error('Unconfirmed future publication');
      setScheduleFuture(false);setFutureStart('');
      return 'Alteração agendada. A programação atual não foi substituída. Consulte a situação após o horário escolhido.';
    }
    const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/republication`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!parseRepublicationReceipt(result.data,screen.id,body.expectedPlayerId,body.expectedScheduleId,body.playlistVersionId,body.expectedManifestVersion))throw Error('Unconfirmed replacement');
    setPrepared(true);
    return 'Nova programação publicada. A atualização do aparelho ainda não confirma exibição.';
  }

  async function cancelFuture(ctl:AbortController,key:string){
    const intent=futureIntent;
    if(!intent||intent.status!=='PENDING'||!window.confirm('Cancelar a alteração agendada? A programação atual será mantida.'))return;
    const result=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/future-republication/${encodeURIComponent(intent.id)}/cancel`,undefined,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!futureRepublicationCancelled(result.data,screen.id,intent.id))throw Error('Unconfirmed cancellation');
    return 'Alteração agendada cancelada.';
  }

  async function publishInitial(ctl:AbortController,key:string){
    if(!singleAllowed||!initialBody||!draft||!screen.playerId)throw Error('Initial publication unavailable');
    const body=initialBody;
    // One explicit confirmation; server owns all CAS steps. No automatic mutation retry here.
    const response=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/initial-publication`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    const receipt=parseInitialPublicationReceipt(response.data,screen.id,body.expectedPlayerId,[body.playlistVersionId,...(latestPublished?[latestPublished.id]:[])],link?.scheduleId??null);
    if(!receipt)throw Error('Unconfirmed initial publication');
    setPrepared(true);
    return receipt.alreadyPrepared?'A atualização desta programação já foi preparada. Confira a situação do aparelho.':
      'Programação publicada e atualização preparada. O aparelho receberá quando sincronizar; a exibição ainda não foi confirmada.';
  }

  async function publishPlaylist(ctl:AbortController,key:string){
    if(!draft?.playlistId||!playlist)throw Error('No playlist');
    const before=guidedSnapshotToCas(draft),body=publishCasPayload(before);
    if(!before||!body)throw Error('No publishable draft');
    const id=encodeURIComponent(before.playlistId);
    const [draftResp,latest]=await Promise.all([
      apiClient.get<unknown>(`/dooh/playlists/${id}/draft/items`,{signal:ctl.signal}),
      apiClient.get<unknown>(`/dooh/playlists/${id}`,{signal:ctl.signal})]);
    if(ctl.signal.aborted||activeKey.current!==key)return;
    const fresh=parsePlaylistDraft(draftResp.data,before.playlistId),current=parseDoohPlaylistDetail(latest.data,companyId,before.playlistId);
    if(!fresh||!draftStillCurrent(before,fresh)||!current||current.currentVersion!==playlist.currentVersion)
      throw Error('Review changed');
    if(!window.confirm(`Publicar ${before.items.length} mídia(s) desta tela? Isso cria uma versão de conteúdo; ainda não envia aos aparelhos.`))return;
    const res=await apiClient.post<unknown>(`/dooh/playlists/${id}/publish-cas`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    const receipt=parsePlaylistPublished(res.data,before,current.currentVersion);
    if(!receipt)throw Error('Unconfirmed playlist publication');
    return `Lista publicada como versão ${receipt.publishedVersion}. Ainda faltam horários e atualização do aparelho.`;
  }

  async function createSchedule(ctl:AbortController,key:string){
    if(!screen.playerId||!plan||!chosen)throw Error('Schedule plan unavailable');
    if(!window.confirm(`Criar programação para ${screen.name}?\nDe ${new Date(plan.startsAt).toLocaleString('pt-BR')} até ${new Date(plan.endsAt).toLocaleString('pt-BR')}.\nA agenda ficará em rascunho até sua confirmação seguinte.`))return;
    const {data}=await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-schedule`,plan,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    const receipt=parseGuidedScheduleReceipt(data,screen.id,screen.playerId,chosen.id);
    if(!receipt)throw Error('Unconfirmed schedule link');
    return receipt.created?'Horário salvo em rascunho. Revise e publique na etapa seguinte.':'Horário já estava salvo. Revise antes de publicar.';
  }

  async function publishSchedule(ctl:AbortController,key:string){
    if(!link?.scheduleId||!screen.playerId||link.status!=='DRAFT')throw Error('Schedule draft unavailable');
    const id=encodeURIComponent(link.scheduleId);
    const detail=await apiClient.get<unknown>(`/dooh/schedules/${id}`,{signal:ctl.signal});
    const summary=parseDoohSchedule(detail.data,companyId);
    if(!summary||summary.id!==link.scheduleId||summary.playlistVersionId!==link.playlistVersionId||summary.status!=='DRAFT')throw Error('Schedule changed');
    const targetsResponse=await apiClient.get<unknown>(`/dooh/schedules/${id}/targets`,{signal:ctl.signal});
    const targets=parseDoohScheduleTargets(targetsResponse.data,companyId,summary);
    if(!targets||targets.targets.length!==1||targets.targets[0].targetType!=='PLAYER'||targets.targets[0].targetId!==screen.playerId)throw Error('Player link changed');
    const body=buildSchedulePublishCas(summary,targets);
    if(!body)throw Error('Schedule not publishable');
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!window.confirm(`Publicar os horários da tela “${screen.name}”? Isso registra a agenda; a atualização do aparelho ainda será uma etapa separada.`))return;
    const receipt=await apiClient.post<unknown>(`/dooh/schedules/${id}/publish-cas`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!parseSchedulePublishReceipt(receipt.data,summary))throw Error('Unconfirmed schedule publication');
    return 'Horários publicados. A atualização do aparelho ainda precisa ser preparada.';
  }

  async function inspectManifest(ctl:AbortController,key:string){
    if(!screen.playerId||!link?.scheduleId||link.status!=='PUBLISHED')throw Error('Schedule not published');
    const s=await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(link.scheduleId)}`,{signal:ctl.signal});
    const summary=parseDoohSchedule(s.data,companyId);
    if(!summary||summary.status!=='PUBLISHED')throw Error('Schedule not published');
    const window=preflightWindow(summary.startsAt??'',summary.endsAt??'',Date.now());
    if(!window)throw Error('Preview not in seven day horizon');
    const resp=await apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(screen.playerId)}`,{signal:ctl.signal});
    const player=parseDoohPlayerDetail(resp.data,screen.playerId);
    if(!player||player.lifecycleStatus!=='ACTIVE')throw Error('Player not active');
    const response=await apiClient.get<unknown>(`/dooh/manifests/players/${encodeURIComponent(screen.playerId)}/preflight`,
      {params:window,signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    const preflight=parseManifestPreflight(response.data,companyId,player,window.from,window.to);
    if(!preflight)throw Error('Preflight data changed');
    setReview(preflight);setManifestWindow(window);
    return preflight.status==='READY'?'Revisão aprovada. Confira abaixo antes de enviar a atualização.':
      'A revisão encontrou uma lacuna no horário ou conteúdo. Ajuste a agenda antes de enviar.';
  }

  async function materialize(ctl:AbortController,key:string){
    if(!review||review.status!=='READY'||!manifestWindow||!screen.playerId||!manifestAllowed)return;
    const resp=await apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(screen.playerId)}`,{signal:ctl.signal});
    const player=parseDoohPlayerDetail(resp.data,screen.playerId);
    if(!player||player.lifecycleStatus!=='ACTIVE'||player.desiredManifestVersion!==review.desired||
      player.currentManifestVersion!==review.current)throw Error('Player version changed');
    const res=await apiClient.get<unknown>(`/dooh/manifests/players/${encodeURIComponent(screen.playerId)}/preflight`,
      {params:manifestWindow,signal:ctl.signal});
    const latest=parseManifestPreflight(res.data,companyId,player,manifestWindow.from,manifestWindow.to);
    if(!latest||latest.status!=='READY'||latest.checksum!==review.checksum||latest.desired!==review.desired||latest.current!==review.current)
      throw Error('Preflight changed');
    const body=buildManifestCasRequest(latest,true,caps.mode==='PILOT'?'PILOT':'QA');
    if(!body)throw Error('Manifest request invalid');
    if(!window.confirm('Confirmar envio da atualização para este aparelho? O servidor poderá disponibilizar a nova programação; isso não comprova que ela já está na tela.'))return;
    const receipt=await apiClient.post<unknown>(`/dooh/manifests/players/${encodeURIComponent(screen.playerId)}/publish-cas`,body,{signal:ctl.signal});
    if(ctl.signal.aborted||activeKey.current!==key)return;
    if(!manifestCasResult(receipt.data,latest))throw Error('Manifest publication not confirmed');
    setReview(null);setManifestWindow(null);
    return 'Atualização preparada pelo servidor. O dispositivo deve sincronizar; confirme a versão instalada antes de declarar exibição.';
  }

  const historyPanel=history&&<details className="rounded border p-3 space-y-2"><summary className="font-medium cursor-pointer">Restaurar programação anterior</summary>
            <p>Selecione uma publicação anterior desta tela. A sequência e os horários serão preservados; escolha uma nova data final. A renovação automática não será transferida; escolha uma nova autorização, se disponível.</p>
            {history.truncated&&<p>Exibindo até 50 publicações arquivadas recentes elegíveis.</p>}
            {!history.entries.length?<p>Nenhuma publicação anterior elegível para restauração.</p>:<>
              <label className="block">Publicação anterior<select className="block w-full rounded border p-2" value={historyId} disabled={isBusy} onChange={e=>{setHistoryId(e.target.value);setRestoreChoice('NONE');}}><option value="">Selecione</option>{history.entries.map(e=><option key={e.scheduleId} value={e.scheduleId}>{new Date(e.publishedAt).toLocaleString('pt-BR')} · versão {e.version} · {e.items.length} mídia(s)</option>)}</select></label>
              {historical&&<><ol className="list-decimal pl-5">{historical.items.map(i=><li key={i.id}>{i.name} · {i.durationMs/1000}s</li>)}</ol><p>{historical.weekdays.length?historical.weekdays.map(d=>WEEKDAYS[d-1]).join(', '):'Todos os dias'} · {historical.dailyStartMinute===null?'Dia inteiro':`${minuteLabel(historical.dailyStartMinute)}–${minuteLabel(historical.dailyEndMinute)}`} · {historical.timezone}</p>{restoreMode!=='CONTINUOUS'&&<label className="block">Nova data final (horário local do navegador: {timezone})<input type="datetime-local" className="w-full rounded border p-2" value={restoreEnd} disabled={isBusy} onChange={e=>setRestoreEnd(e.target.value)}/></label>}<RenewalPolicy cap={replaceRenewal} choice={restoreChoice} scheduled={historicalScheduled} disabled={isBusy} onChange={setRestoreChoice}/></>}
              <p className="text-xs">Se houver alterações salvas no rascunho, a restauração será recusada para preservá-las. Aguarde a instalação da versão atual e cancele eventuais alterações futuras.</p>
              <Button type="button" variant="outline" disabled={isBusy||prepared||!restoreBody(Date.now())||futureIntent?.status==='PENDING'} onClick={()=>void run(restorePublication)}>Confirmar e restaurar programação</Button>
            </>}
          </details>;
  if(!allowed)return <p className="text-sm text-gray-600">Publicar requer permissão de administrador e acesso DOOH completo.</p>;
  return <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-3" aria-label={`Publicação guiada da tela ${screen.name}`}>
    <div className="flex justify-between gap-2 items-center"><h5 className="font-semibold">3. Horários e publicação</h5><Button type="button" variant={recommendPublication && !show ? "default" : "outline"} size="sm" disabled={busy||editorBlocked} aria-expanded={show} onClick={()=>setShow(v=>!v)}>{show?'Recolher':'Configurar exibição'}</Button></div>
    {!show?<p className="text-xs text-gray-600">Depois de organizar suas mídias, abra esta etapa para escolher horários e preparar a atualização do aparelho.</p>:<>
      {!loaded&&<p role="status" className="text-sm">Conferindo se a programação pode ser publicada…</p>}
      {error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p>}
      {notice&&<p role="status" className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
      {!caps.guided&&loaded&&<p className="text-sm text-amber-800">A publicação guiada ainda não está disponível para esta empresa. Seu rascunho foi preservado.</p>}
      {caps.guided&&<>
        {renewalGrant&&<div className="rounded border p-3 space-y-2 text-sm"><strong>Autorização de renovação registrada</strong>
          <p>{renewalGrant.mode==='CONTINUOUS'?'Contínua, sujeita às permissões e ao licenciamento.':`Até ${new Date(renewalGrant.authorizedEndAt!).toLocaleString('pt-BR')}.`}</p>
          <p className="text-xs">O registro não comprova que a renovação está em execução. Uma republicação encerra esta autorização e utiliza a nova escolha.</p>
          <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={()=>void run(revokeRenewal)}>Revogar renovação automática</Button>
        </div>}
        {paused&&<div className="rounded-lg border p-3 space-y-3 text-sm">
          <strong>Programação pausada no servidor</strong>
          {historyPanel}
          <p>A versão anterior pode continuar numa tela sem contato enquanto estiver autorizada. O pareamento e as mídias foram preservados.</p>
          {!pauseEnabled?<p>O servidor ainda não liberou a retomada guiada.</p>:<>
            <p>Retomar o conteúdo publicado antes da pausa, sem incluir alterações do rascunho.</p>
            {resumeSnapshot&&<p>{playlist?.name} · {resumeSnapshot.items.length} mídia(s) · duração total {resumeSnapshot.totalDurationMs/1000}s.</p>}
            <p>Horários preservados: {linkedSchedule?.dailyStartMinute===null?'Dia inteiro':`${minuteLabel(linkedSchedule?.dailyStartMinute)}–${minuteLabel(linkedSchedule?.dailyEndMinute)}`} · {linkedSchedule?.weekdays.length?linkedSchedule.weekdays.map(d=>WEEKDAYS[d-1]).join(', '):'Todos os dias'} · {linkedSchedule?.timezone}.</p>
            {resumeMode!=='CONTINUOUS'&&<label className="block">Nova data final (horário local do navegador: {timezone})<input type="datetime-local" value={replaceEnd} disabled={isBusy} className="w-full rounded border p-2" onChange={e=>setReplaceEnd(e.target.value)}/></label>}
            <RenewalPolicy cap={replaceRenewal} choice={renewalChoice} scheduled={!!(linkedSchedule&&(linkedSchedule.weekdays.length||linkedSchedule.dailyStartMinute!==null))} disabled={isBusy} onChange={setRenewalChoice}/>
            {!resumeBody(Date.now())&&<p role="status" className="text-amber-800">Aguarde a tela reportar a pausa, confira a programação publicada e escolha um período válido.</p>}
            <Button type="button" disabled={isBusy||!resumeBody(Date.now())||futureIntent?.status==='PENDING'} onClick={()=>void run(resumePublication)}>Confirmar e retomar programação</Button>
          </>}
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={()=>{setPrepared(false);setRefresh(v=>v+1);onChanged();}}>Atualizar situação</Button>
        </div>}
        {replacing&&<div className="rounded-lg border p-3 space-y-3 text-sm">
          <strong>Atualizar programação</strong>
          {historyPanel}
          {pauseEnabled&&<div className="rounded border p-2 space-y-2"><p>Interrompa a programação desta tela sem excluir mídias nem desvincular o aparelho. A renovação automática será revogada.</p><Button type="button" variant="outline" disabled={isBusy||!pauseBody||futureIntent?.status==='PENDING'} onClick={()=>void run(pausePublication)}>Pausar programação</Button></div>}
          <p>Revise a sequência de {screen.name}. {scheduleFuture?'A alteração será tentada no horário escolhido, sem substituir a programação agora.':'A substituição começa agora; a programação anterior permanece no aparelho enquanto autorizada e até a atualização segura.'}</p>
          {futureIntent&&<div className="rounded border p-2 space-y-2" role="status"><strong>{futureIntent.status==='PENDING'?'Alteração agendada':futureIntent.status==='ACTIVATED'?'Atualização preparada pelo servidor':futureIntent.status==='CANCELLED'?'Alteração cancelada':'Alteração não aplicada'}</strong><p>Início solicitado: {new Date(futureIntent.startsAt).toLocaleString('pt-BR')}.</p>{futureIntent.status==='PENDING'&&<Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={()=>void run(cancelFuture)}>Cancelar alteração agendada</Button>}<p className="text-xs">A situação não comprova exibição física.</p></div>}
          {futureEnabled&&futureIntent?.status!=='PENDING'&&<><label className="flex gap-2"><input type="checkbox" checked={scheduleFuture} disabled={isBusy} onChange={e=>{setScheduleFuture(e.target.checked);if(e.target.checked&&!futureStart)setFutureStart(localInputFor(Date.now()+10*60_000));}}/>Iniciar em uma data futura</label>{scheduleFuture&&<label className="block">Começar em (horário local do navegador: {timezone})<input type="datetime-local" className="w-full rounded border p-2" value={futureStart} disabled={isBusy} onChange={e=>setFutureStart(e.target.value)}/><span className="text-xs">Até sete dias à frente; o aparelho precisa sincronizar. Não edite a sequência revisada antes da ativação.</span></label>}</>}
          {draft?.items.length?<ol className="list-decimal pl-5">{draft.items.map(item=><li key={item.id}>{item.mediaName} · {item.durationMs/1000}s</li>)}</ol>:<p>Adicione mídia pronta à sequência.</p>}
          {replacementMode!=='CONTINUOUS'&&<label className="block">Terminar em (horário local do navegador: {timezone})<input type="datetime-local" className="w-full rounded border p-2" value={replaceEnd} disabled={isBusy} onChange={e=>setReplaceEnd(e.target.value)}/></label>}
          <p className="text-xs text-gray-600">Fuso dos horários de exibição: {linkedSchedule?.timezone}. Período técnico máximo de 30 dias.</p>
          <div className="flex gap-2 flex-wrap">{WEEKDAYS.map((name,i)=><label key={i} className="flex gap-1 items-center"><input type="checkbox" checked={replaceDays.includes(i+1)} disabled={isBusy||replacementMode==='CONTINUOUS'} onChange={e=>setReplaceDays(old=>e.target.checked?[...old,i+1]:old.filter(d=>d!==i+1))}/>{name}</label>)}</div>
          <p className="text-xs">Nenhum dia selecionado = todos os dias.</p>
          <label className="flex gap-2"><input type="checkbox" checked={replaceDaily} disabled={isBusy||replacementMode==='CONTINUOUS'} onChange={e=>setReplaceDaily(e.target.checked)}/>Limitar horário diário</label>
          {replaceDaily&&<div className="grid grid-cols-2 gap-2"><label>De (HH:mm)<input className="w-full rounded border p-2" type="time" value={Number.isFinite(replaceFirst)?minuteLabel(replaceFirst):''} disabled={isBusy} onChange={e=>{const [h,m]=e.target.value.split(':').map(Number);setReplaceFirst(e.target.value?h*60+m:NaN);}}/></label><label>Até (HH:mm)<input className="w-full rounded border p-2" type="time" value={replaceLast===1440?'00:00':Number.isFinite(replaceLast)?minuteLabel(replaceLast):''} disabled={isBusy} onChange={e=>{const [h,m]=e.target.value.split(':').map(Number);setReplaceLast(e.target.value?(h*60+m||1440):NaN);}}/></label><p className="col-span-2 text-xs">Fim às 00:00 significa fim do dia (24:00).</p></div>}
          <RenewalPolicy cap={replaceRenewal} choice={renewalChoice} scheduled={replaceDays.length>0||replaceDaily} disabled={isBusy} onChange={setRenewalChoice}/>
          {!replaceAllowed&&<p role="status" className="text-amber-800">Aguarde a versão publicada ser reportada pelo aparelho e confira o vínculo e as permissões. O servidor ainda verificará a programação anterior.</p>}
          {replaceAllowed&&!replacementBody(Date.now())&&<p className="text-amber-800">Confira a sequência salva, a data final e os horários.</p>}
          <Button type="button" disabled={isBusy||!replaceAllowed||!replacementBody(Date.now())||prepared||futureIntent?.status==='PENDING'} onClick={()=>void run(publishReplacement)}>{busy?'Preparando atualização…':prepared?'Atualização preparada':scheduleFuture?'Confirmar e agendar alteração':'Confirmar e atualizar programação'}</Button>
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={()=>{setPrepared(false);setRefresh(v=>v+1);onChanged();}}>Atualizar situação</Button>
        </div>}
        {single&&!replacing&&!paused&&<div className="rounded-lg border p-3 space-y-3 text-sm">
          <strong>Publicar programação</strong>
          <p>Confira a tela, a sequência e o período. Uma confirmação prepara a atualização do aparelho.</p>
          <p><strong>{screen.name}</strong>{screen.player?` · ${screen.player.name}`:''}</p>
          {draft?.items.length?<ol className="list-decimal pl-5">{draft.items.map(item=><li key={item.id}>{item.mediaName} · {item.durationMs/1000}s</li>)}</ol>:<p>Adicione mídia pronta à sequência.</p>}
          {link?.scheduleId?<div className="space-y-1"><p>Período já salvo: {linkedSchedule?.startsAt?new Date(linkedSchedule.startsAt).toLocaleString('pt-BR',{timeZone:linkedSchedule.timezone}):'—'} até {linkedSchedule?.endsAt?new Date(linkedSchedule.endsAt).toLocaleString('pt-BR',{timeZone:linkedSchedule.timezone}):'—'} ({linkedSchedule?.timezone}).</p>
            <p>{linkedSchedule?.dailyStartMinute===null?'Dia inteiro':`${minuteLabel(linkedSchedule?.dailyStartMinute)}–${minuteLabel(linkedSchedule?.dailyEndMinute)}`} · {linkedSchedule?.weekdays.length?linkedSchedule.weekdays.map(d=>WEEKDAYS[d-1]).join(', '):'Todos os dias'}</p>
            <p className="text-xs text-gray-600">A retomada só reutiliza a agenda e o conteúdo idênticos; não substitui uma programação existente.</p></div>:<>
            <div className="grid sm:grid-cols-2 gap-3"><label>Começar em<input aria-label="Início da publicação guiada" aria-invalid={!start} type="datetime-local" className="w-full rounded border p-2" value={start} disabled={isBusy} onChange={e=>setStart(e.target.value)}/></label>
            {initialMode!=='CONTINUOUS'&&<label>Terminar em<input aria-label="Fim da publicação guiada" aria-invalid={!end || end <= start} type="datetime-local" className="w-full rounded border p-2" value={end} disabled={isBusy} onChange={e=>setEnd(e.target.value)}/></label>}</div>
            <p className="text-xs text-gray-600">Fuso: {timezone}. Período máximo de 30 dias.</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={limitedHours} disabled={isBusy||initialMode==='CONTINUOUS'} onChange={e=>setLimitedHours(e.target.checked)}/>Definir dias e horários</label>
            {!limitedHours&&initialMode!=='CONTINUOUS'&&<p className="text-xs text-gray-600">Exibir continuamente durante o período escolhido.</p>}
            {limitedHours&&<><div className="grid grid-cols-2 gap-3"><label>De<input type="time" value={startHour} disabled={isBusy} onChange={e=>setStartHour(e.target.value)} className="block w-full border rounded p-2"/></label><label>Até<input type="time" value={endHour} disabled={isBusy} onChange={e=>setEndHour(e.target.value)} className="block w-full border rounded p-2"/></label></div>
            <div className="flex gap-2 flex-wrap">{WEEKDAYS.map((name,i)=><label key={i} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={weekdays.includes(i+1)} disabled={isBusy} onChange={e=>setWeekdays(old=>e.target.checked?[...old,i+1]:old.filter(d=>d!==i+1))}/>{name}</label>)}</div><p className="text-xs">Nenhum dia selecionado = todos os dias.</p></>}
          </>}
          <RenewalPolicy cap={initialRenewal} choice={renewalChoice} scheduled={initialScheduled} disabled={isBusy} onChange={setRenewalChoice}/>
          {!singleAllowed&&<p className="text-amber-800">Conecte um aparelho ativo independente e confirme as permissões de publicação. Telas comerciais permanecem no fluxo avançado.</p>}
          {!initialBody&&singleAllowed&&<p className="text-amber-800">Confira as mídias prontas, a ordem salva e o período de exibição (início em até 7 dias, fim após o início, máximo de 30 dias).</p>}
          <Button type="button" disabled={isBusy||!singleAllowed||!initialBody||prepared} onClick={()=>void run(publishInitial)}>{busy?'Preparando programação…':prepared?'Atualização preparada':link?.scheduleId?'Confirmar e retomar publicação':'Confirmar e publicar'}</Button>
          <p className="text-xs text-gray-600">Publicar não comprova exibição. Caso alguma etapa não conclua, a próxima confirmação consulta os dados salvos; nenhum conteúdo diferente será reaproveitado. A renovação automática depende da autorização do servidor.</p>
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={()=>{setPrepared(false);setRefresh(v=>v+1);onChanged();}}>Atualizar situação</Button>
        </div>}
        {single&&!replacing&&!paused&&<Button type="button" variant="outline" size="sm" disabled={isBusy} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{advanced?'Ocultar operação avançada':'Operação avançada'}</Button>}
        {!replacing&&!paused&&(!single||advanced)&&<>
        {!single&&<p className="text-sm text-gray-600">A confirmação única não está disponível. Use as etapas de publicação separadas abaixo.</p>}
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <strong>Etapa A — Publicar suas mídias</strong>
          <p>{unreviewed>0?`${unreviewed} arquivo(s) ainda na sequência em edição.`:chosen?`Lista publicada (versão ${chosen.version}).`:'Adicione mídia à sequência antes de publicar.'}</p>
          {!caps.playlist&&<p className="text-xs text-amber-800">O servidor não autorizou publicação de listas neste ambiente.</p>}
          <Button size="sm" type="button" disabled={isBusy||!canPublishPlaylist||!consent} onClick={()=>void run(publishPlaylist)}>Publicar lista de mídias</Button>
        </div>
        <div className="rounded-lg border p-3 space-y-3 text-sm">
          <strong>Etapa B — Definir quando mostrar</strong>
          {!screen.playerId&&<p className="text-amber-800">Conecte um aparelho em “Minhas telas” antes de publicar. A edição das mídias pode ser feita sem aparelho.</p>}
          {link?.scheduleId?<p>Agenda vinculada: <strong>{link.status==='DRAFT'?'Salva, aguardando publicação':link.status==='PUBLISHED'?'Publicada':'Indisponível'}</strong>. Uma agenda existente não é substituída automaticamente.</p>:<>
            <div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1 block">Começar em<input aria-label="Início da programação" type="datetime-local" className="w-full rounded border p-2" value={start} disabled={isBusy} onChange={e=>setStart(e.target.value)}/></label>
              <label className="space-y-1 block">Terminar em<input aria-label="Fim da programação" type="datetime-local" className="w-full rounded border p-2" value={end} disabled={isBusy} onChange={e=>setEnd(e.target.value)}/></label></div>
            <p className="text-xs text-gray-600">Horários no seu fuso ({timezone}). Período máximo: 30 dias; renovação não é automática nesta etapa.</p>
            <label className="flex gap-2 items-center"><input aria-label="Limitar horário diário" type="checkbox" checked={limitedHours} disabled={isBusy} onChange={e=>setLimitedHours(e.target.checked)}/>Exibir somente em horários específicos</label>
            {limitedHours&&<><div className="grid grid-cols-2 gap-3"><label>De<input type="time" aria-label="Horário diário inicial" disabled={isBusy} value={startHour} onChange={e=>setStartHour(e.target.value)} className="block w-full border rounded p-2"/></label><label>Até<input type="time" aria-label="Horário diário final" disabled={isBusy} value={endHour} onChange={e=>setEndHour(e.target.value)} className="block w-full border rounded p-2"/></label></div>
              <p className="text-xs">Dias: nenhum selecionado significa todos os dias.</p><div className="flex gap-2 flex-wrap">{WEEKDAYS.map((name,i)=><label key={i} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={weekdays.includes(i+1)} disabled={isBusy} onChange={e=>setWeekdays(old=>e.target.checked?[...old,i+1]:old.filter(d=>d!==i+1))}/>{name}</label>)}</div></>}
            {!plan&&chosen&&<p className="text-xs text-amber-800">Confira início, fim e horários: o período deve começar em até 7 dias, durar no máximo 30 dias e terminar após o início.</p>}
            <Button type="button" size="sm" disabled={isBusy||!chosen||!screen.playerId||!plan||!scheduleAllowed||!consent} onClick={()=>void run(createSchedule)}>Salvar horários</Button>
          </>}
          {!scheduleAllowed&&<p className="text-xs text-amber-800">Publicação de agendas indisponível. O acesso é autorizado pelo servidor.</p>}
          {link?.status==='DRAFT'&&<Button type="button" size="sm" disabled={isBusy||!scheduleAllowed||!consent} onClick={()=>void run(publishSchedule)}>Publicar horários</Button>}
        </div>
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <strong>Etapa C — Preparar atualização do aparelho</strong>
          <p>Primeiro, confira se o período tem programação completa. Depois, confirme a atualização. O dispositivo precisará sincronizar.</p>
          <Button type="button" variant="outline" size="sm" disabled={isBusy||link?.status!=='PUBLISHED'||!screen.playerId} onClick={()=>void run(inspectManifest)}>Revisar atualização</Button>
          {review&&<p className={review.status==='READY'?'text-green-700':'text-amber-800'} role="status">{review.status==='READY'?`Conteúdo pronto para preparar (${review.assets} arquivo(s), ${review.segments} trecho(s)).`:`Ainda não pronto: ${review.issues.join(', ')}`}</p>}
          {!manifestAllowed&&<p className="text-xs text-amber-800">O servidor ainda não autorizou a preparação de atualização nesta empresa.</p>}
          <Button type="button" size="sm" disabled={isBusy||!manifestAllowed||review?.status!=='READY'||!consent} onClick={()=>void run(materialize)}>Preparar atualização</Button>
          <p className="text-xs text-gray-600">Preparada ≠ instalada ≠ exibida. A confirmação de exibição será feita depois no equipamento.</p>
        </div>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>Conferi a tela, os arquivos e o período. Autorizo a ação selecionada; cada etapa exige confirmação separada.</span></label>
        <Button variant="outline" type="button" size="sm" disabled={busy} onClick={()=>{setReview(null);setManifestWindow(null);setRefresh(v=>v+1);}}>Atualizar situação</Button>
        </>}
      </>}
    </>}
  </div>;
}
