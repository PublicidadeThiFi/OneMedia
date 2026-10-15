import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canReadDoohPlaylists } from '../src/lib/doohPlaylistCatalogContract.ts';
import { canInspectPublishedVersion, parseInspectedPublishedVersion,
  publishedInspectionError } from '../src/lib/doohPublishedVersionInspectionContract.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (p) => readFileSync(resolve(root, p), 'utf8');
const playlistId = '33333333-3333-4333-8333-333333333333';
const versionId = '44444444-4444-4444-8444-444444444444';
const mediaId = '55555555-5555-4555-8555-555555555555';
const secondMedia = '66666666-6666-4666-8666-666666666666';
const itemId = '77777777-7777-4777-8777-777777777777';
const secondItem = '88888888-8888-4888-8888-888888888888';
const date = '2026-10-15T08:00:00.000Z';
const ref = {id:versionId, version:1, status:'PUBLISHED', checksumPrefix:'a'.repeat(12), publishedAt:date,
  itemCount:2, createdAt:date};
const body = {playlistId, published: { id:versionId, version:1, checksum:'a'.repeat(64), publishedAt:date },
  items: [
    {id:itemId,mediaVersionId:mediaId,position:0,durationMs:5000,metadata:{jwt:'SECRET'},transition:{key:'NEVER'}},
    {id:secondItem,mediaVersionId:secondMedia,position:1,durationMs:7000,metadata:{private:'DO_NOT_EXPOSE'}},
  ]};
const parse = (raw=body, expected=playlistId, reference=ref) => parseInspectedPublishedVersion(raw,expected,reference);

test('D15C06-01: leitura DOOH FULL/READ_ONLY exige tenant, grant e papel técnico',()=>{
 const company='11111111-1111-4111-8111-111111111111';
 assert.equal(canReadDoohPlaylists(company,company,true,'READ_ONLY',['TI']),true);
 assert.equal(canReadDoohPlaylists(company,company,true,'FULL',['ADMINISTRATIVO']),true);
 assert.equal(canReadDoohPlaylists(company,'22222222-2222-4222-8222-222222222222',true,'FULL',['TI']),false);
 assert.equal(canReadDoohPlaylists(company,company,false,'FULL',['TI']),false);
});
test('D15C06-02: projeta somente IDs, ordem, duração e prefixo, sem metadata ou URLs',()=>{
 const result=parse();
 assert.ok(result); assert.equal(result.items.length,2); assert.equal(result.totalDurationMs,12000);
 assert.equal(result.checksumPrefix,'a'.repeat(12));
 assert.deepEqual(result.items[0],{id:itemId,mediaVersionId:mediaId,position:0,durationMs:5000});
 assert.doesNotMatch(JSON.stringify(result),/SECRET|NEVER|DO_NOT_EXPOSE|metadata|transition|jwt|checksum":"/);
});
test('D15C06-03: referencia apenas PUBLISHED com checksum, data e contagem válida',()=>{
 assert.equal(canInspectPublishedVersion(ref),true);
 for(const change of [{status:'DRAFT'},{status:'ARCHIVED'},{checksumPrefix:null},{publishedAt:null},
   {itemCount:0},{itemCount:201},{version:0},{id:'invalid'}])
   assert.equal(canInspectPublishedVersion({...ref,...change}),false);
});
test('D15C06-04: recusa playlist diferente, ID de versão e número divergente',()=>{
 assert.equal(parse(body,'22222222-2222-4222-8222-222222222222'),null);
 assert.equal(parse({...body,playlistId:versionId}),null);
 assert.equal(parse({...body,published:{...body.published,id:mediaId}}),null);
 assert.equal(parse({...body,published:{...body.published,version:2}}),null);
});
test('D15C06-05: rejeita checksum divergente, inválido e alteração do prefixo do histórico',()=>{
 assert.equal(parse({...body,published:{...body.published,checksum:'b'.repeat(64)}}),null);
 assert.equal(parse({...body,published:{...body.published,checksum:'z'.repeat(64)}}),null);
 assert.equal(parse(body,playlistId,{...ref,checksumPrefix:'b'.repeat(12)}),null);
});
test('D15C06-06: exige timestamp publicado consistente com o histórico',()=>{
 assert.equal(parse({...body,published:{...body.published,publishedAt:'tomorrow'}}),null);
 assert.equal(parse({...body,published:{...body.published,publishedAt:'2026-10-15T09:00:00.000Z'}}),null);
});
test('D15C06-07: bloqueia IDs duplicados, gaps, mídia inválida e item extra',()=>{
 const [a,b]=body.items;
 for(const items of [[a,a],[a,{...b,id:a.id}],[a,{...b,position:3}],[a,{...b,mediaVersionId:'broken'}],[a,b,{...b,id:mediaId,position:2}]])
   assert.equal(parse({...body,items}),null);
});
test('D15C06-08: rejeita duração fora do intervalo e contagem diferente do histórico',()=>{
 for(const duration of [0,-1,1.5,null,86_400_001])
   assert.equal(parse({...body,items:[{...body.items[0],durationMs:duration},body.items[1]]}),null);
 assert.equal(parse({...body,items:body.items.slice(0,1)}),null);
});
test('D15C06-09: aceita múltiplos itens usando a mesma mídia sem confundir com ID duplicado',()=>{
 const result=parse({...body,items:[body.items[0],{...body.items[1],mediaVersionId:mediaId}]});
 assert.ok(result); assert.equal(result.items[0].mediaVersionId,result.items[1].mediaVersionId);
});
test('D15C06-10: mensagens de erro não reproduzem payloads privados',()=>{
 assert.match(publishedInspectionError({response:{status:404,data:{secret:'LEAK'}}}),/indisponível/);
 assert.doesNotMatch(publishedInspectionError({message:'LEAK'}),/LEAK/);
});
test('D15C06-11: componente contém apenas GET autenticado, abortável, sem mutações nem publicação',()=>{
 const ui=source('src/components/DoohPublishedVersionInspector.tsx');
 assert.match(ui,/apiClient\.get<unknown>/);
 assert.match(ui,/AbortController/);
 assert.match(ui,/parseInspectedPublishedVersion/);
 assert.match(ui,/versions\/\$\{selected\.version\}\/items/);
 assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)|\/publish-cas|\/manifest|\/schedule|setInterval/);
 assert.match(ui,/não comprova integridade criptográfica|NÃO comprova integridade criptográfica/);
});
test('D15C06-12: catálogo mantém editores, publicação QA e inclui inspeção sem mutação',()=>{
 const ui=source('src/components/DoohPlaylistCatalogReadOnly.tsx');
 for(const name of ['DoohPlaylistDraftEditor','DoohPlaylistDraftReorder','DoohPlaylistPublishQa','DoohPublishedVersionInspector'])
   assert.match(ui,new RegExp(name));
 assert.doesNotMatch(ui,/apiClient\.(post|put|delete|patch)/);
});
test('D15C06-13: rota backend preexistente atende tenant e só retorna PUBLISHED, sem migration',(t)=>{
 const controller=resolve(root,'../ooh-manager-api/src/dooh-playlist-core/dooh-playlists.controller.ts');
 const service=resolve(root,'../ooh-manager-api/src/dooh-playlist-core/dooh-playlist-publication.service.ts');
 if(!existsSync(controller)||!existsSync(service)){t.skip('Backend ausente no checkout frontend isolado; contrato conferido no projeto backend.');return;}
 const c=readFileSync(controller,'utf8');const s=readFileSync(service,'utf8');
 assert.match(c,/@Get\(':id\/versions\/:version\/items'\)/);
 assert.match(c,/getPublishedItems\(req\.user\.companyId, id, version\)/);
 assert.match(s,/where: \{ id: playlistId, companyId \}/);
 assert.match(s,/status: DoohPlaylistVersionStatus\.PUBLISHED/);
 assert.match(s,/take: MAX_ITEMS \+ 1/);
});
