import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoohSchedule, parseDoohScheduleTargets } from '../src/lib/doohScheduleCatalogContract.ts';
import { canWriteScheduleTargets, buildScheduleTargetsCas, targetsSnapshotMatches,
  parseScheduleTargetsCasReceipt, doohScheduleTargetWriteError } from '../src/lib/doohScheduleTargetsCasContract.ts';
const source = (p) => readFileSync(join(process.cwd(), p), 'utf8');
const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const linkId = '44444444-4444-4444-8444-444444444444';
const playerId = '55555555-5555-4555-8555-555555555555';
const groupId = '66666666-6666-4666-8666-666666666666';
const stamp = '2026-10-15T09:00:00.000Z';
const schedule = { id, companyId: company, playlistVersionId: other, name: 'QA', status: 'DRAFT', priority: 'STANDARD', timezone: 'UTC', startsAt: null, endsAt: null,
  weekdays: [], dailyStartMinute: null, dailyEndMinute: null, publishedAt: null, createdAt: stamp, updatedAt: stamp, _count: { targets: 1 } };
const summary = parseDoohSchedule(schedule, company);
const target = { id: linkId, companyId: company, scheduleId: id, targetType: 'PLAYER', playerId, groupId: null, mediaUnitId: null, mediaPointId: null, createdAt: stamp };
const inventory = parseDoohScheduleTargets({ scheduleId: id, status: 'DRAFT', updatedAt: stamp, targets: [target] }, company, summary);
test('D15D02-01 FULL técnico, grant e empresa idêntica obrigatórios', () => {
  assert.equal(canWriteScheduleTargets(company,company,true,'FULL',['TI']),true);
  for (const args of [[company,company,true,'READ_ONLY',['TI']],[company,other,true,'FULL',['TI']],
    [company,company,false,'FULL',['TI']],[company,company,true,'FULL',['COMERCIAL']]])
    assert.equal(canWriteScheduleTargets(...args),false);
});
test('D15D02-02 inclusão gera snapshot integral e apenas novo destino', () => {
  const body=buildScheduleTargetsCas(summary,inventory,{action:'add',type:'GROUP',id:groupId});
  assert.equal(body.targets.length,2); assert.equal(body.expectedTargets[0].id,linkId);
  assert.equal(body.expectedTargets[0].createdAt,stamp); assert.equal(body.expectedUpdatedAt,stamp);
});
test('D15D02-03 remoção explícita preserva snapshot e remove só 1', () => {
  const body=buildScheduleTargetsCas(summary,inventory,{action:'remove',associationId:linkId});
  assert.equal(body.targets.length,0); assert.equal(body.expectedTargets.length,1);
});
test('D15D02-04 não adiciona destino repetido nem UUID inválido', () => {
  assert.equal(buildScheduleTargetsCas(summary,inventory,{action:'add',type:'PLAYER',id:playerId}),null);
  assert.equal(buildScheduleTargetsCas(summary,inventory,{action:'add',type:'GROUP',id:'not-uuid'}),null);
  assert.equal(buildScheduleTargetsCas(summary,inventory,{action:'add',type:'OTHER',id:groupId}),null);
});
test('D15D02-05 remoção sem vínculo conhecido é bloqueada', () => {
  assert.equal(buildScheduleTargetsCas(summary,inventory,{action:'remove',associationId:groupId}),null);
});
test('D15D02-06 impede alteração em agenda não-DRAFT', () => {
  assert.equal(buildScheduleTargetsCas({...summary,status:'PUBLISHED'},inventory,{action:'remove',associationId:linkId}),null);
});
test('D15D02-07 bloqueia snapshot com revisão/contagem conflitante', () => {
  assert.equal(buildScheduleTargetsCas({...summary,updatedAt:'2026-10-14T09:00:00.000Z'},inventory,{action:'remove',associationId:linkId}),null);
  assert.equal(buildScheduleTargetsCas({...summary,targetCount:2},inventory,{action:'remove',associationId:linkId}),null);
});
test('D15D02-08 compara ID e data das associações, não apenas destino', () => {
  assert.equal(targetsSnapshotMatches(inventory,{...inventory,targets:inventory.targets.map(t=>({...t,createdAt: '2026-10-14T09:00:00.000Z'}))}),false);
  assert.equal(targetsSnapshotMatches(inventory,inventory),true);
});
test('D15D02-09 impede mutação com snapshot de outra agenda', () => {
  assert.equal(targetsSnapshotMatches(inventory,{...inventory,scheduleId:other}),false);
});
test('D15D02-10 confirmação estrita de recibo da API', () => {
  assert.deepEqual(parseScheduleTargetsCasReceipt({scheduleId:id,updatedAt:stamp,changed:true,count:2},id,2),{updatedAt:stamp,changed:true});
  assert.equal(parseScheduleTargetsCasReceipt({scheduleId:id,updatedAt:stamp,changed:false,count:2},id,2),null);
  assert.equal(parseScheduleTargetsCasReceipt({scheduleId:other,updatedAt:stamp,changed:true,count:2},id,2),null);
});
test('D15D02-11 não expõe segredos nem corpos HTTP de erros', () => {
  assert.doesNotMatch(doohScheduleTargetWriteError({response:{status:409,data:{token:'SECRET'}}}),/SECRET/);
});
test('D15D02-12 interface usa apenas targets/cas e preflight GET', () => {
  const component=source('src/components/DoohScheduleTargetsCasEditor.tsx');
  assert.match(component,/apiClient\.put<unknown>\(`\/dooh\/schedules\/\$\{encodeURIComponent\(summary\.id\)\}\/targets\/cas`/);
  assert.match(component,/Promise\.all/); assert.match(component,/targetsSnapshotMatches/);
  assert.doesNotMatch(component,/apiClient\.(post|patch|delete)|\/publish|\/preview|\/targets`\s*,\s*candidate/);
});
test('D15D02-13 frontend mantém o catálogo somente leitura e Marketplace', () => {
  const catalog=source('src/components/DoohScheduleCatalogReadOnly.tsx');
  assert.match(catalog,/<DoohScheduleTargetsCasEditor /);
  assert.match(catalog,/apiClient\.get<unknown>/);
  const page=source('src/components/DoohFoundationPage.tsx');
  assert.match(page,/<DoohMarketplaceCampaignSelection \/>/);
});
const backendFile = '../ooh-manager-api/src/dooh-schedule-core/dooh-schedule-targets.service.ts';
test('D15D02-14 backend valida snapshot no SERIALIZABLE e preserva vínculos', { skip: !existsSync(join(process.cwd(), backendFile)) }, () => {
  const s=source(backendFile);
  assert.match(s,/async replaceCas\(/); assert.match(s,/TransactionIsolationLevel\.Serializable/);
  assert.match(s,/expectedTargets/); assert.match(s,/createdAt\.toISOString\(\)/);
  assert.match(s,/removed\.map/); assert.match(s,/const added/); assert.match(s,/marketplaceD12/);
});
