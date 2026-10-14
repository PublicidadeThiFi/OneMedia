import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDoohPlayerGroups, normalizedOperationalName, doohOperationalError,
  isOperationalWriteAllowed,
} from '../src/lib/doohPlayerOperationsContract.ts';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (name) => readFileSync(join(root, name), 'utf8');
const ID1 = '123e4567-e89b-42d3-a456-426614174000';
const ID2 = '223e4567-e89b-42d3-a456-426614174000';
const item = { id: ID1, name: 'Hall principal', memberCount: 2, scheduleTargetCount: 1,
  createdAt: '2026-10-14T00:00:00Z', hiddenTenant: 'secret-tenant',
  members: [{ deviceSecret: 'secret-device' }] };

test('D15A1-01 lista real dos grupos é projetada sem dados secretos', () => {
  const result = parseDoohPlayerGroups([item]);
  assert.deepEqual(result, [{ id: ID1, name: item.name, memberCount: 2, scheduleTargetCount: 1 }]);
  assert.doesNotMatch(JSON.stringify(result), /secret|createdAt|members|hiddenTenant/);
});
test('D15A1-02 grupo vazio é estado válido', () => assert.deepEqual(parseDoohPlayerGroups([]), []));
test('D15A1-03 falha fechada em DTO incompleto ou duplicado', () => {
  for (const value of [null, { items: [item] }, [{ ...item, memberCount: '2' }],
    [{ ...item, scheduleTargetCount: -1 }], [{ ...item, id: 'evil' }], [item, item],
    [{ ...item, name: ' ' }], [{ ...item, name: 'x'.repeat(121) }]]) {
    assert.equal(parseDoohPlayerGroups(value), null);
  }
  assert.equal(parseDoohPlayerGroups([item, { ...item, id: ID2 }])?.length, 2);
});
test('D15A1-04 nome apenas não vazio, trim, até 120 caracteres', () => {
  assert.equal(normalizedOperationalName('  Grupo A  '), 'Grupo A');
  assert.equal(normalizedOperationalName(' '.repeat(10)), null);
  assert.equal(normalizedOperationalName('x'.repeat(121)), null);
  assert.equal(normalizedOperationalName('x'.repeat(120)), 'x'.repeat(120));
});
test('D15A1-05 FULL + empresa exata + role técnica, senão bloqueia mutações', () => {
  assert.equal(isOperationalWriteAllowed('empresa-1', 'empresa-1', 'FULL', true, ['TI']), true);
  assert.equal(isOperationalWriteAllowed('empresa-1', 'empresa-1', 'FULL', true, ['ADMINISTRATIVO']), true);
  for (const [company, snapshot, mode, granted, roles] of [
    ['empresa-1', 'empresa-2', 'FULL', true, ['TI']],
    ['empresa-1', 'empresa-1', 'READ_ONLY', true, ['TI']],
    ['empresa-1', 'empresa-1', 'NONE', true, ['TI']],
    ['empresa-1', 'empresa-1', 'FULL', false, ['TI']],
    ['empresa-1', 'empresa-1', 'FULL', true, ['COMERCIAL']],
    [null, null, 'FULL', true, ['TI']],
  ]) assert.equal(isOperationalWriteAllowed(company, snapshot, mode, granted, roles), false);
});
test('D15A1-06 erros nunca reproduzem payload, JWT, URL ou token', () => {
  for (const status of [400, 401, 402, 403, 404, 409, 429, 500, 503]) {
    const msg = doohOperationalError({ response: { status, data: { token: 'secret-token', url: 'private.host' } }, message: 'sensitive' });
    assert.ok(msg.length > 15);
    assert.doesNotMatch(msg, /secret|private\.host|sensitive/);
  }
});
test('D15A1-07 componente separado do D13J/K não executa ações críticas', () => {
  const s = source('src/components/DoohPlayerOperations.tsx');
  assert.match(s, /isOperationalWriteAllowed\(/);
  assert.match(s, /if \(!authorized\) return null/);
  assert.match(s, /canSubmit = writable && !busy && !loading/);
  assert.match(s, /window\.confirm\(/);
  assert.match(s, /controller\.abort\(\)/);
  assert.match(s, /parseDoohPlayerInventoryResponse\(/);
  assert.match(s, /parseDoohPlayerGroups\(/);
  assert.match(s, /parseDoohPlayerDetail\(/);
  assert.match(s, /apiClient\.patch<unknown>\(`\/dooh\/players\/\$\{encodeURIComponent\(selectedPlayer.id\)\}`/, 'patch apenas do nome');
  assert.match(s, /\{ name \}/);
  assert.match(s, /apiClient\.post<unknown>\('\/dooh\/player-groups', \{ name \}\)/);
  assert.doesNotMatch(s, /apiClient\.(?:put|delete)\b|apiClient\.post<unknown>\(`?\/dooh\/players/);
  assert.doesNotMatch(s, /'\/dooh\/players\/pair'|'\/dooh\/players\/restart'/);
});
test('D15A1-08 tela de consulta D13K permanece intocada e D15A1 é adicional', () => {
  const foundation = source('src/components/DoohFoundationPage.tsx');
  assert.match(foundation, /section === 'screens'\s*\?\s*\(\s*<DoohPlayerInventoryReadOnly\s*\/>/);
  assert.match(foundation, /section === 'screens' && <DoohPlayerOperations \/>/);
});
