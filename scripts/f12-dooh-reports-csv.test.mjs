import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doohReportWindow, doohReportCsv } from '../src/lib/doohReportsContract.ts';

test('Ontem cobre o dia local anterior inteiro e termina na meia-noite de hoje', () => {
  const now = new Date(2026, 10, 27, 14, 30, 12);
  const { from, to } = doohReportWindow('yesterday', now);
  assert.equal(new Date(from).getTime(), new Date(2026, 10, 26).getTime());
  assert.equal(new Date(to).getTime(), new Date(2026, 10, 27).getTime());
  assert.ok(Date.parse(to) <= now.getTime());
});

test('CSV usa nomes, separador ; e neutraliza fórmulas', () => {
  const summary = { from: '', to: '', groupBy: 'PLAYER', total: 7, generatedAt: '',
    byResult: { PLAYED: 5, INTERRUPTED: 1, FAILED: 1, OTHER: 0 },
    groups: [{ groupKey: 'a', total: 6, byResult: { PLAYED: 5, INTERRUPTED: 1, FAILED: 0, OTHER: 0 } },
      { groupKey: 'b', total: 1, byResult: { PLAYED: 0, INTERRUPTED: 0, FAILED: 1, OTHER: 0 } }] };
  const csv = doohReportCsv(summary, key => key === 'a' ? 'TV "da" recepção' : '=HYPERLINK("x")');
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assert.ok(csv.startsWith('﻿'));
  assert.equal(lines[0], '"Tela";"Total";"Exibidas até o fim";"Interrompidas";"Com falha";"Outras"');
  assert.equal(lines[1], '"TV ""da"" recepção";6;5;1;0;0');
  assert.equal(lines[2], '"\'=HYPERLINK(""x"")";1;0;0;1;0');
  assert.equal(lines[3], '"Total do período";7;5;1;1;0');
  assert.doesNotMatch(csv, /\ba\b;|\bb\b;/);
});

test('painel oferece Ontem e Baixar CSV', () => {
  const panel = readFileSync(new URL('../src/components/DoohReportsPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /id: 'yesterday', label: 'Ontem'/);
  assert.match(panel, />Baixar CSV</);
  assert.match(panel, /doohReportCsv\(summary, label\)/);
});
