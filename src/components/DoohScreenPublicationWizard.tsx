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
import { parseDoohPlayerDetail } from '../lib/doohPlayerDetailContract';
import { parseManifestPreflight, buildManifestCasRequest, manifestCasResult, type ManifestPreflightView } from '../lib/doohManifestPublishCasContract';
import { buildGuidedSchedulePlan, localInputFor, preflightWindow, parseGuidedScheduleCapability,
  parseGuidedScheduleLink, parseGuidedScheduleReceipt, parseSimpleBooleanCapability,
  parseSchedulePublishCapability, parseManifestCapability, guidedPublishError,
  type GuidedScheduleLink } from '../lib/doohGuidedPublicationContract';

const WEEKDAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
interface Props { screen: OperationalScreen; draft: GuidedContentDraft|null; onChanged: () => void; }
type Caps = {guided:boolean;playlist:boolean;schedule:boolean;qaOnly:boolean;manifest:boolean;mode:'PILOT'|'QA'|'DISABLED'};
const DENIED: Caps = {guided:false,playlist:false,schedule:false,qaOnly:true,manifest:false,mode:'DISABLED'};

/** UX10/F3B: explicit, independently confirmable CAS stages. No automatic retries or background publication. */
export function DoohScreenPublicationWizard({screen,draft,onChanged}:Props) {
  const {user}=useAuth();const {snapshot}=useProductAccess();
  const companyId=user?.companyId??'';
  const roles=user?.roles??[];
  const allowed=!!companyId&&snapshot?.companyId===companyId&&snapshot.modules.DOOH.granted&&snapshot.modules.DOOH.accessMode==='FULL'&&
    roles.some(r=>r==='ADMINISTRATIVO'||r==='TI');
  const contextKey=JSON.stringify([user?.id,companyId,snapshot?.companyId,snapshot?.modules.DOOH.accessMode,[...roles].sort(),screen.id,screen.playerId]);
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

  useEffect(()=>{pending.current?.abort();setLoaded(false);setPlaylist(null);setLink(null);setCaps(DENIED);setReview(null);
    setManifestWindow(null);setError('');setNotice('');setBusy(false);setConsent(false);},[contextKey]);

  useEffect(()=>{
    if(!allowed||!show){setLoaded(true);return;}
    const ctl=new AbortController(),key=contextKey;
    setLoaded(false);
    const read=async()=>{
      const c=await apiClient.get<unknown>('/dooh/operational-screens/schedule-capabilities',{signal:ctl.signal});
      if(ctl.signal.aborted||activeKey.current!==key)return;
      const enabled=parseGuidedScheduleCapability(c.data);
      if(enabled===null)throw Error('Invalid schedule capability');
      if(!enabled){setCaps(DENIED);setLink(null);setPlaylist(null);return;}
      const [p,s,pl,sc,m]=await Promise.all([
        apiClient.get<unknown>('/dooh/playlists/publish-capabilities',{signal:ctl.signal}),
        apiClient.get<unknown>('/dooh/schedules/publish-capabilities',{signal:ctl.signal}),
        apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/content-schedule`,{signal:ctl.signal}),
        apiClient.get<unknown>('/dooh/manifests/publish-capabilities',{signal:ctl.signal}),
        draft?.playlistId?apiClient.get<unknown>(`/dooh/playlists/${encodeURIComponent(draft.playlistId)}`,{signal:ctl.signal}):Promise.resolve({data:null as unknown}),
      ]);
      if(ctl.signal.aborted||activeKey.current!==key)return;
      const pp=parseSimpleBooleanCapability(p.data,'publishEnabled'),ss=parseSchedulePublishCapability(s.data),
        mm=parseManifestCapability(sc.data),ll=parseGuidedScheduleLink(pl.data,screen.id);
      const detail=draft?.playlistId?parseDoohPlaylistDetail(m.data,companyId,draft.playlistId):null;
      if(pp===null||!ss||!mm||!ll||(draft?.playlistId&&!detail))throw Error('Invalid publication contract');
      setCaps({guided:true,playlist:pp,schedule:ss.enabled,qaOnly:ss.qaOnly,manifest:mm.enabled,mode:mm.mode});
      setLink(ll);setPlaylist(detail);
    };
    void read().catch((cause:unknown)=>{if(!ctl.signal.aborted&&activeKey.current===key){setCaps(DENIED);setError(guidedPublishError(cause));}})
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
  const isBusy=busy||!loaded;
  const canPublishPlaylist=Boolean(allowed&&caps.playlist&&draft?.playlistId&&!link?.scheduleId&&
    playlist&&draft&&publishReviewReady(guidedSnapshotToCas(draft))&&draft.items.every(i=>i.mediaStatus==='READY'));

  async function run(action:(ctl:AbortController,key:string)=>Promise<string|void>) {
    if(busy||!allowed)return;
    const ctl=new AbortController();pending.current?.abort();pending.current=ctl;
    const key=contextKey,valid=()=>!ctl.signal.aborted&&activeKey.current===key;
    setBusy(true);setError('');setNotice('');
    try{const message=await action(ctl,key);if(valid()){if(message)setNotice(message);setRefresh(v=>v+1);onChanged();}}
    catch(cause:unknown){if(valid())setError(guidedPublishError(cause));}
    finally{if(pending.current===ctl)pending.current=null;if(valid()){setBusy(false);setConsent(false);}}
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

  if(!allowed)return <p className="text-sm text-gray-600">Publicar requer permissão de administrador e acesso DOOH completo.</p>;
  return <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-3" aria-label={`Publicação guiada da tela ${screen.name}`}>
    <div className="flex justify-between gap-2 items-center"><h5 className="font-semibold">3. Horários e publicação</h5><Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>setShow(v=>!v)}>{show?'Recolher':'Configurar exibição'}</Button></div>
    {!show?<p className="text-xs text-gray-600">Depois de organizar suas mídias, abra esta etapa para escolher horários e preparar a atualização do aparelho.</p>:<>
      {!loaded&&<p role="status" className="text-sm">Conferindo permissões e versões…</p>}
      {error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p>}
      {notice&&<p role="status" className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
      {!caps.guided&&loaded&&<p className="text-sm text-amber-800">Programação guiada aguardando ativação segura no servidor. Seu rascunho foi preservado.</p>}
      {caps.guided&&<>
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
            <div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1 block">Começar em<input aria-label="Início da programação" type="datetime-local" className="w-full rounded border p-2" value={start} disabled={busy} onChange={e=>setStart(e.target.value)}/></label>
              <label className="space-y-1 block">Terminar em<input aria-label="Fim da programação" type="datetime-local" className="w-full rounded border p-2" value={end} disabled={busy} onChange={e=>setEnd(e.target.value)}/></label></div>
            <p className="text-xs text-gray-600">Horários no seu fuso ({timezone}). Período máximo: 30 dias; renovação não é automática nesta etapa.</p>
            <label className="flex gap-2 items-center"><input aria-label="Limitar horário diário" type="checkbox" checked={limitedHours} disabled={busy} onChange={e=>setLimitedHours(e.target.checked)}/>Exibir somente em horários específicos</label>
            {limitedHours&&<><div className="grid grid-cols-2 gap-3"><label>De<input type="time" aria-label="Horário diário inicial" value={startHour} onChange={e=>setStartHour(e.target.value)} className="block w-full border rounded p-2"/></label><label>Até<input type="time" aria-label="Horário diário final" value={endHour} onChange={e=>setEndHour(e.target.value)} className="block w-full border rounded p-2"/></label></div>
              <p className="text-xs">Dias: nenhum selecionado significa todos os dias.</p><div className="flex gap-2 flex-wrap">{WEEKDAYS.map((name,i)=><label key={i} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={weekdays.includes(i+1)} onChange={e=>setWeekdays(old=>e.target.checked?[...old,i+1]:old.filter(d=>d!==i+1))}/>{name}</label>)}</div></>}
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
  </div>;
}
