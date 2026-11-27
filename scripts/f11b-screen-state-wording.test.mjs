import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOperationalScreen } from '../src/lib/doohOperationalScreenContract.ts';
import { screenOperationalSummary, screenAwaitingDeviceConnection } from '../src/lib/doohScreenDiagnosticContract.ts';
import { suggestDoohMediaName } from '../src/lib/doohMediaUploadContract.ts';
const id='11111111-1111-4111-8111-111111111111', playerId='22222222-2222-4222-8222-222222222222';
const screen=(status,player={})=>parseOperationalScreen({id,name:'TV',orientation:'LANDSCAPE',fitMode:'CONTAIN',locationLabel:null,playerId,commercialUnit:null,status,
  player:{id:playerId,name:'TV',lifecycleStatus:'ACTIVE',lastSeenAt:new Date().toISOString(),currentManifestVersion:'1',desiredManifestVersion:'1',credentialActive:true,...player}});

test('logo após digitar o código, o aparelho ainda conectando não aparece como autorização indisponível', () => {
  const s=screen('NO_RECENT_CONTACT',{credentialActive:false,lastSeenAt:null,currentManifestVersion:'0',desiredManifestVersion:'0'});
  assert.equal(screenAwaitingDeviceConnection(s),true);
  const sum=screenOperationalSummary(s);
  assert.equal(sum.connection,'Concluindo a conexão do aparelho');assert.equal(sum.programming,'Aguardando o aparelho');assert.equal(sum.attention,false);
  // a device that already talked to the server and lost its credential is still a real problem
  const revoked=screen('NO_RECENT_CONTACT',{credentialActive:false});
  assert.equal(screenAwaitingDeviceConnection(revoked),false);assert.equal(screenOperationalSummary(revoked).connection,'O aparelho precisa ser conectado de novo');assert.equal(screenOperationalSummary(revoked).attention,true);
});

test('sem contato, a tela não diz "Instalando": a nova versão espera o aparelho voltar', () => {
  const old=screen('NO_RECENT_CONTACT',{lastSeenAt:'2026-11-27T10:12:16.000Z',currentManifestVersion:'1',desiredManifestVersion:'2'});
  assert.equal(screenOperationalSummary(old).programming,'Nova programação aguardando a TV voltar');assert.equal(screenOperationalSummary(old).attention,true);
  const live=screen('UPDATE_PENDING',{currentManifestVersion:'1',desiredManifestVersion:'2'});
  assert.equal(screenOperationalSummary(live).programming,'Instalando a nova programação');assert.equal(screenOperationalSummary(live).attention,false);
  assert.equal(screenOperationalSummary(screen('NO_RECENT_CONTACT',{lastSeenAt:'2026-11-27T10:12:16.000Z'})).programming,'Sem conexão agora; última programação instalada');
});

test('foto do iPhone com nome de código ganha um nome legível; nomes reais são mantidos', () => {
  const now=new Date(2026,10,27,8,43);
  assert.equal(suggestDoohMediaName('C47F7B10-87B3-424F-959F-2E41C0D76F34.jpeg','image/jpeg',now),'Imagem de 27/11/2026 08:43');
  assert.equal(suggestDoohMediaName('c47f7b10-87b3-424f-959f-2e41c0d76f34.mov','video/quicktime',now),'Vídeo de 27/11/2026 08:43');
  assert.equal(suggestDoohMediaName('Promo Natal.mp4','video/mp4',now),'Promo Natal');
  assert.equal(suggestDoohMediaName('IMG_1234.HEIC','image/heic',now),'IMG_1234');
});

test('a lista de telas continua se atualizando com o editor aberto', () => {
  const src=readFileSync(new URL('../src/components/DoohOperationalScreensPanel.tsx',import.meta.url),'utf8');
  assert.match(src,/if \(!available \|\| mode !== 'enabled'\) return;\n\s+const timer = window\.setInterval/);
  assert.match(src,/screenAwaitingDeviceConnection\(screen\) \? \{ action: 'wait'/);
});
