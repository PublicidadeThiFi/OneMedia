import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isUuidV4, validPairingCode, parsePairResult, parseScreenCandidate,
  parseAssignmentResult, safePairingError,
} from '../src/lib/doohPlayerPairingContract.ts';
import { isOperationalWriteAllowed } from '../src/lib/doohPlayerOperationsContract.ts';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (p) => readFileSync(join(root,p),'utf8');
const player = '123e4567-e89b-42d3-a456-426614174000';
const screen = '223e4567-e89b-42d3-a456-426614174000';
const point = '323e4567-e89b-42d3-a456-426614174000';
const company = '423e4567-e89b-42d3-a456-426614174000';
test('D15A1-02-01 UUID v4 verdadeiro e falso', () => {
  assert.equal(isUuidV4(player),true);
  for(const invalid of [null, '', '00000000-0000-1000-8000-000000000000', 'not-uuid', '123e4567-e89b-42d3-a456-426614174000!']) assert.equal(isUuidV4(invalid),false);
});
test('D15A1-02-02 normalização de código temporário', () => {
  assert.equal(validPairingCode('ABCD-234567'), 'ABCD234567');
  assert.equal(validPairingCode('abcd 234567'), 'ABCD234567');
  for (const bad of ['', '12', 'ABCD/999', 'A'.repeat(33), 'ábc-123456', '  ---']) assert.equal(validPairingCode(bad),null);
});
test('D15A1-02-03 claim retorna projeção sem segredos', () => {
  const data={status:'PAIRED',idempotentReplay:false, player:{id:player,name:'TV Entrada',lifecycleStatus:'ACTIVE',installationId:'secret-installation',deviceSecret:'secret-device',metadata:{secret:'hidden'}}};
  const result=parsePairResult(data);
  assert.deepEqual(result,{playerId:player,name:'TV Entrada',lifecycle:'ACTIVE',idempotentReplay:false});
  assert.doesNotMatch(JSON.stringify(result), /secret|installationId|metadata/);
});
test('D15A1-02-04 replay idempotente projetado', () => {
  const data={status:'PAIRED',idempotentReplay:true, player:{id:player,name:'TV Entrada',lifecycleStatus:'INACTIVE'}};
  assert.equal(parsePairResult(data)?.idempotentReplay,true);
});
test('D15A1-02-05 claim inválido e respostas de outros estágios recusados', () => {
  const valid={status:'PAIRED',idempotentReplay:false, player:{id:player,name:'Player',lifecycleStatus:'ACTIVE'}};
  for(const invalid of [null,{}, { ...valid,status:'PENDING'}, { ...valid,player: { ...valid.player, id:'evil'} },
    { ...valid,player: { ...valid.player,lifecycleStatus:'RETIRED'} }, { ...valid,idempotentReplay:'yes'},
    { ...valid, player: null }]) assert.equal(parsePairResult(invalid),null);
});
test('D15A1-02-06 SCREEN mesmo tenant e ativo', () => {
  const value={id:screen,mediaPointId:point,companyId:company,unitType:'SCREEN',label:'Face Shopping',isActive:true,secret:'private'};
  assert.deepEqual(parseScreenCandidate(value,company,screen),{id:screen,label:'Face Shopping',mediaPointId:point,isActive:true});
});
test('D15A1-02-07 rejeita unidade FACE, cross-tenant, IDs quebrados', () => {
  const good={id:screen,mediaPointId:point,companyId:company,unitType:'SCREEN',label:'Face Shopping',isActive:true};
  for(const invalid of [ { ...good,unitType:'FACE'}, {...good, companyId:'outro'}, {...good, id:point},
    {...good,mediaPointId:'invalid'}, {...good, isActive:1} ]) assert.equal(parseScreenCandidate(invalid,company,screen),null);
});
test('D15A1-02-08 confirmação de associação exige o player e a SCREEN esperados', () => {
  const good={changed:true,assignmentId:point,player:{id:player,currentAssignment:{mediaUnit:{id:screen,label:'Entrada'}}}};
  assert.equal(parseAssignmentResult(good,player,screen),true);
  for(const invalid of [{...good,player:{...good.player,id:point}}, {...good, assignmentId:'invalid'},
    {...good, player: {id:player,currentAssignment:{mediaUnit:{id:point}}}},
    {...good, changed:1}]) assert.equal(parseAssignmentResult(invalid,player,screen),false);
});
test('D15A1-02-09 erros HTTP não vazam tokens ou dados do servidor', () => {
  for(const status of [400,401,402,403,404,409,410,429,500,503]) {
    const result=safePairingError({response:{status,data:{secret:'my-private-token'}},message:'secret-detail'});
    assert.ok(result.length>20);
    assert.doesNotMatch(result,/secret|token|private/);
  }
});
test('D15A1-02-10 mutação somente DOOH FULL tenant e papel técnico', () => {
  assert.equal(isOperationalWriteAllowed(company,company,'FULL',true,['TI']),true);
  for (const args of [[company,'other','FULL',true,['TI']], [company,company,'READ_ONLY',true,['TI']],
      [company,company,'FULL',true,['COMERCIAL']], [company,company,'FULL',false,['TI']]]) {
    assert.equal(isOperationalWriteAllowed(...args),false);
  }
});
test('D15A1-02-11 UI pareia apenas via admin; nunca faz start/complete ou despausa', () => {
  const s=source('src/components/DoohPlayerPairingAndAssignment.tsx');
  assert.match(s, /isOperationalWriteAllowed/);
  assert.match(s,/if \(!authorized\) return null/);
  assert.match(s,/if \(!pairAllowed/);
  assert.match(s,/if \(!assignAllowed/);
  assert.match(s,/window\.confirm\(/);
  assert.match(s, /apiClient\.post<unknown>\('\/dooh\/players\/pair'/);
  assert.match(s,/Idempotency-Key/);
  assert.match(s,/apiClient\.put<unknown>\(`\/dooh\/players\/\$\{encodeURIComponent\(selectedPlayer.id\)\}\/assignment`/);
  assert.doesNotMatch(s, /apiClient\.(delete|patch)\s*\(/);
  assert.doesNotMatch(s, /apiClient\.(post|put|patch)\s*[^\n]*\/(activation-controls|pairing\/start|pairing\/complete|auth\/token)/);
  assert.doesNotMatch(s, /localStorage|sessionStorage|console\.log\(/);
});
test('D15A1-02-12 GET SCREEN validada pela empresa, role ADMIN, antes de PUT', () => {
 const s=source('src/components/DoohPlayerPairingAndAssignment.tsx');
 assert.match(s,/roles\.includes\('ADMINISTRATIVO'\)/);
 assert.match(s,/parseScreenCandidate\(response\.data, companyId, screenId\)/);
 assert.match(s,/parseScreenCandidate\(unitResponse\.data, companyId, checkedScreen.id\)/);
 assert.match(s,/parseDoohPlayerDetail\(playerResponse\.data, selectedPlayer.id\)/);
 assert.match(s,/parseAssignmentResult/);
 assert.match(s,/controller\.abort\(\)/);
});
test('D15A1-02-13 inventário read only anterior e módulo D15A1-01 preservados', () => {
 const f=source('src/components/DoohFoundationPage.tsx');
 assert.match(f, /section === 'screens'\s*\?\s*\(\s*<DoohPlayerInventoryReadOnly\s*\/>/);
 assert.match(f, /section === 'screens' && <DoohPlayerOperations \/>/);
 assert.match(f, /section === 'screens' && <DoohPlayerPairingAndAssignment \/>/);
});
