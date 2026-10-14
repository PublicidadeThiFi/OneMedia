import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  canWriteDoohPlaylists, normalizeDoohPlaylistName, validPlaylistSnapshot,
  playlistSnapshotCurrent, parseDoohPlaylistCreated, parseDoohPlaylistRenamed,
  doohPlaylistWriteError,
} from '../src/lib/doohPlaylistWriteContract.ts';
const source = p => readFileSync(join(process.cwd(),p),'utf8');
const company = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const versionId = '44444444-4444-4444-8444-444444444444';
const now = '2026-10-14T20:00:00.000Z';
const summary = { id, companyId:company, name:'Original', status:'ACTIVE', currentVersion:0,
  createdAt:now, updatedAt:now, versionCount:1, draftVersion:1 };
const version = { id:versionId, version:1, status:'DRAFT', checksum:null,
  publishedAt:null, createdAt:now, _count:{items:0} };
const detail = {id,companyId:company,name:'Original',status:'ACTIVE',currentVersion:0,
  createdAt:now, updatedAt:now, versions:[version]};

test('D15C02-01: somente FULL, empresa exata, grant e função técnica',()=>{
  assert.equal(canWriteDoohPlaylists(company,company,true,'FULL',['TI']),true);
  assert.equal(canWriteDoohPlaylists(company,company,true,'FULL',['ADMINISTRATIVO']),true);
  for(const [c,g,m,r] of [[other,true,'FULL',['TI']],[company,false,'FULL',['TI']],
    [company,true,'READ_ONLY',['TI']],[company,true,'FULL',['COMERCIAL']],
    [company,true,'NONE',['ADMINISTRATIVO']]]) assert.equal(canWriteDoohPlaylists(company,c,g,m,r),false);
});
test('D15C02-02: normaliza nomes até 160 caracteres e rejeita controles',()=>{
  assert.equal(normalizeDoohPlaylistName('  Campanha  '),'Campanha');
  for(const input of ['', '   ', 'x'.repeat(161), 'O\nlá', 'Olá\u0000', undefined, {}])
    assert.equal(normalizeDoohPlaylistName(input),null);
});
test('D15C02-03: snapshot ativo tem nome, id e timestamp verificáveis',()=>{
  assert.equal(validPlaylistSnapshot(summary),true);
  assert.equal(validPlaylistSnapshot({...summary,status:'ARCHIVED'}),false);
  assert.equal(validPlaylistSnapshot({...summary,updatedAt:'hoje'}),false);
  assert.equal(validPlaylistSnapshot({...summary,id:'x'}),false);
});
test('D15C02-04: preflight detecta troca de nome, versão, estado e updatedAt',()=>{
  const base = {id,name:'Original',status:'ACTIVE',currentVersion:0,createdAt:now,updatedAt:now};
  assert.equal(playlistSnapshotCurrent(summary,base),true);
  for(const patch of [{name:'Terceiro'},{currentVersion:1},{status:'ARCHIVED'},
    {updatedAt:'2026-10-14T20:00:01.000Z'},{id:other}])
    assert.equal(playlistSnapshotCurrent(summary,{...base,...patch}),false);
});
test('D15C02-05: criação aceita apenas novo ID, tenant e DRAFT v1 vazio',()=>{
  assert.ok(parseDoohPlaylistCreated(detail,company,'Original',[]));
  assert.equal(parseDoohPlaylistCreated(detail,company,'Original',[id]),null);
  assert.equal(parseDoohPlaylistCreated(detail,other,'Original',[]),null);
  assert.equal(parseDoohPlaylistCreated(detail,company,'Errado',[]),null);
  assert.equal(parseDoohPlaylistCreated({...detail,currentVersion:1},company,'Original',[]),null);
});
test('D15C02-06: criação recusa versão publicada, extras ou itens não vazios',()=>{
  assert.equal(parseDoohPlaylistCreated({...detail,versions:[{...version,status:'PUBLISHED'}]},company,'Original',[]),null);
  assert.equal(parseDoohPlaylistCreated({...detail,versions:[{...version,_count:{items:1}}]},company,'Original',[]),null);
  assert.equal(parseDoohPlaylistCreated({...detail,versions:[]},company,'Original',[]),null);
});
test('D15C02-07: renomeação exige tenant, ID, nome e status corretos',()=>{
  const changed={...detail,name:'Novo', updatedAt:'2026-10-14T20:00:01.000Z'};
  assert.ok(parseDoohPlaylistRenamed(changed,company,summary,'Novo'));
  assert.equal(parseDoohPlaylistRenamed(changed,other,summary,'Novo'),null);
  assert.equal(parseDoohPlaylistRenamed(changed,company,summary,'Outro'),null);
  assert.equal(parseDoohPlaylistRenamed({...changed,status:'ARCHIVED'},company,summary,'Novo'),null);
  assert.equal(parseDoohPlaylistRenamed({...changed,id:other},company,summary,'Novo'),null);
});
test('D15C02-08: renomeação não admite versão atual diferente',()=>{
  assert.equal(parseDoohPlaylistRenamed({...detail,name:'Novo',currentVersion:1},company,summary,'Novo'),null);
});
test('D15C02-09: erros HTTP não exibem segredos nem payload',()=>{
  assert.match(doohPlaylistWriteError({response:{status:409,data:{token:'SECRET'}}}),/mudou|conflito/);
  for(const e of [{message:'SECRET'}, {response:{status:500, data:{token:'SECRET'}}}])
    assert.doesNotMatch(doohPlaylistWriteError(e),/SECRET|token/);
});
test('D15C02-10: UI cria somente POST e renomeia apenas via CAS',()=>{
  const ui=source('src/components/DoohPlaylistCreateRename.tsx');
  assert.match(ui,/apiClient\.post<unknown>\('\/dooh\/playlists'/);
  assert.match(ui,/\/rename-cas`/);
  assert.doesNotMatch(ui,/apiClient\.(put|delete)|\/publish|\/draft\/items|\/worker/);
  assert.match(ui,/window\.confirm/); assert.match(ui,/AbortController/);
});
test('D15C02-11: edição faz GET preflight e transmite nome e timestamp originais',()=>{
  const ui=source('src/components/DoohPlaylistCreateRename.tsx');
  assert.match(ui,/playlistSnapshotCurrent\(before, fresh\)/);
  assert.match(ui,/expectedName: before\.name, expectedUpdatedAt: before\.updatedAt, name/);
});
test('D15C02-12: catálogo GET permanece e Marketplace preservado',()=>{
  const ui=source('src/components/DoohPlaylistCatalogReadOnly.tsx');
  const page=source('src/components/DoohFoundationPage.tsx');
  assert.match(ui,/<DoohPlaylistCreateRename/);
  assert.doesNotMatch(ui,/apiClient\.(post|patch|put|delete)/);
  assert.match(page,/<DoohMarketplaceCampaignSelection\s*\/>/);
});
test('D15C02-13: backend registra CAS atômico, sem excluir/arquivar',()=>{
  const root=resolve(process.cwd(),'..','ooh-manager-api');
  const fallback=resolve(process.cwd(),'..','ooh-manager-api_atual');
  const path=existsSync(join(root,'src/dooh-playlist-core/dooh-playlists.service.ts')) ? root : fallback;
  if(!existsSync(join(path,'src/dooh-playlist-core/dooh-playlists.service.ts'))) return test.skip('backend não disponível no checkout do frontend');
  const service=readFileSync(join(path,'src/dooh-playlist-core/dooh-playlists.service.ts'),'utf8');
  const ctrl=readFileSync(join(path,'src/dooh-playlist-core/dooh-playlists.controller.ts'),'utf8');
  assert.match(service,/async renameCas\(/);
  assert.match(service,/updatedAt: new Date\(timestamp\)/);
  assert.match(service,/name: expectedName/);
  assert.match(service,/data: \{ name \}/);
  assert.match(ctrl, /@Patch\(':id\/rename-cas'\)/);
});
test('D15C02-14: leitura de versões permanece separada de mutações',()=>{
  const ui=source('src/components/DoohPlaylistCatalogReadOnly.tsx');
  assert.match(ui,/não comprova distribuição aos players, reprodução ou audiência/);
  assert.match(ui,/parseDoohPlaylistDetail/);
});
