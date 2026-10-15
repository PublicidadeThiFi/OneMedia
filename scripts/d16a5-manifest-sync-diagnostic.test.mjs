import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canReadManifestSyncDiagnostic, parseManifestSyncDiagnostic, manifestSyncSignals,
  manifestSyncError } from '../src/lib/doohManifestSyncDiagnosticContract.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const companyId = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const other = '99999999-9999-4999-8999-999999999999';
const observedAt = '2026-10-15T16:00:00.000Z';
const player = { id: playerId, lifecycleStatus: 'ACTIVE', lastSeenAt: '2026-10-15T15:59:00.000Z',
  currentManifestVersion: '1', desiredManifestVersion: '2' };
const raw = () => ({ scope: 'TECHNICAL_SNAPSHOT_ONLY', companyId, playerId, observedAt,
  lastSeenAt: player.lastSeenAt, lifecycleStatus: 'ACTIVE', offlineAfterSeconds: 180,
  currentManifestVersion: '1', desiredManifestVersion: '2', latestRecordedVersion: '2',
  latestRecordedChecksumPrefix: 'aaaaaaaaaaaa', heartbeatState: 'RECENT', versionState: 'REPORTED_BEHIND',
  versionSource: 'PLAYER_HEARTBEAT_REPORT', checksumSource: 'STORED_METADATA',
  distribution: 'NOT_CHECKED', playback: 'NOT_CHECKED', payloadIntegrity: 'NOT_CHECKED' });
const parse = (data, p = player) => parseManifestSyncDiagnostic(data, companyId, p);
test('D16A05-01 READ_ONLY/FULL técnicos podem consultar', () => {
  for (const mode of ['READ_ONLY','FULL']) assert.equal(canReadManifestSyncDiagnostic(companyId, companyId, companyId, true, mode, ['TI']), true);
});
test('D16A05-02 empresa diferente, papel comercial e módulo negado falham', () => {
  assert.equal(canReadManifestSyncDiagnostic(companyId, other, companyId, true, 'FULL', ['TI']),false);
  assert.equal(canReadManifestSyncDiagnostic(companyId, companyId, companyId, true, 'FULL', ['COMERCIAL']),false);
  assert.equal(canReadManifestSyncDiagnostic(companyId, companyId, companyId, false, 'FULL', ['TI']),false);
});
test('D16A05-03 relatório técnico válido projeta apenas metadados', () => {
  const r=parse(raw()); assert.equal(r.versionState,'REPORTED_BEHIND');
  assert.equal(JSON.stringify(r).includes('checksumSource'),false);
});
test('D16A05-04 recusa empresa ou player diferente', () => {
  assert.equal(parse({...raw(), companyId:other}), null);
  assert.equal(parse({...raw(), playerId:other}), null);
});
test('D16A05-05 recusa revisão atual e desejada diferente do detalhe', () => {
  assert.equal(parse({...raw(), currentManifestVersion:'3'}),null);
  assert.equal(parse({...raw(), desiredManifestVersion:'3'}),null);
});
test('D16A05-06 recusa heartbeat diferente do detalhe', () => {
  assert.equal(parse({...raw(), lastSeenAt:'2026-10-15T15:58:00.000Z'}),null);
});
test('D16A05-07 versão igual é reporte, não comprovação', () => {
  const p = {...player,currentManifestVersion:'2'};
  const v=parse({...raw(),currentManifestVersion:'2',versionState:'REPORTED_EQUAL'}, p);
  assert.equal(v.versionState,'REPORTED_EQUAL');
  assert.match(manifestSyncSignals(v).join(' '),/não é confirmação/i);
});
test('D16A05-08 recusa flag que falsifica entrega ou integridade', () => {
  for(const key of ['distribution','playback','payloadIntegrity']) assert.equal(parse({...raw(),[key]:'VERIFIED'}),null);
});
test('D16A05-09 checksum curto e versão persistida têm invariantes', () => {
  assert.equal(parse({...raw(),latestRecordedChecksumPrefix:'secret'}),null);
  assert.equal(parse({...raw(),latestRecordedVersion:null}),null);
  assert.equal(parse({...raw(),latestRecordedVersion:'0002'}),null);
});
test('D16A05-10 sem manifest é permitido sem inventar checksum', () => {
  const r=parse({...raw(),latestRecordedVersion:null,latestRecordedChecksumPrefix:null});
  assert.equal(r.latestRecordedVersion,null); assert.match(manifestSyncSignals(r).join(' '),/Nenhum manifest/);
});
test('D16A05-11 estado de heartbeat incoerente é rejeitado', () => {
  assert.equal(parse({...raw(),heartbeatState:'STALE'}),null);
  assert.equal(parse({...raw(),offlineAfterSeconds:0}),null);
});
test('D16A05-12 player não ativo é consultável, sem inferir online', () => {
  const p={...player,lifecycleStatus:'RETIRED'};
  const r=parse({...raw(),lifecycleStatus:'RETIRED',heartbeatState:'NOT_ACTIVE'},p);
  assert.equal(r.heartbeatState,'NOT_ACTIVE');
});
test('D16A05-13 ausência de heartbeat não indica falha de distribuição', () => {
  const p={...player,lastSeenAt:null};
  const r=parse({...raw(),lastSeenAt:null,heartbeatState:'NEVER'},p);
  assert.equal(r.heartbeatState,'NEVER');
});
test('D16A05-14 recusa data invalida e classificação falsa de relógio', () => {
  assert.equal(parse({...raw(),observedAt:'bad'}),null);
  assert.equal(parse({...raw(),heartbeatState:'CLOCK_SKEW'}),null);
});
test('D16A05-15 mensagens fixas não refletem corpo HTTP sensível', () => {
  const message=manifestSyncError({response:{status:500,data:{token:'secret'}}});
  assert.equal(message.includes('secret'),false);
  assert.match(manifestSyncError({response:{status:403}}),/Acesso/);
});
test('D16A05-16 componente executa exclusivamente GET e cancela ao mudar contexto', () => {
  const src=fs.readFileSync(path.join(root,'src/components/DoohManifestSyncDiagnosticReadOnly.tsx'),'utf8');
  assert.match(src,/apiClient\.get<unknown>/); assert.doesNotMatch(src,/apiClient\.(post|put|patch|delete)/);
  assert.match(src,/AbortController/); assert.match(src,/keyRef\.current/);
});
test('D16A05-17 integra diagnóstico sem remover inventário nem preflight QA', () => {
  const src=fs.readFileSync(path.join(root,'src/components/DoohPlayerDetailReadOnly.tsx'),'utf8');
  assert.match(src,/DoohManifestInventoryReadOnly/); assert.match(src,/DoohManifestPublishQa/);
  assert.match(src,/DoohManifestSyncDiagnosticReadOnly/);
});
test('D16A05-18 nenhum texto do painel declara exibição ou distribuição confirmada', () => {
  const src=fs.readFileSync(path.join(root,'src/components/DoohManifestSyncDiagnosticReadOnly.tsx'),'utf8');
  assert.match(src,/Não verifica bytes/); assert.doesNotMatch(src,/prova de exibição certificada/);
});
