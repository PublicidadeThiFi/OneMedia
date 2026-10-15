/** D16A06 — non-mutating frontend release-readiness regression.
 * No network, no browser, no writes and no calls to the backend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canReadManifestSyncDiagnostic, parseManifestSyncDiagnostic, manifestSyncSignals } from '../src/lib/doohManifestSyncDiagnosticContract.ts';
import { canPublishManifestQa, buildManifestCasRequest } from '../src/lib/doohManifestPublishCasContract.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const company = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const foreign = '33333333-3333-4333-8333-333333333333';
const expectedPlayer = { id: playerId, lifecycleStatus: 'ACTIVE', lastSeenAt: '2026-10-15T12:59:00.000Z',
  currentManifestVersion: '3', desiredManifestVersion: '3' };
const report = () => ({ scope: 'TECHNICAL_SNAPSHOT_ONLY', companyId: company, playerId,
  observedAt: '2026-10-15T13:00:00.000Z', lastSeenAt: expectedPlayer.lastSeenAt,
  lifecycleStatus: 'ACTIVE', offlineAfterSeconds: 180, currentManifestVersion: '3', desiredManifestVersion: '3',
  latestRecordedVersion: '3', latestRecordedChecksumPrefix: 'abababababab', heartbeatState: 'RECENT',
  versionState: 'REPORTED_EQUAL', versionSource: 'PLAYER_HEARTBEAT_REPORT', checksumSource: 'STORED_METADATA',
  payloadIntegrity: 'NOT_CHECKED', distribution: 'NOT_CHECKED', playback: 'NOT_CHECKED' });

for (const [label, file] of [
  ['inventário', 'src/components/DoohManifestInventoryReadOnly.tsx'],
  ['diagnóstico', 'src/components/DoohManifestSyncDiagnosticReadOnly.tsx'],
]) {
  test(`D16A06-FE: ${label} permanece exclusivamente GET e abortável`, () => {
    const value = source(file);
    assert.match(value, /apiClient\.get<unknown>/);
    assert.doesNotMatch(value, /apiClient\.(?:post|put|patch|delete)\s*\(/i);
    assert.match(value, /AbortController/);
    assert.match(value, /encodeURIComponent\(player\.id\)/);
  });
}
test('D16A06-FE: a visualização técnica mantém os três painéis D16A', () => {
  const view = source('src/components/DoohPlayerDetailReadOnly.tsx');
  for (const symbol of ['DoohManifestInventoryReadOnly', 'DoohManifestSyncDiagnosticReadOnly', 'DoohManifestPublishQa']) {
    assert.match(view, new RegExp(`<${symbol}\\b`));
  }
});
test('D16A06-FE: autorização READ_ONLY é técnica, company-bound e depende de grant', () => {
  assert.equal(canReadManifestSyncDiagnostic(company, company, company, true, 'READ_ONLY', ['TI']), true);
  assert.equal(canReadManifestSyncDiagnostic(company, foreign, company, true, 'READ_ONLY', ['TI']), false);
  assert.equal(canReadManifestSyncDiagnostic(company, company, foreign, true, 'READ_ONLY', ['TI']), false);
  assert.equal(canReadManifestSyncDiagnostic(company, company, company, false, 'READ_ONLY', ['TI']), false);
  assert.equal(canReadManifestSyncDiagnostic(company, company, company, true, 'READ_ONLY', ['COMERCIAL']), false);
});
test('D16A06-FE: QA materialization nega modo READ_ONLY, grant falso ou empresa distinta', () => {
  for (const [session, grantCompany, granted, mode, enabled, lifecycle] of [
    [company, company, true, 'READ_ONLY', true, 'ACTIVE'],
    [company, company, false, 'FULL', true, 'ACTIVE'],
    [foreign, company, true, 'FULL', true, 'ACTIVE'],
    [company, foreign, true, 'FULL', true, 'ACTIVE'],
    [company, company, true, 'FULL', false, 'ACTIVE'],
    [company, company, true, 'FULL', true, 'RETIRED'],
  ]) assert.equal(canPublishManifestQa(company, session, grantCompany, granted, mode, ['TI'], enabled, lifecycle), false);
});
test('D16A06-FE: a chave pública de UI só habilita QA por valor literal true', () => {
  const view = source('src/components/DoohManifestPublishQa.tsx');
  assert.match(view, /VITE_DOOH_MANIFEST_PUBLISH_QA_UI_ENABLED\s*===\s*'true'/);
  assert.match(view, /canPublishManifestQa\(/);
  assert.match(view, /confirmation\s*!==\s*'MATERIALIZAR QA'/);
  assert.match(view, /!ack/);
  assert.match(view, /window\.confirm\(/);
  assert.match(view, /apiClient\.post<unknown>/);
  assert.match(view, /publish-cas/);
  assert.doesNotMatch(view, /apiClient\.(?:put|patch|delete)\(/);
});
test('D16A06-FE: CAS não gera payload sem READY e confirmação', () => {
  const candidate = { status: 'READY', playerId, from: '2026-10-15T14:00:00.000Z',
    to: '2026-10-15T15:00:00.000Z', checksum: 'a'.repeat(64), desired: '3', current: '3' };
  assert.equal(buildManifestCasRequest(candidate, false), null);
  assert.equal(buildManifestCasRequest({...candidate, status: 'REVIEW_REQUIRED'}, true), null);
  assert.equal(buildManifestCasRequest({...candidate, checksum: 'invalid'}, true), null);
  const payload = buildManifestCasRequest(candidate, true);
  assert.ok(payload);
  assert.equal(payload.confirmation, 'MATERIALIZAR_MANIFEST_QA');
  assert.equal(Object.keys(payload).some(x => /secret|token|url|credential/i.test(x)), false);
});
test('D16A06-FE: materialização jamais ocorre antes de preflight novo e confirmação', () => {
  const src = source('src/components/DoohManifestPublishQa.tsx');
  const method = src.slice(src.indexOf('async function materialize()'));
  assert.ok(method.indexOf('await fetchPreflight()') < method.indexOf('apiClient.post<unknown>'));
  assert.ok(method.indexOf('window.confirm(') < method.indexOf('apiClient.post<unknown>'));
  assert.match(method, /pending\.current/);
});
test('D16A06-FE: igualdade de versões nunca afirma distribuição ou PoP', () => {
  const parsed = parseManifestSyncDiagnostic(report(), company, expectedPlayer);
  assert.ok(parsed);
  assert.equal(parsed.versionState, 'REPORTED_EQUAL');
  const signals = manifestSyncSignals(parsed).join(' ');
  assert.match(signals, /não é confirmação/i);
  assert.match(source('src/components/DoohManifestSyncDiagnosticReadOnly.tsx'), /Não verifica bytes/);
});
test('D16A06-FE: contratos rejeitam campos de verificação inventados', () => {
  for (const field of ['payloadIntegrity', 'distribution', 'playback']) {
    assert.equal(parseManifestSyncDiagnostic({...report(), [field]: 'VERIFIED'}, company, expectedPlayer), null);
  }
});
test('D16A06-FE: rejeita revisão divergente e payload cross-tenant', () => {
  assert.equal(parseManifestSyncDiagnostic({...report(), companyId: foreign}, company, expectedPlayer), null);
  assert.equal(parseManifestSyncDiagnostic({...report(), currentManifestVersion: '2'}, company, expectedPlayer), null);
  assert.equal(parseManifestSyncDiagnostic({...report(), playerId: foreign}, company, expectedPlayer), null);
});
test('D16A06-FE: a consulta da sincronização é sob demanda e protegida de respostas antigas', () => {
  const src = source('src/components/DoohManifestSyncDiagnosticReadOnly.tsx');
  assert.match(src, /onClick=\{\(\) => void inspect\(\)\}/);
  assert.match(src, /keyRef\.current\s*===\s*requestKey/);
  assert.doesNotMatch(src, /setInterval\s*\(/);
  assert.doesNotMatch(src, /setTimeout\s*\(/);
});
test('D16A06-FE: evidência D16 não permite exposição de armazenamento ou credenciais', () => {
  for (const file of ['src/lib/doohManifestInventoryContract.ts',
      'src/lib/doohManifestSyncDiagnosticContract.ts', 'src/lib/doohManifestPublishCasContract.ts']) {
    const src = source(file);
    assert.doesNotMatch(src, /(?:window\.)?localStorage\.setItem\(/);
    assert.doesNotMatch(src, /console\.log\(/);
  }
});
test('D16A06-FE: nenhuma alteração de dependências, configuração ou CI é solicitada por este patch', () => {
  const manifest = JSON.parse(source('package.json'));
  assert.ok(manifest.scripts['security:audit']);
  assert.ok(manifest.scripts['security:scan']);
  assert.ok(manifest.scripts['qa:final:safe']);
});
