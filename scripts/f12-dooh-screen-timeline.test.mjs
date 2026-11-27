import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScreenTimeline, timelineContentText, timelineRangeText, timelineEmptyText } from '../src/lib/doohScreenTimelineContract.ts';
const id = '11111111-1111-4111-8111-111111111111';
const now = new Date(2026, 10, 27, 14, 0);
const at = (h, m = 0, d = 27) => new Date(2026, 10, d, h, m).toISOString();
const raw = { screenId: id, observedAt: now.toISOString(), state: 'INSTALLED', window: { from: at(8), to: at(8, 0, 28) }, segments: [
  { from: at(8), to: at(18), status: 'READY', itemCount: 2, items: [{ name: 'Promo Natal', durationMs: 10000 }, { name: null, durationMs: 5000 }] },
  { from: at(18), to: at(8, 0, 28), status: 'NO_MATCH', itemCount: 0, items: [] }] };

test('lê a programação instalada e recusa resposta de outra tela ou malformada', () => {
  const t = parseScreenTimeline(raw, id);
  assert.equal(t.segments.length, 2); assert.equal(t.windowTo, at(8, 0, 28));
  assert.equal(parseScreenTimeline({ ...raw, screenId: '22222222-2222-4222-8222-222222222222' }, id), null);
  assert.equal(parseScreenTimeline({ ...raw, segments: [{ ...raw.segments[0], to: at(7) }] }, id), null);
  assert.equal(parseScreenTimeline({ ...raw, state: 'NO_DEVICE' }, id), null);
  assert.equal(parseScreenTimeline({ ...raw, state: 'NO_DEVICE', segments: [] }, id).state, 'NO_DEVICE');
});

test('textos simples: agora, amanhã, nomes e horário vazio', () => {
  const t = parseScreenTimeline(raw, id);
  assert.equal(timelineRangeText(t.segments[0], now), 'Agora até 18:00');
  assert.equal(timelineRangeText(t.segments[1], now), '18:00 até 08:00 (amanhã)');
  assert.equal(timelineContentText(t.segments[0]), 'Promo Natal, Mídia removida');
  assert.equal(timelineContentText(t.segments[1]), 'Nada programado neste horário');
  assert.match(timelineEmptyText('NOT_INSTALLED'), /ainda não instalou/);
});

test('o card abre a programação só quando pedido e avisa que não é prova de exibição', () => {
  const c = readFileSync(new URL('../src/components/DoohScreenTimeline.tsx', import.meta.url), 'utf8');
  assert.match(c, /if \(!open\) return;/);
  assert.match(c, /\/timeline`/);
  assert.match(c, /veja Relatórios/);
  assert.doesNotMatch(c, /apiClient\.(post|put|patch|delete)/);
  const p = readFileSync(new URL('../src/components/DoohOperationalScreensPanel.tsx', import.meta.url), 'utf8');
  assert.match(p, /<DoohScreenTimeline screenId=\{screen\.id\}/);
});
