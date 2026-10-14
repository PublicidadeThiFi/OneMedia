import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  canUploadDoohMedia, validateDoohUploadFile, normalizeDoohUploadName,
  validDoohUploadFolder, parseDoohUploadIntent, confirmDoohUploadFinalized,
  doohUploadError,
} from '../src/lib/doohMediaUploadContract.ts';
import { parseDoohLibraryFolders } from '../src/lib/doohMediaLibraryContract.ts';
const companyId = '11111111-1111-4111-8111-111111111111';
const another = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const folderId = '44444444-4444-4444-8444-444444444444';
const intentId = '55555555-5555-4555-8555-555555555555';
const mimeType = 'image/png';
const file = { name: 'media.png', size: 4096, type: mimeType };
const time = '2026-10-14T19:00:00.000Z';
const folders = parseDoohLibraryFolders([{ id: folderId, companyId, parentId: null, name: 'Campanha', _count: { children: 0, media: 0 } }], companyId);
const receipt = { id: mediaId, companyId, folderId, name: 'Campanha x', status: 'PENDING',
  createdAt: time, updatedAt: time, widthPx: null, heightPx: null, durationMs: null,
  storedAsset: { mimeType, bytes: '4096', kind: 'IMAGE' }, _count: { versions: 0 } };
function intent(changes = {}) {
  return { intentId, uploadUrl: 'https://mybucket.s3.us-east-1.amazonaws.com/dooh/file?X-Amz-Signature=secret&X-Amz-Credential=public',
    uploadHeaders: {}, contentType: mimeType, size: 4096, expiresAt: new Date(Date.now() + 12*60_000).toISOString(), ...changes };
}
test('D15B04-01: gate off por padrao; somente FULL, tenant e papel tecnico', () => {
  assert.equal(canUploadDoohMedia(companyId, companyId, true, 'FULL', ['TI'], true), true);
  for (const [cid, granted, mode, roles, enabled] of [
    [another,true,'FULL',['TI'],true], [companyId,false,'FULL',['TI'],true],
    [companyId,true,'READ_ONLY',['TI'],true], [companyId,true,'FULL',['VENDEDOR'],true],
    [companyId,true,'FULL',['TI'],false],
  ]) assert.equal(canUploadDoohMedia(companyId, cid, granted, mode, roles, enabled), false);
});
test('D15B04-02: aceita MIME e extensoes previstos', () => {
  for (const [name, type] of [['img.jpg','image/jpeg'], ['a.webp','image/webp'], ['v.mp4','video/mp4'], ['p.pdf','application/pdf']]) {
    assert.equal(validateDoohUploadFile({ name, type, size: 900 })?.mimeType, type);
  }
});
test('D15B04-03: rejeita arquivo vazio, tamanho excedido, path e MIME discordante', () => {
  for (const specimen of [ { ...file, size: 0 }, { ...file, size: 5*1024**3+1 },
    { ...file, type: 'image/jpeg' }, { ...file, name: '../media.png' },
    { ...file, name: 'bad.exe' }, { ...file, name: 'zero.pdf', type: '' } ])
    assert.equal(validateDoohUploadFile(specimen), null);
});
test('D15B04-04: nome valido e filtro de pastas', () => {
  assert.equal(normalizeDoohUploadName('  Filme  '), 'Filme');
  assert.equal(normalizeDoohUploadName('x'.repeat(161)), null);
  assert.equal(normalizeDoohUploadName('\u0000'), null);
  assert.equal(validDoohUploadFolder(null, folders), true);
  assert.equal(validDoohUploadFolder(folderId, folders), true);
  assert.equal(validDoohUploadFolder(another, folders), false);
});
test('D15B04-05: intent de S3 autorizado projeta somente dados efemeros locais', () => {
  const x = parseDoohUploadIntent(intent(), fileToExpected(file));
  assert.equal(x?.intentId, intentId);
  assert.equal(x?.headers['Authorization'], undefined);
});
function fileToExpected(x) { return { size: x.size, mimeType: x.type }; }
test('D15B04-06: bloqueia endpoint HTTP, credenciais na URL e host enganoso', () => {
  const urls = [
    'http://mybucket.s3.us-east-1.amazonaws.com/x?X-Amz-Signature=z&X-Amz-Credential=y',
    'https://amazonaws.com.evil.com/x?X-Amz-Signature=z&X-Amz-Credential=y',
    'https://user:pass@mybucket.s3.us-east-1.amazonaws.com/x?X-Amz-Signature=z&X-Amz-Credential=y',
    'https://127.0.0.1/x?X-Amz-Signature=z&X-Amz-Credential=y',
    'https://mybucket.s3.us-east-1.amazonaws.com/x',
  ];
  for (const url of urls) assert.equal(parseDoohUploadIntent(intent({uploadUrl:url}), fileToExpected(file)), null);
});
test('D15B04-07: recusa headers arbitrarios ou content type adulterado', () => {
  assert.equal(parseDoohUploadIntent(intent({ uploadHeaders: { Authorization: 'Bearer leaked' } }), fileToExpected(file)), null);
  assert.equal(parseDoohUploadIntent(intent({ uploadHeaders: { 'Content-Type': 'video/mp4' } }), fileToExpected(file)), null);
  assert.ok(parseDoohUploadIntent(intent({ uploadHeaders: { 'Content-Type': mimeType } }), fileToExpected(file)));
});
test('D15B04-08: recusa intent expirada, malformada ou outro arquivo', () => {
  assert.equal(parseDoohUploadIntent(intent({ size: 55 }), fileToExpected(file)), null);
  assert.equal(parseDoohUploadIntent(intent({ intentId: another, expiresAt: time }), fileToExpected(file)), null);
  assert.equal(parseDoohUploadIntent(intent({ expiresAt: new Date(Date.now()+50*60_000).toISOString() }), fileToExpected(file)), null);
});
test('D15B04-09: finalize aceita registro PENDING com bytes e tenant exatos', () => {
  const x = confirmDoohUploadFinalized(receipt, companyId, folderId, 'Campanha x', fileToExpected(file), folders);
  assert.equal(x?.id, mediaId);
  assert.equal(x?.status, 'PENDING');
});
test('D15B04-10: finalize rejeita READY, outro tenant, outra pasta e bytes alterados', () => {
  for (const altered of [{status:'READY'}, {companyId:another}, {folderId:null},
    {storedAsset:{ ...receipt.storedAsset,bytes:'4000'}}, {_count:{ versions:1 }}])
    assert.equal(confirmDoohUploadFinalized({ ...receipt,...altered }, companyId, folderId, 'Campanha x', fileToExpected(file), folders), null);
});
test('D15B04-11: codigos de erro fixos nao vazam secrets ou URLs', () => {
  for (const status of [400,401,402,403,404,409,413,429,500,503]) {
    const label = doohUploadError({response:{status,data:{secret:'MY_SECRET'}}}, 'init');
    assert.ok(!label.includes('MY_SECRET'));
  }
  assert.match(doohUploadError({}, 'put'), /S3/);
});
test('D15B04-12: upload nao manda auth ao S3 nem segue redirecionamento', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohMediaUpload.tsx'), 'utf8');
  assert.match(source, /VITE_DOOH_MEDIA_UPLOAD_UI_ENABLED === 'true'/);
  assert.match(source, /apiClient\.post<unknown>\('\/dooh\/media\/uploads\/init'/);
  assert.match(source, /fetch\(intent\.url/);
  assert.match(source, /credentials: 'omit', redirect: 'error'/);
  assert.match(source, /method: 'PUT'/);
  assert.doesNotMatch(source, /apiClient\.put/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage/);
});
test('D15B04-13: exige finalize confirmado; nao aciona processing nem publica', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohMediaUpload.tsx'), 'utf8');
  assert.match(source, /confirmDoohUploadFinalized/);
  assert.match(source, /Repetir finalização \(sem reenviar\)/);
  assert.doesNotMatch(source, /\/process['`]|\/publish['`]|\/manifest['`]/);
});
test('D15B04-14: Biblioteca anterior mantida; apenas componente adicional', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/DoohMediaLibraryReadOnly.tsx'), 'utf8');
  assert.match(source, /<DoohFolderOperations /);
  assert.match(source, /<DoohMediaOrganizeCas /);
  assert.match(source, /<DoohMediaUpload /);
  assert.match(source, /apiClient\.get<unknown>\('\/dooh\/media'/);
  assert.doesNotMatch(source, /apiClient\.post|apiClient\.put/);
});
test('D15B04-15: backend ja oferece init/finalize com gate e quota (sem migrations)', t => {
  const path = join(process.cwd(), '../ooh-manager-api/src/dooh-media-core/dooh-media.service.ts');
  if (!existsSync(path)) return t.skip('Backend indisponivel em CI frontend; validar no projeto Nest separadamente.');
  const source = readFileSync(path, 'utf8');
  assert.match(source, /async initUpload\(/);
  assert.match(source, /async finalizeUpload\(/);
  assert.match(source, /DOOH_MEDIA_UPLOADS_ENABLED/);
  assert.match(source, /sharedStorageQuota/);
  assert.match(source, /s3HeadObjectInfo/);
  assert.match(source, /DoohUploadIntentStatus\.ISSUED/);
});
