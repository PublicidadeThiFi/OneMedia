import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  canReadDoohProcessing, canRequestDoohProcessing, parseDoohProcessingHistory,
  canEnqueueDoohProcessing, confirmDoohProcessingEnqueued, doohProcessingError,
} from '../src/lib/doohMediaProcessingContract.ts';

const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const jobId = '44444444-4444-4444-8444-444444444444';
const versionId = '55555555-5555-4555-8555-555555555555';
const timestamp = '2026-10-14T20:00:00.000Z';
const full = ['TI'];
const fakeMedia = { id: mediaId, status: 'PENDING' };
const queued = { id: jobId, mediaId, versionId, status: 'QUEUED', attempts: 0,
  availableAt: timestamp, startedAt: null, completedAt: null, errorCode: null, createdAt: timestamp,
  version: { version: 1, status: 'PENDING', checksum: null, widthPx: null, heightPx: null, durationMs: null } };
const source = (path) => readFileSync(join(process.cwd(),path),'utf8');

test('D15B05-01: consulta exige tenant, grant e role técnica', () => {
  assert.equal(canReadDoohProcessing(company, company, true, 'READ_ONLY', ['ADMINISTRATIVO']), true);
  assert.equal(canReadDoohProcessing(company, company, true, 'FULL', full), true);
  for (const [snapshotId, grant, mode, roles] of [
    [other, true, 'FULL', full], [company, false, 'FULL', full],
    [company, true, 'NONE', full], [company, true, 'FULL', ['COMERCIAL']],
  ]) assert.equal(canReadDoohProcessing(company, snapshotId, grant, mode, roles), false);
});

test('D15B05-02: enqueue exige FULL e flag QA explicitamente ligada', () => {
  assert.equal(canRequestDoohProcessing(company, company, true, 'FULL', full, true), true);
  assert.equal(canRequestDoohProcessing(company, company, true, 'FULL', full, false), false);
  assert.equal(canRequestDoohProcessing(company, company, true, 'READ_ONLY', full, true), false);
  assert.equal(canRequestDoohProcessing(company, other, true, 'FULL', full, true), false);
});

test('D15B05-03: histórico vazio válido, sem inventar jobs', () => {
  assert.deepEqual(parseDoohProcessingHistory([], mediaId), []);
  assert.equal(parseDoohProcessingHistory({}, mediaId), null);
  assert.equal(parseDoohProcessingHistory([], 'invalid'), null);
});

test('D15B05-04: histórico projeta somente dados mínimos do job', () => {
  const data = { ...queued, leaseToken: 'SECRET', requestedById: other, sourceKey: 'DO_NOT_DISPLAY',
    version: { ...queued.version, metadata: { token: 'SECRET' } } };
  const parsed = parseDoohProcessingHistory([data], mediaId);
  assert.ok(parsed); assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], { id: jobId, status: 'QUEUED', attempts: 0, version: 1,
    versionStatus: 'PENDING', availableAt: timestamp, createdAt: timestamp,
    startedAt: null, completedAt: null, failed: false });
  assert.doesNotMatch(JSON.stringify(parsed), /SECRET|requestedById|sourceKey|checksum|errorCode/);
});

test('D15B05-05: QUEUED, RUNNING, COMPLETED, FAILED têm estados coerentes', () => {
  for (const [status, vstatus, startedAt, completedAt] of [
    ['QUEUED', 'PENDING', null, null],
    ['RUNNING', 'PROCESSING', timestamp, null],
    ['COMPLETED', 'READY', timestamp, timestamp],
    ['FAILED', 'ERROR', timestamp, timestamp],
  ]) {
    const result = parseDoohProcessingHistory([{
      ...queued, status, startedAt, completedAt,
      version: { ...queued.version, status: vstatus },
    }], mediaId);
    assert.ok(result, `${status} válido`);
    assert.equal(result[0].failed, status === 'FAILED');
  }
});

test('D15B05-06: cross-media, duplicações, invalid UUID e dados desconhecidos são recusados', () => {
  assert.equal(parseDoohProcessingHistory([{ ...queued, mediaId: other }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([queued, queued], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, versionId: 'bad' }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, status: 'UNKNOWN' }], mediaId), null);
  assert.equal(parseDoohProcessingHistory(Array.from({ length: 51 }, (_, i) => ({ ...queued, id: `${i}` })), mediaId), null);
});

test('D15B05-07: timestamps, limites e versões inválidos falham fechados', () => {
  assert.equal(parseDoohProcessingHistory([{ ...queued, createdAt: 'não-data' }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, attempts: 4 }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, version: { ...queued.version, version: 0 } }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, status: 'COMPLETED' }], mediaId), null);
  assert.equal(parseDoohProcessingHistory([{ ...queued, version: { ...queued.version, checksum: 'abc' } }], mediaId), null);
});

test('D15B05-08: somente PENDING/ERROR sem fila ativa permitem pedido', () => {
  assert.equal(canEnqueueDoohProcessing(fakeMedia, []), true);
  assert.equal(canEnqueueDoohProcessing({ ...fakeMedia, status: 'ERROR' }, []), true);
  assert.equal(canEnqueueDoohProcessing({ ...fakeMedia, status: 'READY' }, []), false);
  assert.equal(canEnqueueDoohProcessing({ ...fakeMedia, status: 'PROCESSING' }, []), false);
  assert.equal(canEnqueueDoohProcessing(fakeMedia, null), false);
  assert.equal(canEnqueueDoohProcessing(fakeMedia, parseDoohProcessingHistory([queued], mediaId)), false);
  assert.equal(canEnqueueDoohProcessing(fakeMedia, [{ status: 'RUNNING' }]), false);
});

test('D15B05-09: confirmação de enfileiramento exige resposta exata', () => {
  assert.deepEqual(confirmDoohProcessingEnqueued({ jobId, status: 'QUEUED', version: 1, alreadyQueued: false, leaseToken: 'SECRET' }),
    { jobId, status: 'QUEUED', version: 1, alreadyQueued: false });
  assert.equal(confirmDoohProcessingEnqueued({ jobId, status: 'READY', version: 1, alreadyQueued: false }), null);
  assert.equal(confirmDoohProcessingEnqueued({ jobId, status: 'RUNNING', version: 1, alreadyQueued: false }), null);
  assert.equal(confirmDoohProcessingEnqueued({ jobId, status: 'QUEUED', version: 1 }), null);
});

test('D15B05-10: mensagens não propagam payloads ou segredos de erro', () => {
  const error = { response: { status: 503, data: { token: 'PRIVATE', s3Key: 'SECRET' } } };
  assert.match(doohProcessingError(error, 'queue'), /desligado/);
  assert.doesNotMatch(doohProcessingError(error, 'queue'), /PRIVATE|SECRET/);
  assert.doesNotMatch(doohProcessingError({ message: 'PRIVATE' }, 'read'), /PRIVATE/);
});

test('D15B05-11: interface conecta leitura e gate, sem iniciar worker ou publicação', () => {
  const page = source('src/components/DoohMediaLibraryReadOnly.tsx');
  const ui = source('src/components/DoohMediaProcessing.tsx');
  assert.match(page, /<DoohMediaProcessing /);
  assert.match(ui, /VITE_DOOH_MEDIA_PROCESSING_QA_UI_ENABLED === 'true'/);
  assert.match(ui, /apiClient\.get<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selectedId\)\}\/processing`/);
  assert.match(ui, /apiClient\.post<unknown>\(`\/dooh\/media\/\$\{encodeURIComponent\(selected.id\)\}\/process`/);
  assert.match(ui, /confirmation === 'PROCESSAR'/);
  assert.match(ui, /window\.confirm/);
  assert.doesNotMatch(ui, /\/worker|\/publish|\/manifest|\/delete|setInterval/);
});

test('D15B05-12: rota backend preexistente, gating servidor e worker manual isolado', t => {
  const root = join(process.cwd(), '../ooh-manager-api/src/dooh-media-core/');
  if (!existsSync(root)) return t.skip('Backend ausente no CI isolado; contrato testado separadamente no backend.');
  const controller = readFileSync(join(root, 'dooh-media.controller.ts'), 'utf8');
  const service = readFileSync(join(root, 'dooh-media-processing.service.ts'), 'utf8');
  const worker = readFileSync(join(root, 'dooh-media-processing-adapter.service.ts'), 'utf8');
  assert.match(controller, /@Get\(':id\/processing'\)/);
  assert.match(controller, /@Post\(':id\/process'\)/);
  assert.match(service, /DOOH_MEDIA_PROCESSING_ENABLED/);
  assert.match(service, /accessMode !== ModuleAccessMode\.FULL/);
  assert.match(service, /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(worker, /DOOH_MEDIA_WORKER_ENABLED/);
  assert.match(worker, /process\.env\.NODE_ENV === 'production'/);
});
