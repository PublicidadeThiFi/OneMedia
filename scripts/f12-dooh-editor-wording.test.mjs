import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doohMediaDisplayName } from '../src/lib/doohMediaDisplayName.ts';
const read = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('F12 media named after its file id gets a readable label; real names stay', () => {
  assert.equal(doohMediaDisplayName('a408d00b-7cb8-4c03-b689-9eb6417d0dcc'), 'Mídia sem nome (a408d0)');
  assert.equal(doohMediaDisplayName('a408d00b-7cb8-4c03-b689-9eb6417d0dcc.jpg', 'IMAGE'), 'Imagem sem nome (a408d0)');
  assert.equal(doohMediaDisplayName('a408d00b-7cb8-4c03-b689-9eb6417d0dcc', 'VIDEO'), 'Vídeo sem nome (a408d0)');
  assert.equal(doohMediaDisplayName('OneMedia_P0-08_Imagem_Teste', 'IMAGE'), 'OneMedia_P0-08_Imagem_Teste');
  for (const f of ['components/DoohScreenContentWizard.tsx', 'components/DoohScreenPublicationWizard.tsx', 'components/DoohMediaLibraryReadOnly.tsx', 'components/DoohReportsPanel.tsx'])
    assert.match(read(f), /doohMediaDisplayName\(/, f);
});
test('F12 publication step speaks plainly', () => {
  const w = read('components/DoohScreenPublicationWizard.tsx');
  for (const jargon of [/Autorização de renovação registrada/, /Período técnico máximo/, /Preparada ≠ instalada/, /Publicar não comprova exibição/, /Atualização preparada'/, /Etapa A —/])
    assert.doesNotMatch(w, jargon);
  assert.match(w, /Sempre, até eu pausar/);
  assert.match(w, /Publicado\. Enviando para a TV…/);
  assert.match(w, /Situação da TV: <strong>\{screenOperationalSummary\(screen\)\.programming\}/);
});
test('F12 step-by-step publishing only for Marketplace-linked screens or when one-step publishing is off', () => {
  const w = read('components/DoohScreenPublicationWizard.tsx');
  assert.match(w, /!replacing&&!paused&&\(!single\|\|!!screen\.commercialUnit\)&&<>/);
  assert.doesNotMatch(w, /Operação avançada/);
});
test('F12 advanced mode keeps its features with plain names', () => {
  const page = read('components/DoohFoundationPage.tsx');
  assert.match(page, /label: 'Várias telas de uma vez'/);
  assert.match(page, /label: '1\. Sequências'/);
  assert.match(page, /label: '2\. Horários e telas'/);
});
