import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseOperationalScreen } from '../src/lib/doohOperationalScreenContract.ts';
import { screenStatusBadge } from '../src/lib/doohScreenDiagnosticContract.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const id = '11111111-1111-4111-8111-111111111111';
const raw = { id, name: 'TV', orientation: 'LANDSCAPE', fitMode: 'CONTAIN', locationLabel: null, playerId: null, player: null, commercialUnit: null, status: 'WAITING_FOR_PLAYER' };

test('tela sem aparelho recebe a situação "Sem aparelho" em tom neutro', () => {
  assert.deepEqual(screenStatusBadge(parseOperationalScreen(raw)), { label: 'Sem aparelho', tone: 'muted' });
});

test('cartão da tela: uma ação principal e as demais em Mais opções', () => {
  const src = read('src/components/DoohOperationalScreensPanel.tsx');
  assert.match(src, /Mais opções ⋯/);
  assert.match(src, /role="menu"/);
  for (const item of ['Diagnóstico avançado', 'Editar tela', 'Desconectar aparelho', 'Arquivar tela']) assert.ok(src.includes(item), item);
  assert.match(src, /summary\.programming !== badge\.label/);
  assert.match(src, /variant=\{screen\.player \? 'default' : 'outline'\}/);
});

test('nenhum painel DOOH usa a caixa de confirmação nativa do navegador', () => {
  const dir = new URL('../src/components/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => /^Dooh.*\.tsx$/.test(n))) {
    assert.doesNotMatch(read(`src/components/${f}`), /window\.confirm\(/, f);
  }
  const confirm = read('src/components/DoohInlineConfirm.tsx');
  assert.match(confirm, /role="alertdialog"/);
  assert.match(confirm, /Escape/);
});

test('textos visíveis sem códigos internos de etapa', () => {
  const dir = new URL('../src/components/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => /^Dooh.*\.tsx$/.test(n))) {
    const visible = read(`src/components/${f}`).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(visible, />[^<{]*\bD1[56][A-D]-?\d/, f);
    assert.doesNotMatch(visible, /CAS atômico/, f);
  }
});

test('estilos complementares do painel são carregados após o CSS base', () => {
  const main = read('src/main.tsx');
  assert.ok(main.indexOf('./styles/dooh-utilities.css') > main.indexOf('index.css'));
  const css = read('src/styles/dooh-utilities.css');
  for (const cls of ['.sm\\:grid-cols-3', '.bg-amber-500', '.break-words', '.ring-1']) assert.ok(css.includes(cls), cls);
});

test('campos de identificador e ISO ficam só para o suporte (TI)', () => {
  assert.match(read('src/components/DoohScheduleDetailsCasEditor.tsx'), /role === 'TI'\) && <details/);
  assert.match(read('src/components/DoohScheduleTargetsCasEditor.tsx'), /isTechnical && <details/);
  assert.match(read('src/components/DoohScheduleTemporalPreview.tsx'), /DoohSchedulePlayerPicker/);
});
