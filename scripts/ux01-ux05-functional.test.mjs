import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { doohUxIsoWithOffset, doohUxLocalFromIso } from '../src/lib/doohUxLocalTime.ts';
import { doohUxMillisecondsFromSeconds } from '../src/lib/doohUxDuration.ts';
const read = file => readFileSync(join(process.cwd(), 'src', file), 'utf8');

test('UX01: mantém rotas, exibe próxima ação e evita afirmar reprodução por registros', () => {
  const nav=read('lib/productNavigation.ts');
  assert.match(nav, /'\/app\/dooh\/screens'/); assert.match(nav, /'Telas e dispositivos'/);
  // F12: the next action lives on each screen card (screenNextStep), not in a separate pilot guide.
  assert.match(read('components/DoohOperationalScreensPanel.tsx'),/screenNextStep\(screen, writable\)/);
});
test('UX02: pareamento e associação são etapas separadas, API e idempotência intactas', () => {
  const form=read('components/DoohPlayerPairingAndAssignment.tsx');
  assert.match(form,/step === 'pair'/); assert.match(form,/step === 'associate'/);
  assert.match(form,/apiClient\.post<unknown>\('\/dooh\/players\/pair'/);
  assert.match(form,/Idempotency-Key/); assert.match(form,/apiClient\.put<unknown>/);
  assert.match(form,/parseAssignmentResult/); assert.match(form,/acknowledged/);
});
test('UX03: mídia usa capabilities, URL assinada sem credenciais, init/finalize e aprovação de processamento', () => {
  const lib=read('components/DoohMediaLibraryReadOnly.tsx');
  const up=read('components/DoohMediaUpload.tsx'), proc=read('components/DoohMediaProcessing.tsx');
  assert.match(lib,/Adicionar mídia/); assert.match(lib,/Usar nesta tela/); assert.match(lib,/preferredMediaId/);
  for(const file of [up,proc]) assert.match(file,/useDoohMediaPilotCapabilities/);
  for(const endpoint of ['/dooh/media/uploads/init','/finalize']) assert.ok(up.includes(endpoint));
  assert.match(up,/credentials: 'omit'/); assert.match(up,/redirect: 'error'/);
  assert.match(proc,/PROCESSAR/); assert.match(proc,/parseDoohProcessingHistory/);
});
test('UX04: versão publicada e player vêm de catálogos sem substituir CAS', () => {
  const picker=read('components/DoohPublishedPlaylistPicker.tsx'), target=read('components/DoohSchedulePlayerPicker.tsx');
  const schedule=read('components/DoohScheduleDetailsCasEditor.tsx'), dest=read('components/DoohScheduleTargetsCasEditor.tsx');
  assert.match(picker,/parseDoohPlaylistCatalog/);assert.match(picker,/parseDoohPlaylistDetail/);
  assert.match(picker,/status === 'PUBLISHED'/);assert.match(target,/parseDoohPlayerInventoryResponse/);
  assert.match(schedule,/DoohPublishedPlaylistPicker/);assert.match(schedule,/buildScheduleDetailsCas/);
  assert.match(dest,/DoohSchedulePlayerPicker/);assert.match(dest,/buildScheduleTargetsCas/);
  assert.match(dest,/targetsSnapshotMatches/);
});
test('UX04: horário local brasileiro preserva ISO-8601 com offset exato', () => {
  assert.equal(doohUxIsoWithOffset('2026-11-22T08:00','America/Sao_Paulo'),'2026-11-22T08:00:00-03:00');
  assert.equal(doohUxIsoWithOffset('2026-07-22T15:45','America/New_York'),'2026-07-22T15:45:00-04:00');
  assert.equal(doohUxIsoWithOffset('2026-11-22T08:00','Etc/FusoInvalido'),null);
  assert.equal(doohUxIsoWithOffset('2026-03-08T02:30','America/New_York'),null);
  assert.equal(doohUxIsoWithOffset('2026-11-01T01:30','America/New_York'),null);
  assert.equal(doohUxLocalFromIso('2026-11-22T12:00:00Z','America/Sao_Paulo'),'2026-11-22T09:00');
});
test('UX04: tempo legível em segundos preserva milissegundos exatos no payload', () => {
  assert.equal(doohUxMillisecondsFromSeconds('10'), 10000);
  assert.equal(doohUxMillisecondsFromSeconds('12.125'), 12125);
  assert.equal(doohUxMillisecondsFromSeconds('0.001'), 1);
  for (const bad of ['', '0', '-1', 'abc', '10.1234', '86400.001']) assert.equal(doohUxMillisecondsFromSeconds(bad), null);
  const editor=read('components/DoohPlaylistDraftEditor.tsx');
  assert.match(editor,/doohUxMillisecondsFromSeconds/);
  assert.match(editor,/mediaVersionId: selectedVersion, durationMs/);
});
test('UX05: manifest não é gerado automaticamente; preflight/CAS e confirmação são preservados',()=>{
 const detail=read('components/DoohPlayerDetailReadOnly.tsx'), publish=read('components/DoohManifestPublishQa.tsx');
 assert.match(detail,/Preparar atualização/);assert.match(detail,/DoohManifestSyncDiagnosticReadOnly/);
 assert.match(publish,/buildManifestCasRequest/);assert.match(publish,/fetchPreflight/);
 assert.match(publish,/await ask\(/);assert.match(publish,/confirmation !== 'MATERIALIZAR PILOTO'/);
 assert.match(publish,/ack/);
});
