import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDoohJourneySummary } from '../src/lib/doohOnboardingContract.ts';
import { publicMarketplacePointPath } from '../src/lib/publicMarketplacePointLink.ts';
const company = '123e4567-e89b-42d3-a456-426614174000';
const other = '223e4567-e89b-42d3-a456-426614174000';
const date = '2026-11-19T19:00:00.000Z';

test('P0-07: no players is not interpreted as activation', () => {
  assert.deepEqual(parseDoohJourneySummary('screens', {items: [], meta: {page:1,pageSize:20,total:0,totalPages:1,offlineAfterSeconds:90}}, company),
    {state:'empty',partial:false,text:'Nenhum player cadastrado.'});
});
test('P0-07: player counts do not certify playback', () => {
  const row={id:company,name:'P1',platform:'WEB',lifecycleStatus:'ACTIVE',online:true,lastSeenAt:null,appVersion:null,desiredManifestVersion:'1',currentManifestVersion:'1',currentAssignment:null};
  const summary=parseDoohJourneySummary('screens', {items:[row],meta:{page:1,pageSize:20,total:1,totalPages:1,offlineAfterSeconds:90}},company);
  assert.equal(summary?.state,'found');assert.ok(!summary?.text.includes('exibi'));
});
test('P0-07: folders and media reject cross-tenant content', () => {
  const media=[{id:company,companyId:other,folderId:null,name:'A',status:'READY',storedAsset:{kind:'IMAGE',mimeType:'image/png',bytes:'200'},durationMs:null,widthPx:null,heightPx:null,createdAt:date,updatedAt:date,_count:{versions:1}}];
  assert.equal(parseDoohJourneySummary('library',media,company,[]),null);
});
test('P0-07: READY image remains only a media readiness, not playback', () => {
  const media=[{id:company,companyId:company,folderId:null,name:'A',status:'READY',storedAsset:{kind:'IMAGE',mimeType:'image/png',bytes:'200'},durationMs:null,widthPx:null,heightPx:null,createdAt:date,updatedAt:date,_count:{versions:1}}];
  const summary=parseDoohJourneySummary('library',media,company,[]);
  assert.equal(summary?.state,'found');assert.ok(summary?.text.includes('prontas'));
});
test('P0-07: public link only for published profile and enabled marketplace', () => {
  assert.equal(publicMarketplacePointPath('ponto-central','PUBLISHED',true),'/pontos/ponto-central');
  for (const status of ['DRAFT','SUSPENDED']) assert.equal(publicMarketplacePointPath('ponto-central',status,true),null);
  assert.equal(publicMarketplacePointPath('ponto-central','PUBLISHED',false),null);
  for (const slug of ['','../abc','foo/bar','foo?x=1','foo#x',' space']) assert.equal(publicMarketplacePointPath(slug,'PUBLISHED',true),null);
});
test('P0-07: overview links to real routes; dashboard performs GET only', () => {
  const ui=readFileSync(new URL('../src/components/DoohGettingStarted.tsx',import.meta.url),'utf8');
  const foundation=readFileSync(new URL('../src/components/DoohFoundationPage.tsx',import.meta.url),'utf8');
  assert.match(ui,/DoohGettingStarted/);assert.match(foundation,/<DoohGettingStarted\s*\/>/);
  for(const route of ['\/dooh\/players','\/dooh\/folders','\/dooh\/media','\/dooh\/playlists','\/dooh\/schedules']) assert.ok(ui.includes(route));
  assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)\s*\(/);
  assert.match(ui,/navigator|window|Player Web público/);
});
test('P0-07: published point share link is based on API profile status', () => {
  const source=readFileSync(new URL('../src/components/MarketplaceManagement.tsx',import.meta.url),'utf8');
  assert.match(source,/publicMarketplacePointPath\(item\.profile\?\.slug, item\.profile\?\.status, companyEnabled\)/);
  assert.match(source,/navigator\.clipboard\.writeText/);
  assert.match(source,/companyEnabled=\{companyEnabled\}/);
});
