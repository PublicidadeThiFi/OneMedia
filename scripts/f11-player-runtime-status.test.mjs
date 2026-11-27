import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOperationalScreen, parseOperationalScreenPage, operationalScreenStatusText, playerErrorText } from '../src/lib/doohOperationalScreenContract.ts';
import { screenOperationalSummary } from '../src/lib/doohScreenDiagnosticContract.ts';
const id='11111111-1111-4111-8111-111111111111', playerId='22222222-2222-4222-8222-222222222222';
const base=(status,player={})=>({id,name:'TV',orientation:'LANDSCAPE',fitMode:'CONTAIN',locationLabel:null,playerId,commercialUnit:null,status,
  player:{id:playerId,name:'TV',lifecycleStatus:'ACTIVE',lastSeenAt:new Date().toISOString(),currentManifestVersion:'1',desiredManifestVersion:'1',credentialActive:true,...player}});
test('F11 aceita PLAYING e INSTALL_FAILED com relato limitado do aparelho',()=>{
 const playing=parseOperationalScreen(base('PLAYING',{appVersion:'WEB-F11-20261127',runtime:{playbackState:'PLAYING',lastErrorCode:null,reportedAt:'2026-11-27T10:00:00.000Z'}}));
 assert.equal(playing.status,'PLAYING');assert.equal(playing.player.appVersion,'WEB-F11-20261127');assert.equal(operationalScreenStatusText.PLAYING,'Em exibição');
 assert.equal(screenOperationalSummary(playing).programming,'Em exibição');assert.equal(screenOperationalSummary(playing).attention,false);
 const failed=parseOperationalScreen(base('INSTALL_FAILED',{currentManifestVersion:'0',runtime:{playbackState:'NOT_PLAYING',lastErrorCode:'PLAYER_STORAGE_UNAVAILABLE.ASSET-BYTES-WRITE'}}));
 assert.equal(screenOperationalSummary(failed).attention,true);assert.match(playerErrorText(failed.player.runtime.lastErrorCode),/janela normal/);
});
test('F11 códigos inválidos do aparelho são descartados, nunca exibidos crus',()=>{
 const s=parseOperationalScreen(base('VERSION_REPORTED',{appVersion:'<b>x</b>',runtime:{playbackState:'<script>',lastErrorCode:'x'.repeat(90)}}));
 assert.equal(s.player.appVersion,null);assert.deepEqual(s.player.runtime,{playbackState:null,lastErrorCode:null,reportedAt:null});
});
test('F11 resposta antiga do backend (sem relato) continua aceita',()=>{
 const page=parseOperationalScreenPage({items:[base('VERSION_REPORTED')],meta:{page:1,pageSize:20,total:1}});
 assert.ok(page);assert.equal(page.items[0].player.runtime,undefined);
});
test('F11 instalação em andamento não é sinalizada como problema; falta de espaço tem texto próprio',()=>{
 const pending=parseOperationalScreen(base('UPDATE_PENDING',{currentManifestVersion:'1',desiredManifestVersion:'2'}));
 assert.equal(screenOperationalSummary(pending).attention,false);assert.match(playerErrorText('PLAYER_STORAGE_QUOTA'),/espaço/);assert.equal(playerErrorText(null),null);
});
