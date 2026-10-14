import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canReadDoohPlaylists, parseDoohPlaylistCatalog, parseDoohPlaylistDetail,
  doohPlaylistReadError } from '../src/lib/doohPlaylistCatalogContract.ts';

const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const playlistId = '33333333-3333-4333-8333-333333333333';
const versionOneId = '44444444-4444-4444-8444-444444444444';
const draftId = '55555555-5555-4555-8555-555555555555';
const now = '2026-10-14T20:00:00.000Z';
const summary = { id: playlistId, companyId: company, name: 'Playlist de Outubro', status: 'ACTIVE',
  currentVersion: 1, createdAt: now, updatedAt: now,
  versions: [{id:draftId, version:2, status:'DRAFT', createdAt:now}], _count: {versions:2} };
const versions = [
  {id:draftId, version:2, status:'DRAFT', checksum:null, publishedAt:null, createdAt:now, _count:{items:0}},
  {id:versionOneId, version:1, status:'PUBLISHED', checksum:'a'.repeat(64), publishedAt:now, createdAt:now, _count:{items:2}},
];
const detail = { id:playlistId, companyId:company, name:'Playlist de Outubro', status:'ACTIVE',
  currentVersion:1, createdAt:now, updatedAt:now, versions };
const source = p => readFileSync(join(process.cwd(),p),'utf8');

test('D15C01-01: permissões FULL/READ_ONLY, tenant e papel técnico',()=>{
  assert.equal(canReadDoohPlaylists(company,company,true,'FULL',['ADMINISTRATIVO']),true);
  assert.equal(canReadDoohPlaylists(company,company,true,'READ_ONLY',['TI']),true);
  for(const [c,g,m,r] of [[other,true,'FULL',['TI']],[company,false,'FULL',['TI']],
    [company,true,'NONE',['TI']],[company,true,'FULL',['COMERCIAL']]])
    assert.equal(canReadDoohPlaylists(company,c,g,m,r),false);
});
test('D15C01-02: lista real, contagem e rascunho, sem metadados privados',()=>{
  const raw={...summary,metadata:{secret:'NEVER'},versions:[{...summary.versions[0],metadata:{secret:'NEVER'}}]};
  const result=parseDoohPlaylistCatalog([raw],company);
  assert.ok(result); assert.equal(result.length,1);
  assert.equal(result[0].versionCount,2); assert.equal(result[0].draftVersion,2);
  assert.doesNotMatch(JSON.stringify(result),/NEVER|metadata|publishedBy/);
});
test('D15C01-03: catálogo vazio é estado válido; nenhum total inventado',()=>{
  assert.deepEqual(parseDoohPlaylistCatalog([],company),[]);
  assert.equal(parseDoohPlaylistCatalog({},company),null);
  assert.equal(parseDoohPlaylistCatalog(Array(101).fill(summary),company),null);
});
test('D15C01-04: rejeita outra empresa, IDs duplicados, estados e nomes inválidos',()=>{
  assert.equal(parseDoohPlaylistCatalog([{...summary,companyId:other}],company),null);
  assert.equal(parseDoohPlaylistCatalog([summary,summary],company),null);
  for(const patch of [{status:'BROKEN'}, {name:'  '}, {currentVersion:-1}, {updatedAt:'later'},
    {versions:[{...summary.versions[0],status:'PUBLISHED'}]}, {_count:{versions:-1}}])
    assert.equal(parseDoohPlaylistCatalog([{...summary,...patch}],company),null);
});
test('D15C01-05: playlist com zero versões/sem rascunho é projetada sem inferência',()=>{
  const result=parseDoohPlaylistCatalog([{...summary,currentVersion:0,versions:[],_count:{versions:0}}],company);
  assert.ok(result); assert.equal(result[0].draftVersion,null);
});
test('D15C01-06: detalhe ordenado preserva DRAFT e PUBLISHED como estados distintos',()=>{
  const result=parseDoohPlaylistDetail(detail,company,playlistId);
  assert.ok(result); assert.equal(result.totalVersions,2);
  assert.deepEqual(result.versions.map(v=>v.status),['DRAFT','PUBLISHED']);
  assert.equal(result.versions[1].itemCount,2);
  assert.equal(result.versions[1].checksumPrefix,'a'.repeat(12));
  assert.doesNotMatch(JSON.stringify(result),/"checksum":|publishedBy|metadata/);
});
test('D15C01-07: detalhe vazio válido para playlist sem publicação',()=>{
  const result=parseDoohPlaylistDetail({...detail,currentVersion:0,versions:[]},company,playlistId);
  assert.ok(result); assert.equal(result.totalVersions,0);
});
test('D15C01-08: rejeita detalhe cross-tenant, ID diferente e payload opaco',()=>{
  assert.equal(parseDoohPlaylistDetail({...detail,companyId:other},company,playlistId),null);
  assert.equal(parseDoohPlaylistDetail(detail,company,other),null);
  assert.equal(parseDoohPlaylistDetail({},company,playlistId),null);
});
test('D15C01-09: rejeita versões repetidas, desordenadas ou DRAFT publicado',()=>{
  for(const v of [[versions[1],versions[0]], [versions[0],versions[0]],
    [{...versions[0],publishedAt:now},versions[1]], [{...versions[0],checksum:'a'.repeat(64)},versions[1]]])
    assert.equal(parseDoohPlaylistDetail({...detail,versions:v},company,playlistId),null);
});
test('D15C01-10: checksum, datas e contadores inválidos falham fechados',()=>{
  for(const patch of [{checksum:'x'}, {publishedAt:'not-a-date'}, {_count:{items:-1}},
    {status:'PROCESSING'}])
    assert.equal(parseDoohPlaylistDetail({...detail, versions:[versions[0], {...versions[1],...patch}]},company,playlistId),null);
});
test('D15C01-11: versão publicada não vira prova de playback',()=>{
  const ui=source('src/components/DoohPlaylistCatalogReadOnly.tsx');
  assert.match(ui,/não comprova distribuição aos players, reprodução ou audiência/);
  assert.doesNotMatch(ui, /impressões certificadas|reprodução comprovada/);
});
test('D15C01-12: todas as operações são GET; sem publicação, edição ou exclusão',()=>{
  const ui=source('src/components/DoohPlaylistCatalogReadOnly.tsx');
  assert.match(ui,/apiClient\.get<unknown>\('\/dooh\/playlists'/);
  assert.match(ui,/apiClient\.get<unknown>\(`\/dooh\/playlists\/\$\{encodeURIComponent\(selectedId\)\}`/);
  assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)|setInterval|\/publish|\/worker/);
  assert.match(ui,/AbortController/);
});
test('D15C01-13: navegação integra catálogo sem remover associação Marketplace',()=>{
  const page=source('src/components/DoohFoundationPage.tsx');
  assert.match(page, /<DoohPlaylistCatalogReadOnly \/>/);
  assert.match(page, /<DoohMarketplaceCampaignSelection \/>/);
  assert.match(page, /<DoohMediaLibraryReadOnly \/>/);
  assert.match(page, /<DoohPlayerInventoryReadOnly \/>/);
});
test('D15C01-14: mensagem de erro não reflete segredos de resposta',()=>{
  assert.match(doohPlaylistReadError({response:{status:404,data:{token:'SECRET'}}}),/não encontrada/);
  assert.doesNotMatch(doohPlaylistReadError({message:'SECRET'}),/SECRET/);
});
