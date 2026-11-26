import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGuidedContentDraft, parseGuidedContentCapabilities, parseGuidedDraftCreation,
  guidedSnapshotToCas } from '../src/lib/doohGuidedScreenContentContract.ts';
import { draftCasPayload, draftStillCurrent } from '../src/lib/doohPlaylistDraftEditorContract.ts';
import { draftOrderChanged, reorderCasRequest, shiftDraftItem } from '../src/lib/doohPlaylistReorderContract.ts';
const S = '11111111-1111-4111-8111-111111111111';
const P = '22222222-2222-4222-8222-222222222222';
const D = '33333333-3333-4333-8333-333333333333';
const I = '44444444-4444-4444-8444-444444444444';
const M = '55555555-5555-4555-8555-555555555555';
const I2 = '66666666-6666-4666-8666-666666666666';
const M2 = '77777777-7777-4777-8777-777777777777';
const snapshot = () => ({ screenId: S, playlistId: P, draftId: D, items: [
  {id:I,mediaVersionId:M,position:0,durationMs:10000,mediaName:'Imagem promocional',mediaStatus:'READY'},
  {id:I2,mediaVersionId:M2,position:1,durationMs:12000,mediaName:'Vídeo institucional',mediaStatus:'READY'},
]});
test('UX10: capacidades são explicitamente fornecidas pelo backend, fail-closed', () => {
  assert.equal(parseGuidedContentCapabilities({draftEnabled:true}),true);
  assert.equal(parseGuidedContentCapabilities({draftEnabled:false}),false);
  assert.equal(parseGuidedContentCapabilities({}),null);
  assert.equal(parseGuidedContentCapabilities({draftEnabled:'true'}),null);
});
test('UX10: tela vazia é estado legítimo, sem playlist inventada', () => {
  assert.deepEqual(parseGuidedContentDraft({screenId:S,playlistId:null,draftId:null,items:[]},S),
    {screenId:S,playlistId:null,draftId:null,items:[]});
  assert.equal(parseGuidedContentDraft({screenId:S,playlistId:null,draftId:null,items:[{id:I}]},S),null);
});
test('UX10: identidade e estrutura de itens são obrigatórias, sem dados de outro aparelho', () => {
  assert.equal(parseGuidedContentDraft(snapshot(),S)?.items.length,2);
  assert.equal(parseGuidedContentDraft(snapshot(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),null);
  assert.equal(parseGuidedContentDraft({...snapshot(),items:[snapshot().items[1],snapshot().items[0]]},S),null);
  assert.equal(parseGuidedContentDraft({...snapshot(),items:[snapshot().items[0],snapshot().items[0]]},S),null);
  assert.equal(parseGuidedContentDraft({...snapshot(),items:[{...snapshot().items[0],mediaStatus:'PLAYING'}]},S),null);
});
test('UX10: criação é checada sem persistir credenciais no navegador', () => {
  assert.deepEqual(parseGuidedDraftCreation({screenId:S,playlistId:P,draftId:D,created:true},S),{playlistId:P,draftId:D});
  assert.equal(parseGuidedDraftCreation({screenId:P,playlistId:P,draftId:D,created:true},S),null);
});
test('UX10: snapshot e CAS são usados para adicionar/remover sem sobrescrita cega', () => {
  const draft = guidedSnapshotToCas(parseGuidedContentDraft(snapshot(),S));
  assert.deepEqual(draftCasPayload(draft),{expectedDraftId:D,expectedItemIds:[I,I2]});
  assert.equal(draftStillCurrent(draft,{...draft,items:[...draft.items].reverse()}),false);
});
test('UX10: reorder preserva a identidade da versão do rascunho', () => {
  const draft = guidedSnapshotToCas(parseGuidedContentDraft(snapshot(),S));
  const desired = shiftDraftItem(draft,[I,I2],I,1);
  assert.deepEqual(desired,[I2,I]);
  assert.equal(draftOrderChanged(draft,desired),true);
  assert.deepEqual(reorderCasRequest(draft,desired),{expectedDraftId:D,expectedItemIds:[I,I2],itemIds:[I2,I]});
});
test('UX10: interface não publica lista, agenda nem manifesto antes da orquestração F3B', () => {
  const text = readFileSync(new URL('../src/components/DoohScreenContentWizard.tsx', import.meta.url),'utf8');
  assert.match(text,/Gerenciar conteúdo|Conteúdo de/);
  assert.doesNotMatch(text,/publish-cas|\/dooh\/manifests\/players/);
  assert.match(text,/add-cas/);
  assert.match(text,/remove-cas/);
  assert.match(text,/order-cas/);
});
