import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchedulePublishCas, canPublishDoohSchedule, publishSnapshotMatches,
 parseSchedulePublishReceipt, schedulePublishError } from '../src/lib/doohSchedulePublishCasContract.ts';
const source = file => readFileSync(join(process.cwd(), file), 'utf8');
const company = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const scheduleId = '33333333-3333-4333-8333-333333333333';
const targetId = '44444444-4444-4444-8444-444444444444';
const playerId = '55555555-5555-4555-8555-555555555555';
const versionId = '66666666-6666-4666-8666-666666666666';
const date = '2026-10-15T14:00:00.000Z';
const schedule = () => ({ id:scheduleId, name:'Agenda QA', playlistVersionId:versionId, status:'DRAFT',
 priority:'STANDARD', timezone:'America/Sao_Paulo', startsAt:'2026-10-20T08:00:00.000Z',
 endsAt:'2026-10-20T18:00:00.000Z', weekdays:[1,2,3,4,5],dailyStartMinute:480,dailyEndMinute:1080,
 createdAt:date,updatedAt:date,publishedAt:null,targetCount:1 });
const inventory = () => ({ scheduleId, status:'DRAFT',updatedAt:date,capped:false,
 targets:[{id:targetId,targetType:'PLAYER',targetId:playerId,createdAt:date}] });
test('D15D05-01 somente DOOH FULL e empresa/papel técnico autorizam a interface', () => {
 assert.equal(canPublishDoohSchedule(company,company,true,'FULL',['TI']),true);
 for(const args of [[company,foreign,true,'FULL',['TI']],[company,company,false,'FULL',['TI']],
 [company,company,true,'READ_ONLY',['TI']],[company,company,true,'FULL',['COMERCIAL']]])
   assert.equal(canPublishDoohSchedule(...args),false);
});
test('D15D05-02 payload envia todos os campos revisados', () => {
 const result=buildSchedulePublishCas(schedule(),inventory());
 assert.equal(result.expectedSchedule.playlistVersionId,versionId);
 assert.equal(result.expectedSchedule.priority,'STANDARD');
 assert.deepEqual(result.expectedSchedule.weekdays,[1,2,3,4,5]);
 assert.deepEqual(result.expectedTargets,inventory().targets);
});
test('D15D05-03 recusa agenda sem limite final ou início', () => {
 for (const input of [{endsAt:null},{startsAt:null},{endsAt:'2026-10-20T07:59:00.000Z'}])
 assert.equal(buildSchedulePublishCas({...schedule(),...input},inventory()),null);
});
test('D15D05-04 recusa mídia, janela, revisão ou estado obsoletos', () => {
 assert.equal(buildSchedulePublishCas({...schedule(),status:'PUBLISHED'},inventory()),null);
 assert.equal(buildSchedulePublishCas(schedule(),{...inventory(),updatedAt:'2026-10-15T14:00:01.000Z'}),null);
 assert.equal(buildSchedulePublishCas({...schedule(),targetCount:2},inventory()),null);
});
test('D15D05-05 não aceita destino vazio, duplicado ou sem vínculo válido', () => {
 assert.equal(buildSchedulePublishCas({...schedule(),targetCount:0},{...inventory(),targets:[]}),null);
 assert.equal(buildSchedulePublishCas({...schedule(),targetCount:2},
   {...inventory(),targets:[inventory().targets[0],inventory().targets[0]]}),null);
 assert.equal(buildSchedulePublishCas(schedule(),{...inventory(),targets:[{...inventory().targets[0],targetId:'invalid'}]}),null);
});
test('D15D05-06 pré-validação compara campos e destinos sem depender de ordenação', () => {
 assert.equal(publishSnapshotMatches(schedule(),schedule(),inventory(),inventory()),true);
 assert.equal(publishSnapshotMatches(schedule(),{...schedule(),priority:'TAKEOVER'},inventory(),inventory()),false);
 assert.equal(publishSnapshotMatches(schedule(),schedule(),inventory(),
 {...inventory(),targets:[{...inventory().targets[0],createdAt:'2026-10-15T14:00:01Z'}]}),false);
});
test('D15D05-07 recibo exige publicação nova e associação à agenda revisada', () => {
 const good={scheduleId,status:'PUBLISHED',publishedAt:'2026-10-15T14:00:01Z',alreadyPublished:false,activePlayerCount:1,checkedSchedules:0};
 assert.equal(parseSchedulePublishReceipt(good,schedule()).activePlayerCount,1);
 for (const mismatch of [{alreadyPublished:true},{scheduleId:foreign},{activePlayerCount:0},{status:'DRAFT'},
 {publishedAt:'2026-10-15T13:59:59Z'}]) assert.equal(parseSchedulePublishReceipt({...good,...mismatch},schedule()),null);
});
test('D15D05-08 erros nunca refletem tokens, URLs ou payload de servidor', () => {
 for (const status of [401,403,409,500]) assert.doesNotMatch(schedulePublishError({response:{status,data:{token:'SECRET'}}}),/SECRET/);
});
test('D15D05-09 componente possui duas confirmações e flag QA off por padrão', () => {
 const ui=source('src/components/DoohSchedulePublishQa.tsx');
 assert.match(ui,/import\.meta\.env\.MODE === 'qa'/);assert.match(ui,/VITE_DOOH_SCHEDULE_PUBLISH_QA_ENABLED/);
 assert.match(ui,/confirmation === 'PUBLICAR AGENDA'/);assert.match(ui,/window\.confirm/);
});
test('D15D05-10 preflight GET completo antes da única rota CAS de publicação', () => {
 const ui=source('src/components/DoohSchedulePublishQa.tsx');
 assert.match(ui,/apiClient\.get<unknown>\(`\/dooh\/schedules\/\$\{encodeURIComponent\(summary\.id\)\}`/);
 assert.match(ui,/apiClient\.get<unknown>\(`\/dooh\/schedules\/\$\{encodeURIComponent\(summary\.id\)\}\/targets`/);
 assert.match(ui,/\/publish-cas`/);
 assert.doesNotMatch(ui,/apiClient\.(put|patch|delete)|\/manifest|\/restart/);
});
test('D15D05-11 catálogo preserva prévia, destino e edição sem perda de funcionalidades', () => {
 const catalog=source('src/components/DoohScheduleCatalogReadOnly.tsx');
 for (const name of ['DoohSchedulePublishQa','DoohScheduleTemporalPreview','DoohScheduleTargetsCasEditor','DoohScheduleDetailsCasEditor'])
  assert.match(catalog,new RegExp('<'+name));
 assert.match(source('src/components/DoohFoundationPage.tsx'),/DoohMarketplaceCampaignSelection/);
});
const frontRoot=fileURLToPath(new URL('../',import.meta.url));
function locateBackend(){
 const configured=process.env.ONEMEDIA_BACKEND_ROOT;
 if(configured){ const root=resolve(configured);assert.ok(existsSync(join(root,'src/dooh-schedule-core/dooh-schedules.controller.ts')));return root; }
 for(const name of ['ooh-manager-api','backend','back','ooh-manager-api_atual']){
  const root=resolve(frontRoot,'..',name);
  if(existsSync(join(root,'src/dooh-schedule-core/dooh-schedules.controller.ts'))) return root;
 }
 return null;
}
test('D15D05-12 backend protege rotas antiga e nova; publica dentro de SERIALIZABLE',t => {
 const backend=locateBackend();
 if(!backend){t.skip('Backend não está no mesmo workspace; executar Jest da API.');return;}
 const ctrl=readFileSync(join(backend,'src/dooh-schedule-core/dooh-schedules.controller.ts'),'utf8');
 assert.match(ctrl,/@Post\(':id\/publish'\)/);assert.match(ctrl,/@Post\(':id\/publish-cas'\)/);
 assert.ok((ctrl.match(/assertDoohSchedulePublishQaAllowed\(req\.user\.companyId\)/g)||[]).length>=2);
 const service=readFileSync(join(backend,'src/dooh-schedule-core/dooh-schedule-publication.service.ts'),'utf8');
 assert.match(service,/matchesObservedSchedule/);assert.match(service,/matchesObservedTargets/);
 assert.match(service,/TransactionIsolationLevel\.Serializable/);
});
