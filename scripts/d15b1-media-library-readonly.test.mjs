import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseDoohLibraryFolders, parseDoohLibraryMedia,
  doohLibraryReadError, displayDoohMediaSize,
} from '../src/lib/doohMediaLibraryContract.ts';

const root = process.cwd();
const companyId = '11111111-1111-4111-8111-111111111111';
const otherCompany = '22222222-2222-4222-8222-222222222222';
const folderId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherFolderId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const mediaId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const foldersDto = [
  { id: folderId, companyId, parentId: null, name: 'Campanhas', createdAt: new Date().toISOString(),
    _count: { children: 1, media: 2 }, internal: 'SECRET' },
  { id: otherFolderId, companyId, parentId: folderId, name: 'Vídeos',
    _count: { children: 0, media: 1 }, credentials: 'SECRET' },
];
const mediaDto = {
  id: mediaId, companyId, folderId, clientId: null, name: 'Vídeo 01', status: 'READY', checksum: 'PRIVATE',
  durationMs: 12000, widthPx: 1920, heightPx: 1080,
  createdAt: '2026-10-14T19:30:00.000Z', updatedAt: '2026-10-14T19:30:00.000Z',
  storedAsset: { id: 'PRIVATE', kind: 'VIDEO', mimeType: 'video/mp4', bytes: '1048576', objectKey: 'S3_PRIVATE' },
  _count: { versions: 2 }, uploadUrl: 'PRIVATE',
};

function folders() {
  return parseDoohLibraryFolders(foldersDto, companyId);
}

test('D15B01-01: pastas do tenant com projeção segura, hierarquia e contadores', () => {
  const value = folders();
  assert.ok(value); assert.equal(value.length, 2);
  assert.equal(value[0].depth, 0); assert.equal(value[1].depth, 1);
  assert.equal(value[0].mediaCount, 2);
  assert.equal(JSON.stringify(value).includes('SECRET'), false);
  assert.deepEqual(Object.keys(value[0]).sort(), ['childrenCount', 'depth', 'id', 'mediaCount', 'name', 'parentId'].sort());
});

test('D15B01-02: pasta cross-tenant, duplicada e pai inexistente falham fechados', () => {
  assert.equal(parseDoohLibraryFolders([{...foldersDto[0], companyId: otherCompany}], companyId), null);
  assert.equal(parseDoohLibraryFolders([foldersDto[0], foldersDto[0]], companyId), null);
  assert.equal(parseDoohLibraryFolders([{ ...foldersDto[0], parentId: otherFolderId }], companyId), null);
});

test('D15B01-03: ciclos e autorreferência de pastas recusados', () => {
  assert.equal(parseDoohLibraryFolders([{ ...foldersDto[0], parentId: folderId }], companyId), null);
  assert.equal(parseDoohLibraryFolders([
    { ...foldersDto[0], parentId: otherFolderId },
    { ...foldersDto[1], parentId: folderId },
  ], companyId), null);
});

test('D15B01-04: catálogo projeta somente campos operacionais, sem segredos', () => {
  const projected = parseDoohLibraryMedia([mediaDto], companyId, 'all', folders());
  assert.ok(projected);
  assert.equal(projected[0].name, 'Vídeo 01'); assert.equal(projected[0].versionCount, 2);
  for (const secret of ['checksum', 'clientId', 'objectKey', 'uploadUrl', 'storedAsset', 'companyId']) {
    assert.equal(JSON.stringify(projected).includes(secret), false, secret);
  }
});

test('D15B01-05: mídia cross-tenant, duplicada, status ou bytes inválidos recusados', () => {
  const f = folders();
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, companyId: otherCompany }], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([mediaDto, mediaDto], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, status: 'IMPRESSION_CONFIRMED' }], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, storedAsset: { ...mediaDto.storedAsset, bytes: '-7' } }], companyId, 'all', f), null);
});

test('D15B01-06: filtro por pasta e raiz é validado no retorno da API', () => {
  const f = folders();
  assert.equal(parseDoohLibraryMedia([mediaDto], companyId, 'root', f), null);
  assert.equal(parseDoohLibraryMedia([mediaDto], companyId, otherFolderId, f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, folderId: null }], companyId, 'root', f)?.length, 1);
  assert.equal(parseDoohLibraryMedia([mediaDto], companyId, folderId, f)?.length, 1);
  assert.equal(parseDoohLibraryMedia([mediaDto], companyId, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', f), null);
});

test('D15B01-07: catálogo limitado a 100; sem total inventado', () => {
  const f = folders();
  assert.deepEqual(parseDoohLibraryMedia([], companyId, 'all', f), []);
  assert.equal(parseDoohLibraryMedia(Array(101).fill(mediaDto), companyId, 'all', f), null);
});

test('D15B01-08: dados incompletos, invalid dates e bytes não string recusados', () => {
  const f = folders();
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, createdAt: '14/10/2026' }], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, storedAsset: { ...mediaDto.storedAsset, bytes: 1048576 } }], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, _count: undefined }], companyId, 'all', f), null);
  assert.equal(parseDoohLibraryMedia([{ ...mediaDto, folderId: otherCompany }], companyId, 'all', f), null);
});

test('D15B01-09: mensagens HTTP fixas não refletem tokens ou corpo do servidor', () => {
  for (const status of [400,401,402,403,404,429,500,503]) {
    const result = doohLibraryReadError({ response: {status, data: { token: 'SECRET', message:'SECRET'}}, config: {headers: {authorization:'SECRET'}} });
    assert.equal(result.includes('SECRET'), false);
  }
  assert.equal(displayDoohMediaSize('0'), '0 B');
  assert.match(displayDoohMediaSize('1048576'), /1 MiB/);
});

test('D15B01-10: tela usa GET autenticados e não expõe ações destrutivas', () => {
  const source = readFileSync(join(root,'src/components/DoohMediaLibraryReadOnly.tsx'),'utf8');
  assert.match(source, /apiClient\.get<unknown>\('\/dooh\/folders'/);
  assert.match(source, /apiClient\.get<unknown>\('\/dooh\/media'/);
  assert.doesNotMatch(source, /apiClient\.(?:post|put|patch|delete)/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /snapshot\?\.companyId === companyId/);
  assert.match(source, /accessMode === 'READ_ONLY'/);
  assert.match(source, /take: 100/);
});

test('D15B01-11: Biblioteca substitui placeholder, D15A1 permanece intacto', () => {
  const foundation = readFileSync(join(root,'src/components/DoohFoundationPage.tsx'),'utf8');
  assert.match(foundation, /section === 'library' \? \(/);
  assert.match(foundation, /<DoohMediaLibraryReadOnly \/>/);
  for (const preserved of ['DoohPlayerInventoryReadOnly', 'DoohPlayerRestartQa', 'DoohGroupMembersSafeEditor'])
    assert.ok(foundation.includes(`<${preserved} />`), preserved);
});
