import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildManifestCasRequest } from '../src/lib/doohManifestPublishCasContract.ts';
const read = file => readFileSync(file, 'utf8');
const ready = {status:'READY',playerId:'11111111-1111-4111-8111-111111111111',from:'2026-11-21T12:00:00.000Z',to:'2026-11-21T13:00:00.000Z', checksum:'a'.repeat(64),desired:'1',current:'1'};
test('P0-05 UI: only server capability may unlock schedule publication',()=>{
 const ui=read('src/components/DoohSchedulePublishQa.tsx');const hook=read('src/lib/useDoohSchedulePublishCapabilities.ts');
 assert.match(ui,/useDoohSchedulePublishCapabilities/);assert.match(ui,/backend\.publishEnabled/);
 assert.match(ui,/publishSnapshotMatches/);assert.match(ui,/publish-cas/);assert.match(ui,/window\.confirm/);
 assert.match(hook,/\/dooh\/schedules\/publish-capabilities/);assert.match(hook,/AbortController/);
 assert.doesNotMatch(hook,/localStorage|sessionStorage/);
});
test('P0-05 UI: only server capability and explicit pilot acknowledgment may materialize manifest',()=>{
 const ui=read('src/components/DoohManifestPublishQa.tsx'); const hook=read('src/lib/useDoohManifestPublishCapabilities.ts');
 assert.match(ui,/useDoohManifestPublishCapabilities/);assert.match(ui,/server\.materializeEnabled/);
 assert.match(ui,/server\.mode === 'PILOT'/);assert.match(ui,/MATERIALIZAR PILOTO/);
 assert.match(ui,/await fetchPreflight\(\)/);assert.match(ui,/window\.confirm/);
 assert.match(hook,/\/dooh\/manifests\/publish-capabilities/); assert.match(hook,/AbortController/);
 assert.doesNotMatch(hook,/localStorage|sessionStorage/);
});
test('P0-05 UI: QA payload compatibility and different pilot confirmation',()=>{
 const qa=buildManifestCasRequest(ready,true);const pilot=buildManifestCasRequest(ready,true,'PILOT');
 assert.equal(qa?.confirmation,'MATERIALIZAR_MANIFEST_QA'); assert.equal(pilot?.confirmation,'MATERIALIZAR_MANIFEST_PILOTO');
 assert.equal(buildManifestCasRequest({...ready,status:'REVIEW_REQUIRED'},true,'PILOT'),null);
 assert.equal(buildManifestCasRequest(ready,false,'PILOT'),null);
 assert.equal(Object.keys(pilot).some(x=>/secret|token|url|credential/i.test(x)),false);
});
test('P0-05 UI: manifest remains separate from schedule; no fabricated delivery acknowledgement',()=>{
 const sched=read('src/components/DoohSchedulePublishQa.tsx'); const manifest=read('src/components/DoohManifestPublishQa.tsx');
 assert.doesNotMatch(sched,/\/dooh\/manifests\/players/);
 assert.match(manifest,/preflight/);assert.match(manifest,/desiredManifestVersion/);
 assert.doesNotMatch(manifest,/Proof-of-Play confirmado|reprodução comprovada/);
});
