import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeDoohScreens, doohOverviewHeadline } from '../src/lib/doohScreenDiagnosticContract.ts';
import { parseDoohMediaPreviews } from '../src/lib/doohMediaLibraryContract.ts';
const read=f=>readFileSync(new URL(`../src/${f}`,import.meta.url),'utf8');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const player=(over={})=>({id:id(90),name:'P',lifecycleStatus:'ACTIVE',lastSeenAt:'2026-11-27T12:00:00.000Z',currentManifestVersion:'2',desiredManifestVersion:'2',credentialActive:true,...over});
const screen=(status,p=player())=>({id:id(Math.random()*1e6|0),name:'T',orientation:'LANDSCAPE',fitMode:'CONTAIN',locationLabel:null,playerId:p?.id??null,contentPlaylistId:null,commercialUnit:null,status,player:p});

test('Visão geral conta telas em exibição, com atenção, conectando e sem aparelho', () => {
  const o=summarizeDoohScreens([screen('PLAYING'),screen('PLAYING'),screen('NO_RECENT_CONTACT'),screen('WAITING_FOR_PLAYER',null),
    screen('WAITING_FOR_PROGRAMMING',player({credentialActive:false,lastSeenAt:null,currentManifestVersion:'0',desiredManifestVersion:'0'}))]);
  assert.deepEqual(o,{total:5,playing:2,attention:1,connecting:1,withoutDevice:1});
  assert.equal(doohOverviewHeadline(o),'1 tela precisa de atenção.');
  assert.equal(doohOverviewHeadline(summarizeDoohScreens([screen('PLAYING')])),'Sua tela está exibindo.');
  assert.equal(doohOverviewHeadline(summarizeDoohScreens([])),'Crie sua primeira tela e conecte um aparelho para começar.');
});

test('miniaturas: só https, só tipos de imagem/vídeo e só das mídias pedidas', () => {
  const a=id(1),b=id(2),c=id(3);
  const out=parseDoohMediaPreviews({previews:[
    {mediaId:a,url:'https://media.test/a?X-Amz-Signature=1',contentType:'image/png'},
    {mediaId:b,url:'http://media.test/b',contentType:'image/png'},
    {mediaId:c,url:'https://media.test/c',contentType:'application/pdf'},
    {mediaId:id(4),url:'https://media.test/d',contentType:'video/mp4'},
  ]},[a,b,c]);
  assert.deepEqual(Object.keys(out),[a]);assert.equal(out[a].contentType,'image/png');
  assert.equal(parseDoohMediaPreviews({nope:1},[a]),null);
});

test('Mídias mostra miniatura e não quebra sem o endpoint', () => {
  const lib=read('components/DoohMediaLibraryReadOnly.tsx');
  assert.match(lib,/'\/dooh\/media\/previews'/);assert.match(lib,/<MediaThumbnail /);
  assert.match(lib,/\.catch\(\(\) => \{ if \(!controller\.signal\.aborted\) setPreviews\(\{\}\); \}\)/);
});

test('Telas e Programação: suporte técnico só para TI; listas e agendas no modo avançado', () => {
  const page=read('components/DoohFoundationPage.tsx');
  assert.match(page,/const screenTabs = isTechnical \? \[\.\.\.screenTasks, technicalTask\] : screenTasks;/);
  assert.match(page,/screenTask === 'technical' && isTechnical/);
  assert.doesNotMatch(page,/Listas avançadas|Agendas avançadas/);
  assert.match(page,/programmingTask === 'advanced'/);
  assert.match(page,/urlView\(\) === 'agendas' \|\| urlView\(\) === 'listas' \? 'advanced'/);
});
