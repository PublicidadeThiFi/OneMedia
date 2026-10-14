import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canRequestQaRestart, parseRestartReceipt, safeRestartError } from '../src/lib/doohPlayerRestartContract.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRelativeController = path.join('src', 'dooh-player-core', 'dooh-player-admin.controller.ts');
function locateBackendRoot() {
  const configured = process.env.ONEMEDIA_BACKEND_ROOT?.trim();
  if (configured) {
    const file = path.join(path.resolve(configured), backendRelativeController);
    assert.ok(fs.existsSync(file), `ONEMEDIA_BACKEND_ROOT configurado, mas controller não encontrado: ${file}`);
    return path.resolve(configured);
  }
  for (const sibling of ['ooh-manager-api', 'backend']) {
    const candidate = path.resolve(root, '..', sibling);
    if (fs.existsSync(path.join(candidate, backendRelativeController))) return candidate;
  }
  return null;
}
const validId = '11111111-1111-4111-8111-111111111111';
const commandId = '22222222-2222-4222-8222-222222222222';
const player = { id: validId, lifecycleStatus: 'ACTIVE', online: true };
const access = { companyId: validId, snapshotCompanyId: validId, mode: 'FULL', granted: true, roles: ['TI'] };
const receipt = { command: { id: commandId, playerId: validId, type: 'RESTART', status: 'QUEUED', requestedAt: '2026-10-14T20:00:00.000Z', expiresAt: '2026-10-14T20:10:00.000Z', nonce: 'secret', result: { token: 'secret' } }, idempotentReplay: false };
test('B05-01 gate frontend off por padrão bloqueia restart', () => assert.equal(canRequestQaRestart(player, [], access, false), false));
test('B05-02 apenas FULL, tenant idêntico, grant e papel técnico', () => {
  assert.equal(canRequestQaRestart(player, [], access, true), true);
  for (const diff of [{ mode: 'READ_ONLY' }, { granted: false }, { roles: ['COMERCIAL'] }, { snapshotCompanyId: commandId }]) {
    assert.equal(canRequestQaRestart(player, [], { ...access, ...diff }, true), false);
  }
});
test('B05-03 player OFFLINE, INACTIVE ou RETIRED impede comando', () => {
  assert.equal(canRequestQaRestart({ ...player, online: false }, [], access, true), false);
  for (const lifecycleStatus of ['INACTIVE', 'RETIRED']) {
    assert.equal(canRequestQaRestart({ ...player, lifecycleStatus }, [], access, true), false);
  }
});
test('B05-04 histórico ausente ou com pendência bloqueia comando', () => {
  assert.equal(canRequestQaRestart(player, null, access, true), false);
  for (const status of ['QUEUED', 'DELIVERED']) {
    assert.equal(canRequestQaRestart(player, [{ status }], access, true), false);
  }
  assert.equal(canRequestQaRestart(player, [{ status: 'ACKED' }], access, true), true);
});
test('B05-05 parsing retorna projeção sem nonce, token ou result', () => {
  assert.deepEqual(parseRestartReceipt(receipt, validId), { commandId, status: 'QUEUED', idempotentReplay: false });
  assert.equal(JSON.stringify(parseRestartReceipt(receipt, validId)).includes('secret'), false);
});
test('B05-06 rejeita DTO errado, outro player e datas inválidas', () => {
  assert.equal(parseRestartReceipt(receipt, commandId), null);
  assert.equal(parseRestartReceipt({ ...receipt, command: { ...receipt.command, expiresAt: 'invalid' } }, validId), null);
  assert.equal(parseRestartReceipt({ ...receipt, command: { ...receipt.command, status: 'UNKNOWN' } }, validId), null);
});
test('B05-07 erros nunca refletem segredos', () => {
  assert.match(safeRestartError({ response: { status: 403, data: { token: 'secret' } } }), /backend/);
  assert.equal(safeRestartError({ message: 'jwt secret' }).includes('secret'), false);
});
test('B05-08 frontend exige dupla confirmação, chave estável e build flag', () => {
  const ui = fs.readFileSync(path.join(root, 'src/components/DoohPlayerRestartQa.tsx'), 'utf8');
  assert.match(ui, /VITE_DOOH_RESTART_QA_ENABLED === 'true'/);
  assert.match(ui, /confirmation === 'REINICIAR'/);
  assert.match(ui, /window\.confirm\(/);
  assert.match(ui, /crypto\.randomUUID\(\)/);
  assert.match(ui, /Idempotency-Key/);
  assert.match(ui, /attempt\.current\?\.playerId !== capturedPlayer/);
  assert.doesNotMatch(ui, /activation-controls|paused\s*:\s*false|\/runtime\/v1/);
});
test('B05-09 backend obrigatório apenas com gate QA default deny', (t) => {
  const backend = locateBackendRoot();
  if (!backend) { t.skip('Checkout do backend não disponível: validação separada via Jest obrigatória.'); return; }
  const controller = fs.readFileSync(path.join(backend, backendRelativeController), 'utf8');
  const gate = fs.readFileSync(path.join(backend, 'src/dooh-player-core/dooh-restart-qa-gate.ts'), 'utf8');
  assert.match(controller, /assertDoohRestartQaAllowed\(req\.user\.companyId\)/);
  assert.match(controller, /player\.online !== true/);
  assert.match(gate, /DOOH_ADMIN_RESTART_QA_ENABLED !== 'true'/);
  assert.match(gate, /allowedIds\.includes\(company\)/);
});
test('B05-10 D15A1 se mantém, módulo novo só na seção screens', () => {
  const page = fs.readFileSync(path.join(root, 'src/components/DoohFoundationPage.tsx'), 'utf8');
  assert.match(page, /section === 'screens' && <DoohPlayerRestartQa \/>/);
  assert.match(page, /<DoohGroupMembersSafeEditor \/>/);
  assert.match(page, /<DoohPlayerAuditReadOnly \/>/);
});
