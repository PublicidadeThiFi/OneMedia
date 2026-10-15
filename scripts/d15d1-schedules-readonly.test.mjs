import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canReadDoohSchedules, parseDoohSchedule, parseDoohScheduleCatalog,
  parseDoohScheduleTargets, doohScheduleReadError } from '../src/lib/doohScheduleCatalogContract.ts';

const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const playlistVersionId = '44444444-4444-4444-8444-444444444444';
const targetId = '55555555-5555-4555-8555-555555555555';
const playerId = '66666666-6666-4666-8666-666666666666';
const now = '2026-10-15T12:00:00.000Z';
const schedule = { id, companyId: company, playlistVersionId, name: 'Agenda QA', status: 'DRAFT',
  priority: 'STANDARD', timezone: 'America/Sao_Paulo', startsAt: null, endsAt: null,
  weekdays: [1,3,5], dailyStartMinute: 480, dailyEndMinute: 1020, publishedAt: null,
  createdAt: now, updatedAt: now, _count: {targets: 1},
};
const summary = parseDoohSchedule(schedule, company);
const target = { id: targetId, companyId: company, scheduleId: id, targetType: 'PLAYER', playerId,
  groupId: null, mediaUnitId: null, mediaPointId: null, createdAt: now };
const response = { scheduleId: id, status: 'DRAFT', updatedAt: now, targets: [target] };
const source = (p) => readFileSync(join(process.cwd(),p), 'utf8');

test('D15D01-01: apenas DOOH READ_ONLY/FULL com grant, tenant e função técnica', () => {
  assert.equal(canReadDoohSchedules(company,company,true,'FULL',['TI']),true);
  assert.equal(canReadDoohSchedules(company,company,true,'READ_ONLY',['ADMINISTRATIVO']),true);
  for (const args of [[company,other,true,'FULL',['TI']],[company,company,false,'FULL',['TI']],
    [company,company,true,'NONE',['TI']],[company,company,true,'FULL',['COMERCIAL']]])
    assert.equal(canReadDoohSchedules(...args),false);
});
test('D15D01-02: catálogo aceita forma real do backend e exclui metadados privados', () => {
  const value = parseDoohScheduleCatalog([{...schedule, metadata: {token:'SECRET'}}],company);
  assert.ok(value); assert.equal(value.length,1); assert.equal(value[0].targetCount,1);
  assert.doesNotMatch(JSON.stringify(value),/SECRET|metadata|companyId|token/);
});
test('D15D01-03: catálogo vazio válido, sem total inventado ou paginação falsa', () => {
  assert.deepEqual(parseDoohScheduleCatalog([],company),[]);
  assert.equal(parseDoohScheduleCatalog({},company),null);
  assert.equal(parseDoohScheduleCatalog(Array(101).fill(schedule),company),null);
});
test('D15D01-04: isolação por empresa e IDs duplicados recusados', () => {
  assert.equal(parseDoohScheduleCatalog([{...schedule,companyId:other}],company),null);
  assert.equal(parseDoohScheduleCatalog([schedule,schedule],company),null);
});
test('D15D01-05: estados e prioridades válidos sem inferência de publicação', () => {
  for(const status of ['DRAFT','PUBLISHED','PAUSED','ARCHIVED'])
    assert.equal(parseDoohSchedule({...schedule,status},company)?.status,status);
  for(const priority of ['TAKEOVER','STANDARD','FALLBACK'])
    assert.equal(parseDoohSchedule({...schedule,priority},company)?.priority,priority);
  assert.equal(parseDoohSchedule({...schedule,status:'RUNNING'},company),null);
  assert.equal(parseDoohSchedule({...schedule,priority:'CRITICAL'},company),null);
});
test('D15D01-06: calendário e fuso não são inferidos nem corrigidos silenciosamente', () => {
  for (const data of [{timezone:42},{weekdays:[3,1]},{weekdays:[1,1]},
    {dailyStartMinute:1020,dailyEndMinute:480},{dailyStartMinute:15,dailyEndMinute:null},
    {startsAt:now,endsAt:now},{updatedAt:'no-date'}])
    assert.equal(parseDoohSchedule({...schedule,...data},company),null);
});
test('D15D01-07: janela nula, zero destinos e sem weekdays são estados válidos', () => {
  assert.ok(parseDoohSchedule({...schedule,weekdays:[],dailyStartMinute:null,dailyEndMinute:null,
    _count:{targets:0}},company));
  assert.deepEqual(parseDoohScheduleTargets({scheduleId:id,status:'DRAFT',updatedAt:now,targets:[]},company,
    parseDoohSchedule({...schedule,_count:{targets:0}},company)).targets,[]);
});
test('D15D01-08: destinos projetados minimamente e sem segredos', () => {
  const result = parseDoohScheduleTargets({...response,targets:[{...target,metadata:{token:'SECRET'}}]}, company,summary);
  assert.ok(result); assert.equal(result.targets[0].targetId,playerId);
  assert.doesNotMatch(JSON.stringify(result),/SECRET|metadata|companyId|playerId/);
});
test('D15D01-09: rejeita targets de outra agenda/empresa, revisão ou estado obsoletos', () => {
  for(const payload of [{...response,scheduleId:other},{...response,status:'PUBLISHED'},
    {...response,updatedAt:'2026-10-14T12:00:00.000Z'},
    {...response,targets:[{...target,companyId:other}]},
    {...response,targets:[{...target,scheduleId:other}]}])
    assert.equal(parseDoohScheduleTargets(payload,company,summary),null);
});
test('D15D01-10: rejeita campos indevidos, duplicados e contagem inconsistente', () => {
  for(const targets of [[{...target,groupId:other}],[target,target],
    [{...target,targetType:'GROUP'}],[{...target,playerId:'broken'}]])
    assert.equal(parseDoohScheduleTargets({...response,targets},company,summary),null);
  assert.equal(parseDoohScheduleTargets({...response,targets:[]},company,summary),null);
});
test('D15D01-11: erros fixos nunca ecoam credenciais ou payload do backend', () => {
  assert.match(doohScheduleReadError({response:{status:403,data:{token:'SECRET'}}}),/Permissão/);
  assert.doesNotMatch(doohScheduleReadError({message:'SECRET'}),/SECRET/);
});
test('D15D01-12: interface usa somente GET autenticado, com cancelamento e sem mutações', () => {
  const ui=source('src/components/DoohScheduleCatalogReadOnly.tsx');
  assert.match(ui,/apiClient\.get<unknown>\('\/dooh\/schedules'/);
  assert.match(ui,/\`\/dooh\/schedules\/\$\{encodeURIComponent\(selectedId\)\}\`/);
  assert.match(ui,/\`\/dooh\/schedules\/\$\{encodeURIComponent\(current.id\)\}\/targets\`/);
  assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)|setInterval|localStorage|\/publish|\/preview/);
  assert.match(ui,/AbortController/);
});
test('D15D01-13: seção Programação mantém playlists e Marketplace', () => {
  const page=source('src/components/DoohFoundationPage.tsx');
  assert.match(page,/<DoohScheduleCatalogReadOnly \/>/);
  assert.match(page,/<DoohPlaylistCatalogReadOnly \/>/);
  assert.match(page,/<DoohMarketplaceCampaignSelection \/>/);
  assert.match(page,/<DoohMediaLibraryReadOnly \/>/);
});
test('D15D01-14: interface documenta limites e não presume exibição', () => {
  const fs = source('src/components/DoohScheduleCatalogReadOnly.tsx');
  assert.match(fs,/até 100 agendas/);
  assert.match(fs,/não comprova distribuição, manifest atualizado, reprodução ou audiência/);
  assert.doesNotMatch(fs,/reprodução comprovada|impressões certificadas/);
});
