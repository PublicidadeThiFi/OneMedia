import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canWriteDoohFolders, normalizeDoohFolderName, validDoohFolderTarget,
  parseDoohFolderWriteResponse, isDoohFolderPreflightCurrent, doohFolderWriteError,
} from '../src/lib/doohFolderOperationsContract.ts';

const company = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const rootId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const newId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const rootFolder = { id: rootId, parentId: null, name: 'Campanhas', depth: 0, childrenCount: 0, mediaCount: 1 };
const folders = [rootFolder];
const dto = { id: newId, companyId: company, parentId: rootId, name: '2026',
  _count: { children: 0, media: 0 }, storageKey: 'SECRET' };
const makeCreate = (value = dto) => parseDoohFolderWriteResponse(value, company,
  'create', { name: '2026', parentId: rootId }, folders);

test('D15B02-01 FULL + tenant exato + papel técnico permite operação', () => {
  assert.equal(canWriteDoohFolders(company, company, true, 'FULL', ['TI']), true);
  assert.equal(canWriteDoohFolders(company, company, true, 'FULL', ['ADMINISTRATIVO']), true);
});
test('D15B02-02 READ_ONLY, false grant, outro tenant e roles comerciais falham fechados', () => {
  assert.equal(canWriteDoohFolders(company, company, true, 'READ_ONLY', ['TI']), false);
  assert.equal(canWriteDoohFolders(company, company, false, 'FULL', ['TI']), false);
  assert.equal(canWriteDoohFolders(company, foreign, true, 'FULL', ['TI']), false);
  assert.equal(canWriteDoohFolders(company, company, true, 'FULL', ['COMERCIAL']), false);
  assert.equal(canWriteDoohFolders('invalid', 'invalid', true, 'FULL', ['ADMINISTRATIVO']), false);
});
test('D15B02-03 nome faz trim, rejeita vazio, controles e mais de 120 caracteres', () => {
  assert.equal(normalizeDoohFolderName('  Acervo  '), 'Acervo');
  for (const name of ['', '   ', 'x'.repeat(121), 'abc\n123', '\t', null, {}]) {
    assert.equal(normalizeDoohFolderName(name), null);
  }
});
test('D15B02-04 criação de raiz ou subpasta válida, pai desconhecido rejeitado', () => {
  assert.equal(validDoohFolderTarget(null, folders), true);
  assert.equal(validDoohFolderTarget(rootId, folders), true);
  assert.equal(validDoohFolderTarget(foreign, folders), false);
  assert.equal(validDoohFolderTarget('invalid', folders), false);
});
test('D15B02-05 criação confirma ID novo, pasta pai, nome e contadores seguros', () => {
  const result = makeCreate();
  assert.ok(result);
  assert.deepEqual(result, { id: newId, parentId: rootId, name: '2026', depth: 1, childrenCount: 0, mediaCount: 0 });
  assert.doesNotMatch(JSON.stringify(result), /SECRET|companyId|storageKey/);
});
test('D15B02-06 criação na raiz tem profundidade 0', () => {
  const result = parseDoohFolderWriteResponse({ ...dto, parentId: null }, company, 'create',
    { name: '2026', parentId: null }, folders);
  assert.equal(result?.depth, 0);
});
test('D15B02-07 criação recusa cross tenant, pasta mãe trocada e ID repetido', () => {
  assert.equal(makeCreate({ ...dto, companyId: foreign }), null);
  assert.equal(makeCreate({ ...dto, parentId: null }), null);
  assert.equal(makeCreate({ ...dto, id: rootId }), null);
  assert.equal(makeCreate({ ...dto, _count: { children: -1, media: 0 } }), null);
});
test('D15B02-08 renomeação valida ID, pai e nome esperados', () => {
  const value = { id: rootId, companyId: company, parentId: null, name: 'Nova Campanha', _count: {children:1, media:1} };
  const result = parseDoohFolderWriteResponse(value, company, 'rename',
    { id: rootId, parentId: null, name: 'Nova Campanha' }, folders);
  assert.equal(result?.name, 'Nova Campanha');
  assert.equal(result?.mediaCount, 1);
  assert.equal(parseDoohFolderWriteResponse({ ...value, id: newId }, company, 'rename',
    { id: rootId, parentId: null, name: 'Nova Campanha' }, folders), null);
});
test('D15B02-09 preflight bloqueia renomeação se nome, pai ou tenant mudou', () => {
  const before = { id: rootId, companyId: company, parentId: null, name: 'Campanhas', _count: {children:0, media:1} };
  assert.equal(isDoohFolderPreflightCurrent(before, company, rootFolder, folders), true);
  assert.equal(isDoohFolderPreflightCurrent({ ...before, name: 'Alterado' }, company, rootFolder, folders), false);
  assert.equal(isDoohFolderPreflightCurrent({ ...before, companyId: foreign }, company, rootFolder, folders), false);
  assert.equal(isDoohFolderPreflightCurrent({ ...before, parentId: newId }, company, rootFolder, folders), false);
});
test('D15B02-10 nenhum erro HTTP reflete token ou corpo do servidor', () => {
  for (const status of [400, 401, 402, 403, 404, 409, 429, 500, 503]) {
    const msg = doohFolderWriteError({ response: { status, data: { jwt: 'SECRET', message: 'SECRET' } } });
    assert.doesNotMatch(msg, /SECRET/);
  }
});
test('D15B02-11 novo módulo usa somente create/rename e pré-validação autenticada', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohFolderOperations.tsx'), 'utf8');
  assert.match(source, /canWriteDoohFolders/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /apiClient\.get<unknown>\(`\/dooh\/folders\/\$\{/);
  assert.match(source, /apiClient\.post<unknown>\('\/dooh\/folders'/);
  assert.match(source, /apiClient\.patch<unknown>\(`\/dooh\/folders\/\$\{/);
  assert.doesNotMatch(source, /apiClient\.(?:put|delete)/);
  assert.doesNotMatch(source, /apiClient\.(?:post|put|patch|delete)<unknown>\(.?\/?dooh\/media/);
});
test('D15B02-12 componente leitura D15B01 preserva GET e mantém filtro de mídia', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohMediaLibraryReadOnly.tsx'), 'utf8');
  assert.match(source, /apiClient\.get<unknown>\('\/dooh\/folders'/);
  assert.match(source, /apiClient\.get<unknown>\('\/dooh\/media'/);
  assert.match(source, /<DoohFolderOperations companyId=\{companyId!\} folders=\{visible\.folders\}/);
  assert.match(source, /setReload\(\(value\) => value \+ 1\)/);
  assert.doesNotMatch(source, /apiClient\.(?:post|put|patch|delete)/);
});
test('D15B02-13 endpoint backend existe e não adicionamos ativação, envio ou exclusão', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohFolderOperations.tsx'), 'utf8');
  assert.doesNotMatch(source, /\/dooh\/players\/.*restart|uploads\/init|\/dooh\/schedules|\/dooh\/manifests/);
  assert.match(source, /true CAS is not offered by this API/);
});
