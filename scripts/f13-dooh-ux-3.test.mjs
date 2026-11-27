import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doohFriendlyDate, doohFullDate } from '../src/lib/doohFriendlyDate.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const now = new Date(2026, 10, 27, 15, 0);

test('datas amigáveis: hoje, ontem, amanhã, mesmo ano e outro ano', () => {
  assert.equal(doohFriendlyDate(new Date(2026, 10, 27, 14, 36), now), 'hoje às 14:36');
  assert.equal(doohFriendlyDate(new Date(2026, 10, 26, 9, 10), now), 'ontem às 09:10');
  assert.equal(doohFriendlyDate(new Date(2026, 10, 28, 8, 0), now), 'amanhã às 08:00');
  assert.equal(doohFriendlyDate(new Date(2026, 9, 3, 7, 5), now), '03/10 às 07:05');
  assert.equal(doohFriendlyDate(new Date(2025, 0, 2, 7, 5), now), '02/01/2025');
  assert.equal(doohFriendlyDate('ontem', now), '');
  assert.equal(doohFullDate('x'), '');
});

test('última comunicação usa data amigável com a completa ao passar o mouse', () => {
  const panel = read('src/components/DoohOperationalScreensPanel.tsx');
  assert.match(panel, /title=\{doohFullDate\(lastSeen\)\}>\{doohFriendlyDate\(lastSeen\)\}/);
  assert.match(panel, /'Mostrar todas' : 'Só com problema'/);
});

test('cor principal índigo só dentro do módulo DOOH', () => {
  assert.match(read('src/components/DoohFoundationPage.tsx'), /<main className="dooh-ui /);
  const css = read('src/styles/dooh-utilities.css');
  assert.match(css, /\.dooh-ui \{\s*--primary: oklch\(0\.511 0\.262 276\.966\);/);
  assert.doesNotMatch(read('src/index.css'), /\.dooh-ui/);
});

test('suporte técnico fala em aparelho, sem jargão de API', () => {
  for (const f of ['DoohPlayerOperations', 'DoohPlayerAuditReadOnly', 'DoohGroupMembersSafeEditor']) {
    const src = read(`src/components/${f}.tsx`);
    assert.doesNotMatch(src, /<span>Player<\/span>|A API revalida|Nome do player|\{player\.lifecycleStatus\}<\/option>|\(\{player\.lifecycleStatus\}\)/, f);
  }
});
