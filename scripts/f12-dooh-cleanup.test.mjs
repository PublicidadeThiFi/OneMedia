import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(new URL(`../src/components/${p}`, import.meta.url), 'utf8');

test('F12 screens area has only Minhas telas (+ TI support), no pilot tabs', () => {
  const page = read('DoohFoundationPage.tsx');
  assert.doesNotMatch(page, /'connect'|'manage'|Conectar uma tela|Gerenciar dispositivos/);
  assert.match(page, /type ScreensTask = 'my-screens' \| 'technical'/);
  assert.match(page, /screenTask === 'technical' && isTechnical/);
  assert.equal(existsSync(new URL('../src/components/DoohGettingStarted.tsx', import.meta.url)), false);
});
test('F12 access badge only when access is not complete', () => {
  const page = read('DoohFoundationPage.tsx');
  assert.match(page, /\{mode !== 'FULL' && <p/);
  assert.doesNotMatch(page, /Acesso: visualizar e editar/);
});
test('F12 screen card edits and disconnects through the existing tenant-scoped routes', () => {
  const panel = read('DoohOperationalScreensPanel.tsx');
  assert.match(panel, /apiClient\.patch<unknown>\(`\/dooh\/operational-screens\/\$\{encodeURIComponent\(screen\.id\)\}`/);
  assert.match(panel, /apiClient\.delete<unknown>\(`\/dooh\/operational-screens\/\$\{encodeURIComponent\(screen\.id\)\}\/player`\)/);
  // Disconnect needs an explicit second confirmation and is limited to writable access.
  assert.match(panel, /role="alertdialog"/);
  assert.match(panel, /async function unbindPlayer[\s\S]*?if \(!writable \|\| busy \|\| !screen\.playerId\) return;/);
  assert.match(panel, /async function saveScreen[\s\S]*?if \(!writable \|\| busy/);
  // The server response is checked before the card changes.
  assert.match(panel, /result\.playerId\) throw Error\('Unexpected API response'\)/);
});
test('F12 stale pilot texts are gone', () => {
  assert.doesNotMatch(read('DoohPlayerOperations.tsx'), /D15A1<\/h3>|ativação DOOH permanece pausada/);
  assert.doesNotMatch(read('DoohPlayerPairingAndAssignment.tsx'), /durante o smoke/);
});
