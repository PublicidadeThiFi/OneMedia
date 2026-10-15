import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validManifestWindow, canPublishManifestQa, parseManifestPreflight, buildManifestCasRequest,
  manifestCasResult, manifestCasError } from '../src/lib/doohManifestPublishCasContract.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const c='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const other='99999999-9999-4999-8999-999999999999';
const manifestId='66666666-6666-4666-8666-666666666666';
const sha='a'.repeat(64);
const from='2026-10-16T12:00:00.000Z', to='2026-10-16T13:00:00.000Z';
const player={id,lifecycleStatus:'ACTIVE',desiredManifestVersion:'2',currentManifestVersion:'1'};
const response=()=>({scope:'ADVISORY_READ_ONLY',companyId:c,playerId:id,window:{from,to},status:'READY',
  issues:[],candidateChecksum:sha,desiredManifestVersion:'2',currentManifestVersion:'1',
  applicableScheduleCount:1,segmentCount:1,assetCount:1,readySegmentCount:1,manifestPublished:false,
  payloadIntegrity:'NOT_CHECKED',distribution:'NOT_CHECKED',playback:'NOT_CHECKED',authorization:'NOT_GRANTED'});
const parse=(obj,p=player)=>parseManifestPreflight(obj,c,p,from,to);
test('D16A04-01 janela UTC canônica e duração até 24 horas',()=>{
 assert.equal(validManifestWindow(from,to),true);
 for(const [a,b] of [[to,from], ['2026-10-16T12:00:00Z',to],[from,'bad'],[from,'2026-10-18T13:00:00.000Z']])
  assert.equal(validManifestWindow(a,b),false);
});
test('D16A04-02 FULL técnico QA e empresas idênticas para mutação',()=>{
 assert.equal(canPublishManifestQa(c,c,c,true,'FULL',['TI'],true,'ACTIVE'),true);
 for(const args of [[c,c,c,true,'READ_ONLY',['TI'],true,'ACTIVE'], [c,other,c,true,'FULL',['TI'],true,'ACTIVE'],
  [c,c,c,true,'FULL',['COMERCIAL'],true,'ACTIVE'],[c,c,c,true,'FULL',['TI'],false,'ACTIVE'],
  [c,c,c,true,'FULL',['TI'],true,'RETIRED']]) assert.equal(canPublishManifestQa(...args),false);
});
test('D16A04-03 resposta READY com checksum e identidade válidos',()=>{
 const r=parse(response()); assert.equal(r.status,'READY'); assert.equal(r.checksum,sha);
 assert.equal(JSON.stringify(r).includes('payload'),false);
});
test('D16A04-04 nega cross-tenant e player diferente',()=>{
 assert.equal(parse({...response(),companyId:other}),null);
 assert.equal(parse({...response(),playerId:other}),null);
});
test('D16A04-05 rejeita revisão de manifest obsoleta',()=>{
 assert.equal(parse({...response(),desiredManifestVersion:'3'}),null);
 assert.equal(parse({...response(),currentManifestVersion:'2'}),null);
});
test('D16A04-06 READY não pode ter gap, checksum inválido ou zero assets',()=>{
 assert.equal(parse({...response(),candidateChecksum:'invalid'}),null);
 assert.equal(parse({...response(),readySegmentCount:0}),null);
 assert.equal(parse({...response(),assetCount:0}),null);
});
test('D16A04-07 REVIEW_REQUIRED é consultivo, sem checksum utilizável',()=>{
 const obj={...response(),status:'REVIEW_REQUIRED',candidateChecksum:null,issues:['DOOH_MANIFEST_PREFLIGHT_GAP']};
 const r=parse(obj); assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(buildManifestCasRequest(r,true),null);
});
test('D16A04-08 recusa simulação com meta falsificada sobre distribuição',()=>{
 for(const field of ['authorization','distribution','playback','payloadIntegrity'])
  assert.equal(parse({...response(),[field]:'VERIFIED'}),null);
});
test('D16A04-09 rejeita períodos divergentes, propriedades inconsistentes',()=>{
 assert.equal(parse({...response(),window:{from,to:'2026-10-17T13:00:00.000Z'}}),null);
 assert.equal(parse({...response(),applicableScheduleCount:-1}),null);
});
test('D16A04-10 require confirmação para construir CAS',()=>{
 const r=parse(response()); assert.equal(buildManifestCasRequest(r,false),null);
 const req=buildManifestCasRequest(r,true);
 assert.deepEqual(req,{from,to,expectedCandidateChecksum:sha,expectedDesiredManifestVersion:'2',
 expectedCurrentManifestVersion:'1',confirmation:'MATERIALIZAR_MANIFEST_QA'});
});
test('D16A04-11 resultado só é aceito se candidato e incremento correspondem',()=>{
 const r=parse(response()); assert.deepEqual(manifestCasResult({playerId:id,manifestId,version:'3',checksum:sha,alreadyPublished:false},r),{version:'3',alreadyPublished:false});
 assert.equal(manifestCasResult({playerId:id,manifestId,version:'4',checksum:sha,alreadyPublished:false},r),null);
 assert.equal(manifestCasResult({playerId:id,manifestId,version:'3',checksum:'b'.repeat(64),alreadyPublished:false},r),null);
});
test('D16A04-12 replay idempotente é classificado sem nova inferência',()=>{
 const r=parse(response()); assert.deepEqual(manifestCasResult({playerId:id,manifestId,version:'2',checksum:sha,alreadyPublished:true},r),{version:'2',alreadyPublished:true});
});
test('D16A04-13 erros HTTP não refletem corpos do servidor',()=>{
 const m=manifestCasError({response:{status:500,data:{access_token:'private'}}}); assert.equal(m.includes('private'),false);
 assert.match(manifestCasError({response:{status:409}}),/conflito/);
});
test('D16A04-14 painel só usa POST CAS e reexecuta GET antes da mutação',()=>{
 const src=fs.readFileSync(path.join(root,'src/components/DoohManifestPublishQa.tsx'),'utf8');
 assert.match(src,/apiClient\.get<unknown>/); assert.match(src,/apiClient\.post<unknown>/);
 assert.match(src,/\/publish-cas/); assert.doesNotMatch(src,/\`[^`]*\/publish\`/);
 assert.match(src,/const latest = await fetchPreflight/); assert.match(src,/AbortController/);
 assert.match(src,/window\.confirm/); assert.match(src,/qaUiEnabled/);
});
test('D16A04-15 parent mantém inventário e registra QA independente',()=>{
 const src=fs.readFileSync(path.join(root,'src/components/DoohPlayerDetailReadOnly.tsx'),'utf8');
 assert.match(src,/DoohManifestInventoryReadOnly/); assert.match(src,/DoohManifestPublishQa/);
});
test('D16A04-16 backend implementa CAS somente em transação e gate (quando disponível)',()=>{
 const src=path.resolve(root,'..','ooh-manager-api','src/dooh-manifest-core/dooh-manifest-publication.service.ts');
 if(!fs.existsSync(src)) return;
 const code=fs.readFileSync(src,'utf8');
 assert.match(code,/publishCas/); assert.match(code,/DOOH_MANIFEST_CAS_CANDIDATE_CHANGED/);
 assert.match(code,/Serializable/); assert.match(code,/assertDoohManifestPublishQaAllowed/);
});
