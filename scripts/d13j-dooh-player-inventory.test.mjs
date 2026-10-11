import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  isDoohPlayerInventoryResponse,
  doohPlayerConnectionLabel,
  doohPlayerManifestLabel,
} from '../src/lib/doohPlayerInventoryContract.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const player = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Player teste', platform: 'ANDROID',
  lifecycleStatus: 'ACTIVE', online: false, lastSeenAt: null, appVersion: null,
  desiredManifestVersion: '7', currentManifestVersion: '6',
  currentAssignment: null,
};
const valid = {items: [player], meta: {page: 1, pageSize: 20, total: 1, totalPages: 1, offlineAfterSeconds: 180}};

// Contract tests: a malformed API response is not presented as a successful inventory.
test('01 accepts real backend paginated inventory shape', () => assert.equal(isDoohPlayerInventoryResponse(valid), true));
test('02 accepts media-unit association from backend projection', () => assert.equal(isDoohPlayerInventoryResponse({
  ...valid, items: [{...player, online: true, currentAssignment: { id: 'assignment', mediaUnit: { id: 'unit', label: 'Tela 01', unitType: 'SCREEN', isActive: true } }}],
}), true));
test('03 blocks unauthorized/error payloads and empty non-pagination objects', () => {
  for (const value of [null, [], {}, {statusCode:403}, {items:[]}, {items:{}}]) assert.equal(isDoohPlayerInventoryResponse(value), false);
});
test('04 fails closed on player statuses and heartbeat shape', () => {
  for (const change of [{lifecycleStatus:'PUBLISHED'}, {online:'true'}, {lastSeenAt:'not-date'}, {lastSeenAt:9}]) {
    assert.equal(isDoohPlayerInventoryResponse({...valid, items: [{...player, ...change}]}), false);
  }
});
test('05 refuses invalid manifest versions rather than invent synchronization', () => {
  for (const change of [{desiredManifestVersion: 7}, {currentManifestVersion: '-1'}, {currentManifestVersion: 'secret'}])
    assert.equal(isDoohPlayerInventoryResponse({...valid,items:[{...player,...change}]}),false);
});
test('06 refuses broken pagination and oversized page responses', () => {
  assert.equal(isDoohPlayerInventoryResponse({...valid,meta:{...valid.meta,page:0}}),false);
  assert.equal(isDoohPlayerInventoryResponse({...valid,meta:{...valid.meta,total:'1'}}),false);
  assert.equal(isDoohPlayerInventoryResponse({...valid,meta:{...valid.meta,pageSize:0}}),false);
  assert.equal(isDoohPlayerInventoryResponse({...valid,meta:{...valid.meta,pageSize:1},items:[player,player]}),false);
});
test('07 ACTIVE offline is still licensed and not reported as disconnected/deactivated', () => {
  assert.equal(doohPlayerConnectionLabel(player),'Sem heartbeat recente');
});
test('08 inactive/retired are not labelled online', () => {
  for (const lifecycleStatus of ['INACTIVE','RETIRED']) assert.equal(doohPlayerConnectionLabel({...player,lifecycleStatus,online:true}), 'Não operacional');
});
test('09 manifest mismatch remains a technical difference, not proof-of-play', () => {
  assert.match(doohPlayerManifestLabel(player), /Atual v6 \/ desejada v7/);
  assert.match(doohPlayerManifestLabel({...player,desiredManifestVersion:'6'}), /versões iguais/);
});
test('10 screen route embeds authenticated read-only component, not placeholder', () => {
  const s = readFileSync(join(root,'src/components/DoohFoundationPage.tsx'),'utf8');
  assert.match(s,/section === 'screens'\s*\?\s*\(\s*<DoohPlayerInventoryReadOnly\s*\/>/);
});
test('11 UI never sends writes, commands or manifest publication', () => {
  const s = readFileSync(join(root,'src/components/DoohPlayerInventoryReadOnly.tsx'),'utf8');
  assert.match(s,/apiClient\.get<unknown>\('\/dooh\/players'/);
  assert.doesNotMatch(s,/apiClient\.(post|put|patch|delete)\s*[<(]/i);
  assert.doesNotMatch(s,/\/pair\b|\/restart\b|\/publish\b|\/activation\b/i);
});
test('12 UI enforces roles and granted module before fetch, with cancellation', () => {
  const s = readFileSync(join(root,'src/components/DoohPlayerInventoryReadOnly.tsx'),'utf8');
  assert.match(s,/ADMINISTRATIVO/);
  assert.match(s,/\bTI\b/);
  assert.match(s,/snapshot\?\.companyId === companyId/);
  assert.match(s,/snapshot\.modules\.DOOH\.granted/);
  assert.match(s,/if \(!allowed \|\| !companyId\)/);
  assert.match(s,/controller\.abort\(\)/);
});
test('13 no license, manifest or heartbeat is equated with certified impressions', () => {
  const s = readFileSync(join(root,'src/components/DoohPlayerInventoryReadOnly.tsx'),'utf8');
  assert.match(s,/não comprovam reprodução física/);
  assert.match(s,/ACTIVE ocupa licença mesmo offline/);
});
