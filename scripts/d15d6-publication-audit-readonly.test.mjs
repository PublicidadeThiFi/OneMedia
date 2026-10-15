import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePublicationAudit, publicationAuditError, auditCheckNames } from '../src/lib/doohSchedulePublicationAuditContract.ts';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const companyId = '11111111-1111-4111-8111-111111111111';
const scheduleId = '33333333-3333-4333-8333-333333333333';
const versionId = '44444444-4444-4444-8444-444444444444';
const stamp = '2026-10-15T12:00:00.000Z';
const selected = { id: scheduleId, playlistVersionId: versionId, status: 'PUBLISHED', publishedAt: stamp,
  updatedAt: stamp, targetCount: 1 };
const response = () => ({ scope: 'CURRENT_RECORD_ONLY', companyId, scheduleId, scheduleStatus: 'PUBLISHED',
  scheduleUpdatedAt: stamp, publishedAt: stamp, publisherReferenceRecorded: true,
  playlistVersionId: versionId, playlistVersionRecorded: true, targetCount: 1, targetListCapped: false,
  targetTypeCounts: { PLAYER: 1, GROUP: 0, MEDIA_UNIT: 0, MEDIA_POINT: 0 },
  outcome: 'STRUCTURAL_RECORD_CONSISTENT', checks: [], distribution: 'NOT_CHECKED', playback: 'NOT_CHECKED', history: 'NOT_AVAILABLE' });
const parse = (raw, sel = selected) => parsePublicationAudit(raw, companyId, sel);
test('D15D06-01 aceita projeção mínima estrutural sem inferir entrega', () => {
 const r = parse(response()); assert.equal(r.outcome, 'STRUCTURAL_RECORD_CONSISTENT');
 assert.equal('distribution' in r, false);
});
test('D15D06-02 recusa empresa distinta', () => assert.equal(parse({ ...response(), companyId: scheduleId }), null));
test('D15D06-03 recusa ID ou revisão divergente', () => {
 assert.equal(parse({ ...response(), scheduleId: versionId }), null);
 assert.equal(parse({ ...response(), scheduleUpdatedAt: '2026-10-15T12:01:00Z' }), null);
});
test('D15D06-04 recusa versão ou status divergente', () => {
 assert.equal(parse({ ...response(), playlistVersionId: scheduleId }), null);
 assert.equal(parse({ ...response(), scheduleStatus: 'DRAFT' }), null);
});
test('D15D06-05 recusa publicação distinta ou malformada', () => {
 assert.equal(parse({ ...response(), publishedAt: null }), null);
 assert.equal(parse({ ...response(), publishedAt: 'not-date' }), null);
});
test('D15D06-06 limita o escopo do retorno', () => {
 for (const change of [{ scope: 'COMPLETE_HISTORY' }, { distribution: 'DELIVERED' },
   { playback: 'VERIFIED' }, { history: 'COMPLETE' }]) assert.equal(parse({ ...response(), ...change }), null);
});
test('D15D06-07 impede classificação limpa com alertas', () => {
 assert.equal(parse({ ...response(), checks: ['NO_TARGETS'] }), null);
 assert.equal(parse({ ...response(), outcome: 'REVIEW_REQUIRED' }), null);
});
test('D15D06-08 admite revisão com código previsto', () => {
 const r = parse({ ...response(), outcome: 'REVIEW_REQUIRED', checks: ['PLAYLIST_VERSION_NOT_VERIFIED'] });
 assert.deepEqual(r.checks, ['PLAYLIST_VERSION_NOT_VERIFIED']);
});
test('D15D06-09 recusa códigos de erro desconhecidos ou repetidos', () => {
 for (const checks of [['INTERNAL_TOKEN'], ['NO_TARGETS', 'NO_TARGETS']])
   assert.equal(parse({ ...response(), outcome: 'REVIEW_REQUIRED', checks }), null);
});
test('D15D06-10 não aceita total de destinos diferente ou truncado', () => {
 assert.equal(parse({ ...response(), targetCount: 2 }), null);
 assert.equal(parse({ ...response(), targetListCapped: true }), null);
});
test('D15D06-11 não aceita contagens inválidas ou classificação limpa incoerente', () => {
 assert.equal(parse({ ...response(), targetTypeCounts: { PLAYER: 2, GROUP: 0, MEDIA_UNIT: 0, MEDIA_POINT: 0 } }), null);
 assert.equal(parse({ ...response(), targetTypeCounts: { PLAYER: 1, GROUP: -1, MEDIA_UNIT: 0, MEDIA_POINT: 0 } }), null);
});
test('D15D06-12 não permite omissão de ator em status estruturalmente consistente', () =>
 assert.equal(parse({ ...response(), publisherReferenceRecorded: false }), null));
test('D15D06-13 erros fixos não refletem corpo confidencial', () => {
 const msg = publicationAuditError({ response: { status: 500, data: 'secretBearerToken' } });
 assert.equal(msg.includes('secretBearerToken'), false);
 assert.ok(Object.keys(auditCheckNames).includes('TARGET_INCONSISTENT'));
});
test('D15D06-14 a UI somente consulta GET e cancela na troca de contexto', () => {
 const source = fs.readFileSync(path.join(root,'src/components/DoohSchedulePublicationAudit.tsx'),'utf8');
 assert.match(source, /apiClient\.get<unknown>/);
 assert.match(source, /AbortController/);
 assert.doesNotMatch(source, /apiClient\.(post|patch|put|delete)/);
 assert.match(source, /liveKey\.current === before/);
});
test('D15D06-15 integra conferência sem alterar publicação QA, destinos ou preview', () => {
 const source = fs.readFileSync(path.join(root,'src/components/DoohScheduleCatalogReadOnly.tsx'),'utf8');
 for (const token of ['DoohSchedulePublicationAudit', 'DoohSchedulePublishQa', 'DoohScheduleTargetsCasEditor', 'DoohScheduleTemporalPreview'])
   assert.ok(source.includes(token), `${token} missing`);
});
test('D15D06-16 serviço limita consulta e não faz chamadas de distribuição', () => {
 const backend = path.resolve(root, '..', 'ooh-manager-api');
 const svc = path.join(backend,'src/dooh-schedule-core/dooh-schedule-publication-audit.service.ts');
 if (!fs.existsSync(svc)) return; // standalone frontend CI has no backend checkout
 const source = fs.readFileSync(svc,'utf8');
 assert.match(source,/take: MAX_TARGETS \+ 1/);
 assert.match(source,/resolveCompanyAccess/);
 assert.doesNotMatch(source,/manifestPublication|manifest\.create|playbackEvent\.create|\.update\(/);
});
