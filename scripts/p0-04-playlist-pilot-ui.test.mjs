import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui=readFileSync('src/components/DoohPlaylistPublishQa.tsx','utf8');
const hook=readFileSync('src/lib/useDoohPlaylistPublishCapabilities.ts','utf8');
test('P0-04 UI uses only backend capability, not DOOH FULL or build flag alone',()=>{
 assert.match(ui,/useDoohPlaylistPublishCapabilities\(companyId, contextKey, allowed\)/);
 assert.match(ui,/backendPublishEnabled &&/);
 assert.match(ui,/const canPublish = publishUiEnabled &&/);
 assert.match(hook,/publishEnabled === true/);
});
test('P0-04 cache is tied to user and tenant, stale capability cannot unlock another tenant',()=>{
 assert.match(ui,/user\?\.id, user\?\.companyId, companyId/);
 assert.match(hook,/answer\?\.key === contextKey/);
 assert.match(hook,/controller\.abort\(\)/);
});
test('P0-04 CAS rechecks exact draft and confirmation; no schedule or manifest writes',()=>{
 assert.match(ui,/draftStillCurrent\(before, fresh\)/);
 assert.match(ui,/confirmation === 'PUBLICAR'/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/\/publish-cas/);
 assert.doesNotMatch(ui,/apiClient\.(put|delete)\(/);
});
test('P0-04 API network errors deny publication and secrets stay server-side',()=>{
 assert.match(hook,/enabled: false/);
 assert.doesNotMatch(hook,/DATABASE_URL|COMPANY_IDS|ACK|Bearer/);
 assert.match(ui,/A publicação não está liberada para a sua empresa/);
});
