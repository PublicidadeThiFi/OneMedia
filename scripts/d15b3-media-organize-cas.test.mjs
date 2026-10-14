import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  canOrganizeDoohMedia, normalizeDoohMediaName, validDoohMediaDestination,
  prepareDoohMediaCasPayload, parseDoohMediaCasSnapshot, unchangedDoohMediaSnapshot,
  verifyDoohMediaCasResponse, doohMediaOrganizeError,
} from '../src/lib/doohMediaOrganizeCasContract.ts';
import { parseDoohLibraryMedia, parseDoohLibraryFolders } from '../src/lib/doohMediaLibraryContract.ts';

const root = process.cwd();
const companyId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const folderId = '44444444-4444-4444-8444-444444444444';
const nextFolder = '55555555-5555-4555-8555-555555555555';
const time = '2026-10-14T20:00:00.000Z';
const nextTime = '2026-10-14T20:00:01.000Z';
const folderDto = [
  { id: folderId, companyId, parentId: null, name: 'Vídeos', _count: { children: 0, media: 1 } },
  { id: nextFolder, companyId, parentId: null, name: 'Campanha', _count: { children: 0, media: 0 } },
];
const mediaDto = {
  id: mediaId, companyId, name: 'Video 1', folderId, status: 'READY',
  createdAt: time, updatedAt: time, durationMs: 1000, widthPx: 1280, heightPx: 720,
  storedAsset: { kind: 'VIDEO', mimeType: 'video/mp4', bytes: '4096', id: 'secret' },
  _count: { versions: 1 }, checksum: 'SENSITIVE',
};
const folders = parseDoohLibraryFolders(folderDto, companyId);
const original = parseDoohLibraryMedia([mediaDto], companyId, 'all', folders)[0];
const payload = { expectedName: original.name, expectedFolderId: original.folderId, expectedUpdatedAt: original.updatedAt };

test('B03-01 access FULL + tenant + role; READ_ONLY bloqueado', () => {
  assert.equal(canOrganizeDoohMedia(companyId, companyId, true, 'FULL', ['TI']), true);
  assert.equal(canOrganizeDoohMedia(companyId, companyId, true, 'FULL', ['ADMINISTRATIVO']), true);
  assert.equal(canOrganizeDoohMedia(companyId, companyId, true, 'READ_ONLY', ['TI']), false);
  assert.equal(canOrganizeDoohMedia(companyId, otherId, true, 'FULL', ['TI']), false);
  assert.equal(canOrganizeDoohMedia(companyId, companyId, true, 'FULL', ['VENDEDOR']), false);
});
test('B03-02 nome trim + 160 caracteres sem control', () => {
  assert.equal(normalizeDoohMediaName('  A  '), 'A');
  for (const value of ['', '  ', 'x'.repeat(161), 'a\u0000b']) assert.equal(normalizeDoohMediaName(value), null);
});
test('B03-03 destino só raiz ou pasta consultada', () => {
  assert.equal(validDoohMediaDestination(null, folders), true);
  assert.equal(validDoohMediaDestination(nextFolder, folders), true);
  assert.equal(validDoohMediaDestination(otherId, folders), false);
});
test('B03-04 rename mantém pasta e envia apenas alteração do nome', () => {
  assert.deepEqual(prepareDoohMediaCasPayload(original, 'rename', 'Novo', nextFolder, folders), { ...payload, name: 'Novo' });
  assert.equal(prepareDoohMediaCasPayload(original, 'rename', original.name, null, folders), null);
});
test('B03-05 move preserva nome; aceita destino raiz', () => {
  assert.deepEqual(prepareDoohMediaCasPayload(original, 'move', 'ignored', null, folders), { ...payload, folderId: null });
  assert.deepEqual(prepareDoohMediaCasPayload(original, 'move', 'ignored', nextFolder, folders), { ...payload, folderId: nextFolder });
  assert.equal(prepareDoohMediaCasPayload(original, 'move', 'ignored', folderId, folders), null);
});
test('B03-06 snapshot atualizado não é o anterior', () => {
  const current = parseDoohMediaCasSnapshot({ ...mediaDto, updatedAt: nextTime }, companyId, mediaId, folders);
  assert.ok(current);
  assert.equal(unchangedDoohMediaSnapshot(original, current), false);
});
test('B03-07 falha fechado em cross tenant ou mídia diferente', () => {
  assert.equal(parseDoohMediaCasSnapshot({ ...mediaDto, companyId: otherId }, companyId, mediaId, folders), null);
  assert.equal(parseDoohMediaCasSnapshot(mediaDto, companyId, otherId, folders), null);
  assert.equal(parseDoohMediaCasSnapshot({ ...mediaDto, updatedAt: 'broken' }, companyId, mediaId, folders), null);
});
test('B03-08 confirma nome e pasta esperados, inclusive com timestamp igual', () => {
  assert.equal(verifyDoohMediaCasResponse({ ...mediaDto, name: 'Novo', updatedAt: nextTime }, companyId,
    original, 'rename', 'Novo', folders), true);
  assert.equal(verifyDoohMediaCasResponse({ ...mediaDto, name: 'Novo' }, companyId,
    original, 'rename', 'Novo', folders), true);
  assert.equal(verifyDoohMediaCasResponse({ ...mediaDto, name: 'Errado', updatedAt: nextTime }, companyId,
    original, 'rename', 'Novo', folders), false);
});
test('B03-09 confirma pasta esperada sem trocar nome', () => {
  assert.equal(verifyDoohMediaCasResponse({ ...mediaDto, folderId: nextFolder, updatedAt: nextTime }, companyId,
    original, 'move', nextFolder, folders), true);
  assert.equal(verifyDoohMediaCasResponse({ ...mediaDto, folderId: null, updatedAt: nextTime }, companyId,
    original, 'move', nextFolder, folders), false);
});
test('B03-10 mensagens nunca exibem payloads secretos', () => {
  for (const status of [400,401,402,403,404,409,429,500]) {
    const label = doohMediaOrganizeError({ response: { status, data: { secret: 'SENSITIVE' } } });
    assert.ok(!label.includes('SENSITIVE'));
  }
  assert.match(doohMediaOrganizeError({response: {status:409}}), /modificada/);
});
test('B03-11 frontend chama apenas rota CAS; confere snapshot e contexto', () => {
  const component = readFileSync(join(root, 'src/components/DoohMediaOrganizeCas.tsx'), 'utf8');
  assert.match(component, /apiClient\.get<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selected\.id\)\}`\)/);
  assert.match(component, /apiClient\.patch<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selected\.id\)\}\/organize-cas`/);
  assert.doesNotMatch(component, /apiClient\.(?:post|put|delete)/);
  assert.match(component, /liveContext\.current !== requestContext/);
});
test('B03-12 backend impõe CAS atômico e isolamento sem migrations', (t) => {
  const path = join(root, '../ooh-manager-api/src/dooh-media-core/dooh-media.service.ts');
  if (!existsSync(path)) return t.skip('Backend não está no checkout do frontend; execute Jest no backend separadamente.');
  const service = readFileSync(path, 'utf8');
  assert.match(service, /async organizeCas\(/);
  assert.match(service, /updatedAt: expectedDate/);
  assert.match(service, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(service, /doohMedia\.updateMany/);
});
test('B03-13 mantém GET de Biblioteca e conecta editor separado', () => {
  const library = readFileSync(join(root, 'src/components/DoohMediaLibraryReadOnly.tsx'), 'utf8');
  assert.match(library, /<DoohMediaOrganizeCas /);
  assert.match(library, /<DoohFolderOperations /);
  assert.match(library, /apiClient\.get<unknown>\('\/dooh\/media'/);
  assert.doesNotMatch(library, /apiClient\.(?:patch|put|post|delete)/);
});
