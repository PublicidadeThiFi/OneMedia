import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/DoohMediaLibraryReadOnly.tsx', import.meta.url), 'utf8');

test('F12 5c: busca de mídia vai ao servidor com espera curta', () => {
  assert.match(src, /setTimeout\(\(\) => setServerSearch\(next\), 400\)/);
  assert.match(src, /typedSearch\.trim\(\)\.slice\(0, 120\)/);
  assert.match(src, /serverSearch \? \{ q: serverSearch \} : \{\}/);
  assert.match(src, /JSON\.stringify\(\[contextKey, folderFilter, serverSearch, reload\]\)/);
});

test('F12 5c: texto deixa de dizer que a busca é limitada aos resultados carregados', () => {
  assert.doesNotMatch(src, /não é uma pesquisa global/);
  assert.doesNotMatch(src, /Buscar entre os resultados carregados/);
  assert.match(src, /Buscar pelo nome em toda a biblioteca/);
  assert.match(src, /maxLength=\{120\}/);
});

test('F12 5c: trocar pasta, empresa ou enviar arquivo limpa a busca', () => {
  assert.equal((src.match(/setTypedSearch\(''\); setServerSearch\(''\)/g) ?? []).length, 3);
});
