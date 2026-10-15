import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canPreviewDoohSchedules, normalizePreviewInstant, buildPreviewRequest,
  parseInstantPreview, parseTimelinePreview, doohPreviewError } from '../src/lib/doohSchedulePreviewContract.ts';
const source = p => readFileSync(join(process.cwd(), p), 'utf8');
const company = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const player = '33333333-3333-4333-8333-333333333333';
const draft = '44444444-4444-4444-8444-444444444444';
const published = '55555555-5555-4555-8555-555555555555';
const published2 = '66666666-6666-4666-8666-666666666666';
const version = '77777777-7777-4777-8777-777777777777';
const from = '2026-10-20T12:00:00.000Z', to = '2026-10-20T12:03:00.000Z';
const request = buildPreviewRequest('timeline',player,'',{at:'',from,to},[draft]);
const instantRequest = buildPreviewRequest('instant',player,'',{at:'2026-10-20T12:00:00Z',from:'',to:''},[draft]);
const item = (id = published, priority = 'STANDARD', status = 'PUBLISHED') => ({ id, name:'Agenda QA', priority, status, playlistVersionId:version });
const segment = (start,end,status='READY',effective=item(),conflicts=[]) => ({from:start,to:end,status,effective,conflicts});
const timeline = () => ({ playerId:player, from,to,draftScheduleId:null,resolution:'SAMPLED_UTC_MINUTE',authoritativeForPublication:false,
  samples:3,scannedScheduleEvaluations:3,segments:[segment(from,to)] });
const point = () => ({playerId:player,at:instantRequest.at,draftScheduleId:null,status:'READY',effective:item(),matchedSchedules:[item()],conflicts:[]});
test('D15D04-01 READ_ONLY e FULL exigem grant, empresa exata e papel técnico',() => {
 assert.equal(canPreviewDoohSchedules(company,company,true,'READ_ONLY',['TI']),true);
 assert.equal(canPreviewDoohSchedules(company,company,true,'FULL',['ADMINISTRATIVO']),true);
 for(const args of [[company,foreign,true,'FULL',['TI']],[company,company,false,'FULL',['TI']],[company,company,true,'NONE',['TI']],[company,company,true,'FULL',['COMERCIAL']]])
   assert.equal(canPreviewDoohSchedules(...args),false);
});
test('D15D04-02 ISO exige offset e calendário real',() => {
 assert.equal(normalizePreviewInstant('2026-10-20T09:00:00-03:00'),from);
 for(const value of ['2026-10-20T12:00:00','2026-02-30T12:00:00Z','2026-10-20T25:00:00Z','2026-10-20T12:00:00+24:00', '2026-10-20T12:00:00ZSecret']) assert.equal(normalizePreviewInstant(value),null);
});
test('D15D04-03 formulário impede player inválido e draft estranho',() => {
 assert.equal(buildPreviewRequest('instant','bad','',{at:from,from,to},[draft]),null);
 assert.equal(buildPreviewRequest('instant',player,foreign,{at:from,from,to},[draft]),null);
 assert.equal(buildPreviewRequest('instant',player,draft,{at:from,from,to},[draft]).draftScheduleId,draft);
});
test('D15D04-04 intervalo só permite (from,to] até 24 horas e offset',() => {
 assert.equal(buildPreviewRequest('timeline',player,'',{at:'',from,to:from},[]),null);
 assert.equal(buildPreviewRequest('timeline',player,'',{at:'',from:to,to:from},[]),null);
 assert.equal(buildPreviewRequest('timeline',player,'',{at:'',from,to:'2026-10-21T12:00:01Z'},[]),null);
 assert.equal(buildPreviewRequest('timeline',player,'',{at:'',from,to:'2026-10-21T12:00:00Z'},[]).to,'2026-10-21T12:00:00.000Z');
});
test('D15D04-05 leitura de instante READY com agenda efetiva projetada',() => {
 const result=parseInstantPreview(point(),instantRequest); assert.equal(result.status,'READY'); assert.equal(result.effective.id,published);
 assert.equal('metadata' in result.effective,false);
});
test('D15D04-06 NO_MATCH válido não inventa agenda nem conflitos',() => {
 const r=point(); r.status='NO_MATCH'; r.effective=null; r.matchedSchedules=[];
 assert.deepEqual(parseInstantPreview(r,instantRequest).matchedSchedules,[]);
 r.matchedSchedules=[item()]; assert.equal(parseInstantPreview(r,instantRequest),null);
});
test('D15D04-07 empates são conflitos, não resolução arbitrária',() => {
 const r=point();r.status='CONFLICT';r.effective=null;r.matchedSchedules=[item(),item(published2)];
 r.conflicts=[{priority:'STANDARD',scheduleIds:[published,published2]}];
 assert.equal(parseInstantPreview(r,instantRequest).status,'CONFLICT');
 r.effective=item(); assert.equal(parseInstantPreview(r,instantRequest),null);
});
test('D15D04-08 recusa resposta de outro player, tempo e rascunho',() => {
 for(const patch of [{playerId:foreign},{at:to},{draftScheduleId:draft}]) assert.equal(parseInstantPreview({...point(),...patch},instantRequest),null);
});
test('D15D04-09 não aceita duplicidade ou prioridade inconsistente',() => {
 const duplicated=point(); duplicated.matchedSchedules=[item(),item()];assert.equal(parseInstantPreview(duplicated,instantRequest),null);
 const lower=point();lower.matchedSchedules=[item(),item(published2,'TAKEOVER')];assert.equal(parseInstantPreview(lower,instantRequest),null);
});
test('D15D04-10 linha do tempo confirma resolução amostrada, não publicação',() => {
 const parsed=parseTimelinePreview(timeline(),request); assert.equal(parsed.resolution,'SAMPLED_UTC_MINUTE'); assert.equal(parsed.authoritativeForPublication,false);
 assert.equal(parsed.segments[0].effective.id,published);
});
test('D15D04-11 recusa timeline que alega autoridade de publicação',() => {
 assert.equal(parseTimelinePreview({...timeline(),authoritativeForPublication:true},request),null);
 assert.equal(parseTimelinePreview({...timeline(),resolution:'AUTHORITATIVE'},request),null);
});
test('D15D04-12 não aceita lacunas, inversões ou extrapolação do período',() => {
 const a=timeline(); a.segments=[segment(from,'2026-10-20T12:01:00Z'),segment('2026-10-20T12:02:00Z',to)];
 assert.equal(parseTimelinePreview(a,request),null);
 const b=timeline();b.segments=[segment(from,'2026-10-20T12:04:00Z')];assert.equal(parseTimelinePreview(b,request),null);
});
test('D15D04-13 valida número de amostras e limite de avaliações',() => {
 assert.equal(parseTimelinePreview({...timeline(),samples:2},request),null);
 assert.equal(parseTimelinePreview({...timeline(),scannedScheduleEvaluations:75001},request),null);
});
test('D15D04-14 conflitos temporais usam grupos coerentes',() => {
 const a=timeline();a.segments=[segment(from,to,'CONFLICT',null,[{priority:'STANDARD',scheduleIds:[published,published2]}])];
 assert.equal(parseTimelinePreview(a,request).segments[0].status,'CONFLICT');
 a.segments[0].conflicts=[{priority:'STANDARD',scheduleIds:[published,published]}];assert.equal(parseTimelinePreview(a,request),null);
});
test('D15D04-15 mensagens de erro não reproduzem corpo ou token do servidor',() => {
 assert.doesNotMatch(doohPreviewError({response:{status:409,data:{token:'SECRET'}}}),/SECRET/);
});
test('D15D04-16 UI usa apenas GET e cancela em alterações de contexto',() => {
 const component=source('src/components/DoohScheduleTemporalPreview.tsx');
 assert.match(component,/apiClient\.get<unknown>\(endpoint/);
 assert.match(component,/AbortController/);assert.match(component,/liveKeyRef\.current === startKey/);
 assert.doesNotMatch(component,/apiClient\.(post|put|patch|delete)|\/publish|\/manifest|\/restart/);
});
test('D15D04-17 agenda integra painel sem apagar editores ou Marketplace',() => {
 const catalog=source('src/components/DoohScheduleCatalogReadOnly.tsx');
 assert.match(catalog,/<DoohScheduleTemporalPreview /);assert.match(catalog,/<DoohScheduleTargetsCasEditor /);assert.match(catalog,/<DoohScheduleDetailsCasEditor/);
 assert.match(source('src/components/DoohFoundationPage.tsx'),/<DoohMarketplaceCampaignSelection \/>/);
});
test('D15D04-18 backend já expõe preview e timeline read-only e limites',() => {
 const ctrl=source('../backend/src/dooh-schedule-core/dooh-schedules.controller.ts');
 assert.match(ctrl,/@Get\('preview\/timeline'\)/);assert.match(ctrl,/@Get\('preview'\)/);
 const timeline=source('../backend/src/dooh-schedule-core/dooh-schedule-timeline.service.ts');
 assert.match(timeline,/const MAX_RANGE_MS = 24/);assert.match(timeline,/MAX_MATCH_EVALUATIONS = 75_000/);
 assert.match(timeline,/authoritativeForPublication: false/);
});
