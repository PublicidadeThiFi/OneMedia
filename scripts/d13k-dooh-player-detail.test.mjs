import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDoohPlayerDetail, doohPlayerDetailSignals } from '../src/lib/doohPlayerDetailContract.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(root, name), 'utf8');
const id = 'db278943-832b-4a0b-bebd-70053d43ff5e';
const raw = {
  id, name: 'Player', platform: 'ANDROID', lifecycleStatus: 'ACTIVE', online: false,
  lastSeenAt: '2026-10-11T10:30:00.000Z', appVersion: '1.0.0',
  currentManifestVersion: '6', desiredManifestVersion: '7', offlineAfterSeconds: 180,
  currentAssignment: { id: 'assign', mediaUnit: { id: 'unit', label: 'Tela A', unitType: 'SCREEN', isActive: true,
    mediaPoint: { id: 'point', name: 'Local A', addressCity: 'Cidade', addressState: 'SC' } } },
  groups: [{ id: 'group', name: 'Grupo 01' }],
  credential: { active: true, credentialId: 'sensitive-credential-id', createdAt: '2026-10-11T10:00:00Z', lastUsedAt: null },
  credentialHistory: [{ id: 'sensitive-credential-id', revokedAt: null }],
  metadata: { secret: 'hidden-in-projection' }, installationId: 'sensitive-installation-id',
  manifestCount: 4, playbackEventCount: 9, commandCount: 2,
};

test('01 parses exact backend detail projection', () => {
  const detail = parseDoohPlayerDetail(raw, id);
  assert.equal(detail?.id, id);
  assert.deepEqual(detail?.screen, { name: 'Tela A', point: 'Local A', active: true });
  assert.deepEqual(detail?.groups, ['Grupo 01']);
});
test('02 removes installation ID, metadata, actor and credential IDs', () => {
  const result = JSON.stringify(parseDoohPlayerDetail(raw, id));
  for (const secret of ['sensitive-installation-id', 'hidden-in-projection', 'sensitive-credential-id', 'credentialHistory', 'metadata'])
    assert.ok(!result.includes(secret), secret);
});
test('03 fails closed on wrong player ID and error payload', () => {
  assert.equal(parseDoohPlayerDetail(raw, 'wrong-company-player'), null);
  assert.equal(parseDoohPlayerDetail({ statusCode: 404, message: 'Not found' }, id), null);
});
test('04 rejects malformed dates and technical counters', () => {
  for (const change of [{ lastSeenAt: 'invalid' }, { commandCount: -1 }, { playbackEventCount: '9' }, { manifestCount: 1.2 }, { offlineAfterSeconds: 0 }])
    assert.equal(parseDoohPlayerDetail({ ...raw, ...change }, id), null);
});
test('05 rejects unknown lifecycle, impossible online non-ACTIVE and manifest versions', () => {
  for (const change of [{ lifecycleStatus: 'DELETED' }, { lifecycleStatus: 'RETIRED', online: true },
    { currentManifestVersion: '-1' }, { desiredManifestVersion: 'signed' }])
    assert.equal(parseDoohPlayerDetail({ ...raw, ...change }, id), null);
});
test('06 rejects malformed assignment/groups/credential data', () => {
  for (const change of [{ currentAssignment: { mediaUnit: {} } }, { groups: [{ name: 12 }] },
    { credential: { active: 'yes', lastUsedAt: null } }, { credential: null }])
    assert.equal(parseDoohPlayerDetail({ ...raw, ...change }, id), null);
});
test('07 supports unassociated retired player without inventing connectivity or license', () => {
  const value = parseDoohPlayerDetail({ ...raw, lifecycleStatus: 'RETIRED', online: false, currentAssignment: null, groups: [] }, id);
  assert.ok(value);
  assert.equal(value.screen, null);
  assert.match(doohPlayerDetailSignals(value).join(' '), /não contabilizar como licença ACTIVE/);
});
test('08 active offline retains ACTIVE license and warns about heartbeat', () => {
  const value = parseDoohPlayerDetail(raw, id);
  assert.ok(value);
  const signals = doohPlayerDetailSignals(value).join(' ');
  assert.match(signals, /Licença ACTIVE ocupada, mesmo quando offline/);
  assert.match(signals, /Sem heartbeat recente/);
});
test('09 mismatched manifest and inactive screen stay technical signals', () => {
  const value = parseDoohPlayerDetail({ ...raw, currentAssignment: { ...raw.currentAssignment, mediaUnit: { ...raw.currentAssignment.mediaUnit, isActive: false } } }, id);
  assert.ok(value);
  assert.match(doohPlayerDetailSignals(value).join(' '), /Versões de manifest divergentes/);
  assert.match(doohPlayerDetailSignals(value).join(' '), /tela associada está inativa/);
});
test('10 equal versions are not treated as proof of playback', () => {
  const value = parseDoohPlayerDetail({ ...raw, currentManifestVersion: '7', online: true }, id);
  assert.ok(value);
  assert.doesNotMatch(doohPlayerDetailSignals(value).join(' '), /divergentes/);
  assert.match(read('src/components/DoohPlayerDetailReadOnly.tsx'), /não comprovam reprodução física/);
});
test('11 detail API is authenticated read-only and abortable', () => {
  const src = read('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.match(src, /apiClient\.get<unknown>\(`/);
  assert.match(src, /signal: controller\.signal/);
  assert.match(src, /controller\.abort\(\)/);
  assert.doesNotMatch(src, /apiClient\.(?:post|put|patch|delete)\b/i);
});
test('12 exact detail ID is checked, and no raw DTO is stored', () => {
  const src = read('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.match(src, /parseDoohPlayerDetail\(result, playerId\)/);
  assert.match(src, /setData\(parsed\)/);
  assert.doesNotMatch(src, /setData\(result\)/);
});
test('13 selection is bound to company and active filter request', () => {
  const src = read('src/components/DoohPlayerInventoryReadOnly.tsx');
  assert.match(src, /selected\?\.requestKey === requestKey/);
  assert.match(src, /response\.items\.some/);
  assert.match(src, /key=\{`\$\{companyId\}:\$\{selected\.playerId\}:\$\{requestKey\}`\}/);
  assert.match(src, /if \(!allowed \|\| !companyId\)/);
});
test('14 new detail access remains a button, not mutation', () => {
  const src = read('src/components/DoohPlayerInventoryReadOnly.tsx');
  assert.match(src, /Ver detalhes de/);
  assert.doesNotMatch(src, /apiClient\.(?:post|put|patch|delete)\b/i);
});
test('15 read-only detail does not render sensitive admin payload fields', () => {
  const src = read('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.doesNotMatch(src, /\bdata\.(?:metadata|installationId|credentialHistory|assignmentHistory|nonce|token)\b/);
  assert.match(src, /eventos reportados|Eventos técnicos recebidos/);
});
test('16 denial, loading and errors have independent accessible states', () => {
  const src = read('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.match(src, /role="status"/);
  assert.match(src, /role="alert"/);
  assert.match(src, /controller\.signal\.aborted/);
  assert.match(src, /Fechar detalhes/);
});
