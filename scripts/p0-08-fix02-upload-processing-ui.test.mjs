import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canUploadDoohMedia, validateDoohUploadFile, parseDoohUploadIntent,
  confirmDoohUploadFinalized, doohUploadError } from '../src/lib/doohMediaUploadContract.ts';
import { canRequestDoohProcessing, canEnqueueDoohProcessing, confirmDoohProcessingEnqueued } from '../src/lib/doohMediaProcessingContract.ts';
import { parseDoohLibraryFolders } from '../src/lib/doohMediaLibraryContract.ts';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const upload = read('src/components/DoohMediaUpload.tsx');
const processing = read('src/components/DoohMediaProcessing.tsx');
const library = read('src/components/DoohMediaLibraryReadOnly.tsx');
const pilot = read('src/lib/useDoohMediaPilotCapabilities.ts');
const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const intentId = '44444444-4444-4444-8444-444444444444';
const folders = parseDoohLibraryFolders([], company);
const now = '2026-11-20T00:00:00.000Z';

test('FIX02-01: upload e processamento não ficam bloqueados por flag compilada', () => {
  for (const s of [upload, processing]) {
    assert.doesNotMatch(s, /VITE_DOOH_MEDIA_UPLOAD_UI_ENABLED|VITE_DOOH_MEDIA_PROCESSING_QA_UI_ENABLED|VITE_DOOH_MEDIA_PROCESSING_PILOT_UI_ENABLED/);
    assert.doesNotMatch(s, /ainda bloqueado nesta compilação|Enfileiramento ainda não habilitado nesta compilação/);
  }
  assert.match(upload, /eligible && pilot\.uploadEnabled/);
  assert.match(processing, /eligibleQueue && pilot\.processingEnabled/);
  assert.match(pilot, /apiClient\.get<unknown>\('\/dooh\/media\/capabilities'/);
  assert.match(pilot, /result\?\.key === contextKey/);
});

test('FIX02-02: usuário de outra empresa, READ_ONLY e papel não técnico são barrados', () => {
  const canUpload = (cid, mode, roles, grant=true) => canUploadDoohMedia(company, cid, grant, mode, roles, true);
  const canProcess = (cid, mode, roles, grant=true) => canRequestDoohProcessing(company, cid, grant, mode, roles, true);
  assert.equal(canUpload(company,'FULL',['TI']), true);
  assert.equal(canProcess(company,'FULL',['ADMINISTRATIVO']), true);
  for (const [cid, mode, roles, granted] of [
    [other,'FULL',['TI'],true], [company,'READ_ONLY',['TI'],true],
    [company,'FULL',['COMERCIAL'],true], [company,'FULL',['TI'],false],
  ]) { assert.equal(canUpload(cid,mode,roles,granted),false); assert.equal(canProcess(cid,mode,roles,granted),false); }
});

test('FIX02-03: PNG, JPEG e MP4 válidos e arquivos inseguros rejeitados', () => {
  for (const [name, type] of [['foto.png','image/png'],['imagem.jpeg','image/jpeg'],['video.mp4','video/mp4']])
    assert.equal(validateDoohUploadFile({name, type, size: 1024})?.mimeType, type);
  assert.equal(validateDoohUploadFile({name:'x.png',type:'video/mp4',size:1024}),null);
  assert.equal(validateDoohUploadFile({name:'video.mp4',type:'video/mp4',size:0}),null);
  assert.equal(validateDoohUploadFile({name:'../video.mp4',type:'video/mp4',size:1024}),null);
});

test('FIX02-04: init API, PUT assinado sem credenciais e finalize confirmada', () => {
  assert.match(upload, /apiClient\.post<unknown>\('\/dooh\/media\/uploads\/init'/);
  assert.match(upload, /fetch\(intent\.url/);
  assert.match(upload, /method: 'PUT'/);
  assert.match(upload, /credentials: 'omit', redirect: 'error'/);
  assert.match(upload, /uploads\/\$\{encodeURIComponent\(pending\.intentId\)\}\/finalize/);
  assert.match(upload, /Tentar concluir de novo/);
  assert.doesNotMatch(upload, /apiClient\.put\(|console\.|localStorage|sessionStorage/);
});

test('FIX02-05: intenção e recibo usam contrato real e recusam outro tenant', () => {
  const file = {mimeType:'image/png',size:1024};
  const x = parseDoohUploadIntent({ intentId, contentType:'image/png', size:1024,
    uploadUrl:'https://private.s3.us-east-1.amazonaws.com/k?X-Amz-Signature=z&X-Amz-Credential=y',
    uploadHeaders:{}, expiresAt:new Date(Date.now()+120000).toISOString(), }, file);
  assert.ok(x);
  const media = {id:mediaId,companyId:company,folderId:null,name:'Foto',status:'PENDING',
    storedAsset:{kind:'IMAGE',mimeType:'image/png',bytes:'1024'},_count:{versions:0},
    createdAt:now,updatedAt:now,widthPx:null,heightPx:null,durationMs:null};
  assert.equal(confirmDoohUploadFinalized(media, company, null, 'Foto', file, folders).id, mediaId);
  assert.equal(confirmDoohUploadFinalized({...media,companyId:other}, company, null, 'Foto', file, folders),null);
  assert.match(doohUploadError(null,'put'),/Confira sua conexão/);
  assert.doesNotMatch(doohUploadError(null,'put'),/S3|CORS/);
});

test('FIX02-06: após upload, filtro Pronta e pasta não escondem PENDING novo', () => {
  assert.match(library, /const onUploaded = \(mediaId: string, autoProcessing: boolean\) =>/);
  assert.match(library, /setFolderFilter\('all'\); setStatusFilter\(''\); setTypedSearch\(''\)/);
  assert.match(library, /<DoohMediaUpload[^>]+onChanged=\{onUploaded\}/);
  assert.match(upload, /setFile\(null\); setNameInput\(''\); setFolderId\('root'\)/);
});

test('FIX02-07: processamento GET histórico, valida estado e enfileira por POST apenas por confirmação', () => {
  assert.match(processing, /apiClient\.get<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selectedId\)\}\/processing`/);
  assert.match(processing, /apiClient\.post<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selected.id\)\}\/process`/);
  assert.match(processing, /confirmation === 'PROCESSAR'/);
  assert.match(processing, /await ask\(/);
  assert.equal(canEnqueueDoohProcessing({status:'PENDING'},[]),true);
  assert.equal(canEnqueueDoohProcessing({status:'READY'},[]),false);
  assert.equal(confirmDoohProcessingEnqueued({jobId:intentId,status:'QUEUED',version:1,alreadyQueued:false})?.status,'QUEUED');
});

test('FIX02-08: acompanhamento periódico só faz GET, tem limite e cancela na troca da mídia', () => {
  assert.match(processing, /refreshAttempts >= 60/);
  assert.match(processing, /setTimeout\(/);
  assert.match(processing, /clearTimeout\(/);
  assert.match(processing, /setAutoTracking\(false\)/);
  assert.match(processing, /setRefreshAttempts\(0\)/);
  assert.doesNotMatch(processing, /setInterval\(/);
  assert.match(processing, /\[autoTracking, canRead, selected, visible, loading, busy, refreshAttempts, onChanged\]/);
});

test('FIX02-09: nenhum bypass dos grants/gates nem credenciais AWS no bundle', () => {
  for (const s of [upload,processing,pilot]) {
    assert.doesNotMatch(s, /AWS_SECRET_ACCESS_KEY|deviceSecret|pollToken|DATABASE_URL/);
    assert.doesNotMatch(s, /\/api\/dooh\/media|\/worker\/start|\/manifest\/publish/);
  }
  assert.match(upload, /user\?\.companyId === companyId/);
  assert.match(processing, /user\?\.companyId === companyId/);
  assert.match(pilot, /abort\.signal\.aborted/);
});
