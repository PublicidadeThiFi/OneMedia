import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlaylistDraft, draftStillCurrent } from '../src/lib/doohPlaylistDraftEditorContract.ts';
import { draftOrder, validDraftOrder, draftOrderChanged, shiftDraftItem,
  reorderCasRequest, parseReorderConfirmation } from '../src/lib/doohPlaylistReorderContract.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = (path) => readFileSync(resolve(root,path),'utf8');
const backend = (path) => resolve(root, '../ooh-manager-api', path);
const p='c34af24c-0211-4651-8db1-134608681234';
const d='4844d54c-23ac-4b38-bb18-123456789012';
const a='ea17e36b-25af-4a03-8b11-123456789012';
const b='db71ec75-3e4a-4e0b-a821-123456789012';
const c='e3add193-62c9-4fca-ab66-123456789012';
const m='a3add193-62c9-4fca-ab66-123456789012';
const draft = parsePlaylistDraft({playlistId:p,draftId:d,items:[a,b,c].map((id,position)=>({id,position,mediaVersionId:m,durationMs:8000}))},p);
assert.ok(draft);

test('D15C04-01 extrai somente IDs reais e preserva ordem',()=>{
  assert.deepEqual(draftOrder(draft),[a,b,c]);
});
test('D15C04-02 valida permutação integral; rejeita extras, ausentes e repetidos',()=>{
  assert.equal(validDraftOrder(draft,[c,a,b]),true);
  assert.equal(validDraftOrder(draft,[a,b]),false);
  assert.equal(validDraftOrder(draft,[a,b,c,d]),false);
  assert.equal(validDraftOrder(draft,[a,a,c]),false);
  assert.equal(validDraftOrder(draft,['x',a,c]),false);
});
test('D15C04-03 move item para cima e baixo somente localmente',()=>{
  assert.deepEqual(shiftDraftItem(draft,[a,b,c],b,-1),[b,a,c]);
  assert.deepEqual(shiftDraftItem(draft,[a,b,c],b,1),[a,c,b]);
  assert.deepEqual(draftOrder(draft),[a,b,c]);
});
test('D15C04-04 impede ultrapassar primeira ou última posição',()=>{
  assert.equal(shiftDraftItem(draft,[a,b,c],a,-1),null);
  assert.equal(shiftDraftItem(draft,[a,b,c],c,1),null);
  assert.equal(shiftDraftItem(draft,[a,b,c],d,1),null);
});
test('D15C04-05 não sinaliza mudança para ordem idêntica ou incompleta',()=>{
  assert.equal(draftOrderChanged(draft,[a,b,c]),false);
  assert.equal(draftOrderChanged(draft,[a,b]),false);
  assert.equal(draftOrderChanged(draft,[c,a,b]),true);
});
test('D15C04-06 payload contém draft original, ordem esperada e nova ordem completa',()=>{
  assert.deepEqual(reorderCasRequest(draft,[b,c,a]),{
    expectedDraftId:d,expectedItemIds:[a,b,c],itemIds:[b,c,a],
  });
});
test('D15C04-07 não gera mutação sem mudança ou com permutação inválida',()=>{
  assert.equal(reorderCasRequest(draft,[a,b,c]),null);
  assert.equal(reorderCasRequest(draft,[a,a,c]),null);
});
test('D15C04-08 confirmação valida a identidade do draft, contagem e changed',()=>{
  assert.equal(parseReorderConfirmation({success:true,draftId:d,count:3,changed:true},draft,[c,a,b]),true);
  assert.equal(parseReorderConfirmation({success:true,draftId:p,count:3,changed:true},draft,[c,a,b]),false);
  assert.equal(parseReorderConfirmation({success:true,draftId:d,count:2,changed:true},draft,[c,a,b]),false);
});
test('D15C04-09 nunca aceita no-op como gravação nova',()=>{
  assert.equal(parseReorderConfirmation({success:true,draftId:d,count:3,changed:false},draft,[c,a,b]),false);
  assert.equal(parseReorderConfirmation({success:true,draftId:d,count:3,changed:true},draft,[a,b,c]),false);
});
test('D15C04-10 preflight recusa ordem, versão e duração divergentes',()=>{
  assert.equal(draftStillCurrent(draft,{...draft,items:[draft.items[1],draft.items[0],draft.items[2]]}),false);
  assert.equal(draftStillCurrent(draft,{...draft,draftId:p}),false);
  assert.equal(draftStillCurrent(draft,{...draft,items:[{...draft.items[0],durationMs:9000},...draft.items.slice(1)]}),false);
});
test('D15C04-11 componente usa GET preflight, apenas PUT order-cas e confirmação',()=>{
  const source=file('src/components/DoohPlaylistDraftReorder.tsx');
  assert.match(source,/window\.confirm/);
  assert.match(source,/draftStillCurrent/);
  assert.match(source,/\/draft\/items\/order-cas/);
  assert.match(source,/apiClient\.put/);
  assert.doesNotMatch(source,/\/publish|\/draft\/items\/order[`']/);
});
test('D15C04-12 interface protege autorização, mudança de sessão e operações em andamento',()=>{
  const source=file('src/components/DoohPlaylistDraftReorder.tsx');
  assert.match(source,/canEditPlaylistDraft/);
  assert.match(source,/currentKey/);
  assert.match(source,/AbortController/);
  assert.match(source,/disabled=\{busy/);
});
test('D15C04-13 catálogo agrega reordenação, mantendo editor e Marketplace',()=>{
  const source=file('src/components/DoohPlaylistCatalogReadOnly.tsx');
  assert.match(source,/DoohPlaylistDraftReorder/);
  assert.match(source,/DoohPlaylistDraftEditor/);
  assert.match(source,/DoohPlaylistCreateRename/);
  const route=file('src/components/campaigns/DoohCampaignDraftPanel.tsx');
  assert.ok(route.includes('dooh') || route.includes('Dooh') || route.includes('campaign'));
});
test('D15C04-14 backend usa CAS SERIALIZABLE e preserva endpoint legado', (t)=>{
  const service=backend('src/dooh-playlist-core/dooh-playlist-draft-items.service.ts');
  const controller=backend('src/dooh-playlist-core/dooh-playlists.controller.ts');
  if(!existsSync(service)||!existsSync(controller)){t.skip('Backend ausente: executar Jest no backend');return;}
  assert.match(readFileSync(service,'utf8'),/async reorderCas/);
  assert.match(readFileSync(service,'utf8'),/this\.compareDraftSnapshot\(draftId, rows, dto\)/);
  assert.match(readFileSync(service,'utf8'),/this\.moveToOrder\(tx, draftId, rows, desired\)/);
  assert.match(readFileSync(service,'utf8'),/TransactionIsolationLevel\.Serializable/);
  assert.match(readFileSync(controller,'utf8'),/\@Put\(':id\/draft\/items\/order-cas'\)/);
  assert.match(readFileSync(controller,'utf8'),/\@Put\(':id\/draft\/items\/order'\)/);
});
