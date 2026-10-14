import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { canReadDoohMediaVersions, parseDoohVersions, doohVersionsError } from '../src/lib/doohMediaVersionsContract.ts';

const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const media = '33333333-3333-4333-8333-333333333333';
const v1id = '44444444-4444-4444-8444-444444444444';
const v2id = '55555555-5555-4555-8555-555555555555';
const ts = '2026-10-14T20:00:00.000Z';
const version = { id: v1id, mediaId: media, version: 1, status: 'READY', checksum: 'a'.repeat(64),
  widthPx: 1920, heightPx: 1080, durationMs: 30000, createdAt: ts, updatedAt: ts,
  processedAsset: { mimeType: 'video/mp4', bytes: '9000', available: true } };
const response = (versions = [version], total = versions.length) => ({mediaId: media, total, limit: 50, versions});
const source = path => readFileSync(join(process.cwd(), path),'utf8');

test('D15B06-01: READ_ONLY e FULL exigem tenant, grant e papel técnico', () => {
  assert.equal(canReadDoohMediaVersions(company, company, true, 'READ_ONLY', ['TI']), true);
  assert.equal(canReadDoohMediaVersions(company, company, true, 'FULL', ['ADMINISTRATIVO']), true);
  for (const [c,g,m,r] of [[other,true,'FULL',['TI']],[company,false,'FULL',['TI']],
    [company,true,'NONE',['TI']],[company,true,'FULL',['COMERCIAL']]])
    assert.equal(canReadDoohMediaVersions(company,c,g,m,r),false);
});
test('D15B06-02: lista READY validada não expõe dados brutos ou S3', () => {
  const raw = { ...version, processedAsset: { ...version.processedAsset, s3Key: 'PRIVATE' }, metadata: {secret:'HIDDEN'}, processedAssetId: 'PRIVATE' };
  const result = parseDoohVersions(response([raw]), media);
  assert.ok(result); assert.equal(result.total, 1); assert.equal(result.limited, false);
  assert.equal(result.versions[0].verification, 'READY_METADATA_OK');
  assert.equal(result.versions[0].processedAsset.bytes, '9000');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|HIDDEN|s3Key|metadata|processedAssetId/);
});
test('D15B06-03: PENDING/PROCESSING/ERROR nunca são presumidos READY', () => {
  for (const status of ['PENDING','PROCESSING','ERROR']) {
    const r = parseDoohVersions(response([{...version,status,checksum:null,processedAsset:null}]),media);
    assert.ok(r); assert.equal(r.versions[0].verification,'NOT_READY');
  }
});
test('D15B06-04: READY sem checksum ou sem asset disponível requer revisão', () => {
  for (const change of [{checksum:null},{processedAsset:null},
    {processedAsset:{...version.processedAsset,available:false}},
    {processedAsset:{...version.processedAsset,bytes:'0'}}]) {
    const r = parseDoohVersions(response([{...version,...change}]),media);
    assert.ok(r); assert.equal(r.versions[0].verification,'REVIEW_REQUIRED');
  }
});
test('D15B06-05: histórico vazio é válido, sem inventar versões', () => {
  assert.deepEqual(parseDoohVersions(response([],0),media),{total:0,limited:false,versions:[]});
  assert.equal(parseDoohVersions([],media),null);
  assert.equal(parseDoohVersions(response(), 'invalid'),null);
});
test('D15B06-06: limite 50 e contagem real são declarados', () => {
  const r = parseDoohVersions(response([version],70),media);
  assert.ok(r); assert.equal(r.limited,true); assert.equal(r.total,70);
  assert.equal(parseDoohVersions({...response(),limit:100},media),null);
  assert.equal(parseDoohVersions(response([version],0),media),null);
  assert.equal(parseDoohVersions(response(Array(51).fill(version),51),media),null);
});
test('D15B06-07: cross-media ou mediaId desconhecido falham fechados', () => {
  assert.equal(parseDoohVersions({...response(),mediaId:other},media),null);
  assert.equal(parseDoohVersions(response([{...version,mediaId:other}]),media),null);
  assert.equal(parseDoohVersions(response(),other),null);
});
test('D15B06-08: versões devem estar em ordem decrescente e sem duplicação', () => {
  const newer = {...version,id:v2id,version:2};
  assert.ok(parseDoohVersions(response([newer,version]),media));
  assert.equal(parseDoohVersions(response([version,newer]),media),null);
  assert.equal(parseDoohVersions(response([version,version]),media),null);
  assert.equal(parseDoohVersions(response([{...version,id:v2id,version:1},version]),media),null);
});
test('D15B06-09: checksums, tipos, bytes, timestamps e dimensões invalidos são recusados', () => {
  for (const change of [{checksum:'short'},{status:'UNKNOWN'},{widthPx:-1},{durationMs:1.2},
    {createdAt:'yesterday'},{processedAsset:{...version.processedAsset,bytes:'-1'}},
    {processedAsset:{...version.processedAsset,mimeType:'!invalid'}},
    {processedAsset:{...version.processedAsset,available:'true'}}])
    assert.equal(parseDoohVersions(response([{...version,...change}]),media),null);
});
test('D15B06-10: erros não refletem URLs ou dados confidenciais do backend', () => {
  assert.match(doohVersionsError({response:{status:404,data:{url:'SECRET'}}}),/não encontrada/);
  assert.doesNotMatch(doohVersionsError({message:'SECRET'}),/SECRET/);
});
test('D15B06-11: UI usa apenas GET e preserva processamento anterior', () => {
  const lib=source('src/components/DoohMediaLibraryReadOnly.tsx');
  const ui=source('src/components/DoohMediaVersionsReadOnly.tsx');
  assert.match(lib,/<DoohMediaVersionsReadOnly /);
  assert.match(lib,/<DoohMediaProcessing /);
  assert.match(ui,/apiClient\.get<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selectedId\)\}\/versions`/);
  assert.match(ui,/new AbortController\(/);
  assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)|\/publish|\/worker|\/restart|setInterval/);
});
test('D15B06-12: backend exige tenant e retorna projeção sem keys, sem migrations', t => {
  const base=join(process.cwd(),'../ooh-manager-api/src/dooh-media-core/');
  if (!existsSync(base)) return t.skip('Backend não está presente neste CI isolado; Jest deve executar no backend.');
  const ctrl=readFileSync(join(base,'dooh-media.controller.ts'),'utf8');
  const service=readFileSync(join(base,'dooh-media.service.ts'),'utf8');
  assert.match(ctrl,/@Get\(':id\/versions'\)/);
  assert.match(ctrl, /return this\.media\.listVersions\(req\.user\.companyId, id\)/);
  assert.match(service,/where: \{ mediaId: id, media: \{ companyId \} \}/);
  assert.match(service,/take: 50/);
  assert.match(service,/processedAsset: \{ select: \{ mimeType: true, bytes: true, deletedAt: true \} \}/);
  assert.doesNotMatch(service.slice(service.indexOf('async listVersions('),service.indexOf('async organizeCas(')), /s3Key|metadata: true|process\.env|uploadUrl/);
});
