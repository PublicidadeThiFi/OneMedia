import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlayerGroupDetail, parsePlayerCommandHistory, safeAuditReadError } from '../src/lib/doohPlayerAuditContract.ts';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (p) => readFileSync(join(root,p), 'utf8');
const groupId = '123e4567-e89b-42d3-a456-426614174000';
const playerId = '223e4567-e89b-42d3-a456-426614174000';
const commandId = '323e4567-e89b-42d3-a456-426614174000';
const at = '2026-10-14T12:30:00.000Z';
const group = { id: groupId, name: 'Entradas', scheduleTargetCount: 1,
  members: [{ id: playerId, name: 'Player 01', lifecycleStatus: 'ACTIVE', online: false,
    memberSince: at, installationId: 'SENSITIVE', metadata: { secret: 'SENSITIVE' } }], installationId: 'SENSITIVE' };
const command = { id: commandId, playerId, type: 'RESTART', status: 'QUEUED', requestedAt: at, expiresAt: at,
  nonce: 'SENSITIVE', idempotencyKeyHash: 'SENSITIVE', requestedBy: { email: 'SENSITIVE' }, result: { secret: 'SENSITIVE' } };
test('D15A1-03-01: detalhe de grupo é projeção mínima sem instalação, credencial ou metadados', () => {
  const projected = parsePlayerGroupDetail(group, groupId);
  assert.deepEqual(projected, { id: groupId, name: 'Entradas', scheduleTargetCount: 1,
    members: [{ id: playerId, name: 'Player 01', lifecycleStatus: 'ACTIVE', online: false, memberSince: at }] });
  assert.doesNotMatch(JSON.stringify(projected), /SENSITIVE|installationId|metadata/);
});
test('D15A1-03-02: grupo vazio é estado válido', () => {
  assert.deepEqual(parsePlayerGroupDetail({...group, members: [], scheduleTargetCount: 0}, groupId)?.members, []);
});
test('D15A1-03-03: isolamento de grupo, DTO inválido e duplicações falham fechados', () => {
  for (const invalid of [null, {}, {...group, id: playerId}, {...group, members: 'abc'},
    {...group, members: [group.members[0],group.members[0]]},
    {...group, members: [{...group.members[0], id:'invalid'}]},
    {...group, members: [{...group.members[0], lifecycleStatus:'ACTIVE', online:'yes'}]},
    {...group, members: [{...group.members[0], lifecycleStatus:'RETIRED', online:true}]},
    {...group, members: [{...group.members[0], memberSince:'yesterday'}]},
    {...group, scheduleTargetCount: -1}, {...group, name: ''}]) assert.equal(parsePlayerGroupDetail(invalid, groupId),null);
});
test('D15A1-03-04: histórico de comandos fica restrito a 50 e a um player', () => {
  const projected = parsePlayerCommandHistory({items:[command]}, playerId);
  assert.deepEqual(projected,[{id:commandId,type:'RESTART',status:'QUEUED',requestedAt:at,expiresAt:at}]);
  assert.doesNotMatch(JSON.stringify(projected),/SENSITIVE|requestedBy|nonce|result|idempotency/);
  assert.deepEqual(parsePlayerCommandHistory({items:[]},playerId),[]);
});
test('D15A1-03-05: recusa comandos de outro player, status desconhecido e replay duplicado', () => {
  for(const invalid of [null,{}, {items:[{...command,playerId:groupId}]}, {items:[{...command,status:'SUCCEEDED'}]},
    {items:[command,command]}, {items:[{...command,requestedAt:'not-date'}]}, {items:[{...command,id:'bad'}]},
    {items:Array(51).fill(command)}]) assert.equal(parsePlayerCommandHistory(invalid,playerId),null);
});
test('D15A1-03-06: tratamento de erros nunca exibe conteúdo de backend', () => {
  for (const status of [400,401,403,404,429,500]) {
    const message = safeAuditReadError({response:{status,data:{accessToken:'SENSITIVE'}},message:'SENSITIVE'});
    assert.ok(message.length > 10); assert.doesNotMatch(message,/SENSITIVE|accessToken/);
  }
});
test('D15A1-03-07: componente usa apenas GET autenticados e AbortController', () => {
  const ui=source('src/components/DoohPlayerAuditReadOnly.tsx');
  assert.match(ui, /if \(!authorized\) return null/);
  assert.match(ui, /snapshot\?\.companyId === companyId/);
  assert.match(ui, /snapshot\.modules\.DOOH\.granted/);
  assert.match(ui, /role === 'ADMINISTRATIVO' \|\| role === 'TI'/);
  assert.match(ui, /apiClient\.get<unknown>\('\/dooh\/player-groups'/);
  assert.match(ui, /apiClient\.get<unknown>\(`\/dooh\/players\/\$\{encodeURIComponent\(selectedPlayer.id\)\}\/commands`/);
  assert.match(ui, /parsePlayerGroupDetail/); assert.match(ui, /parsePlayerCommandHistory/);
  assert.match(ui, /AbortController/); assert.match(ui, /controller\.abort\(\)/);
  assert.doesNotMatch(ui, /apiClient\.(post|put|patch|delete)\s*\(/i);
  assert.doesNotMatch(ui, /localStorage|sessionStorage|console\.log\(/);
});
test('D15A1-03-08: guards preservam D13J/K e D15A1-01/02 sem alteração', () => {
  const ui=source('src/components/DoohFoundationPage.tsx');
  for (const component of ['DoohPlayerInventoryReadOnly','DoohPlayerOperations','DoohPlayerPairingAndAssignment','DoohPlayerAuditReadOnly']) {
    assert.match(ui, new RegExp(`<${component}\\s*\\/>`));
  }
});
