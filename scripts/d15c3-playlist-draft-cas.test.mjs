import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  canEditPlaylistDraft, parsePlaylistDraft, draftStillCurrent, draftCasPayload,
  parsePlaylistMediaOptions, parseAddedDraftItem, parseRemovedDraftItem, playlistDraftError,
} from '../src/lib/doohPlaylistDraftEditorContract.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (path) => readFileSync(resolve(root, path), 'utf8');
const backendFile = (path) => resolve(root, '../ooh-manager-api', path);
const p = 'c34af24c-0211-4651-8db1-134608681234';
const c = '77777a5c-a54e-4185-a927-536a729ad921';
const d = '4844d54c-23ac-4b38-bb18-123456789012';
const a = 'ea17e36b-25af-4a03-8b11-123456789012';
const b = 'db71ec75-3e4a-4e0b-a821-123456789012';
const m = 'e3add193-62c9-4fca-ab66-123456789012';
const v = '9698995a-e644-460d-99e0-7126c96ccb56';
const snapshot = { playlistId: p, draftId: d, items: [{ id: a, mediaVersionId: v, position: 0, durationMs: 9000 }] };

test('D15C03-01 FULL + tenant exato + role técnica é obrigatório', () => {
  assert.equal(canEditPlaylistDraft(c,c,true,'FULL',['TI']), true);
  for (const [tenant, mode, roles] of [[p,'FULL',['TI']], [c,'READ_ONLY',['TI']], [c,'FULL',['VENDEDOR']]]) {
    assert.equal(canEditPlaylistDraft(tenant,c,true,mode,roles), false);
  }
});
test('D15C03-02 leitura estrita do draft sem dados brutos', () => {
  const parsed = parsePlaylistDraft({ ...snapshot, items: [{ ...snapshot.items[0], secret:'never', transition:null }] }, p);
  assert.deepEqual(parsed, snapshot);
  assert.equal(JSON.stringify(parsed).includes('secret'), false);
});
test('D15C03-03 draft vazio é válido', () => {
  assert.deepEqual(parsePlaylistDraft({ playlistId:p, draftId:d, items:[] },p)?.items, []);
});
test('D15C03-04 cross-playlist e draft inválido falham fechados', () => {
  assert.equal(parsePlaylistDraft(snapshot,c),null);
  assert.equal(parsePlaylistDraft({ ...snapshot, draftId:'x' },p),null);
});
test('D15C03-05 rejeita IDs repetidos, ordem quebrada ou duração inválida', () => {
  assert.equal(parsePlaylistDraft({ ...snapshot, items:[snapshot.items[0],snapshot.items[0]] },p),null);
  assert.equal(parsePlaylistDraft({ ...snapshot, items:[{...snapshot.items[0],position:7}] },p),null);
  assert.equal(parsePlaylistDraft({ ...snapshot, items:[{...snapshot.items[0],durationMs:0}] },p),null);
});
test('D15C03-06 compara todo snapshot e recusa mudança de ordem, versão e duração', () => {
  assert.equal(draftStillCurrent(snapshot,{...snapshot,items:[{...snapshot.items[0]}]}),true);
  assert.equal(draftStillCurrent(snapshot,{...snapshot,draftId:b}),false);
  assert.equal(draftStillCurrent(snapshot,{...snapshot,items:[{...snapshot.items[0],mediaVersionId:m}]}),false);
  assert.equal(draftStillCurrent(snapshot,{...snapshot,items:[{...snapshot.items[0],durationMs:8000}]}),false);
});
test('D15C03-07 CAS leva todos os IDs de forma ordenada', () => {
  assert.deepEqual(draftCasPayload(snapshot),{expectedDraftId:d,expectedItemIds:[a]});
});
test('D15C03-08 catálogo media é projeção mínima do tenant', () => {
  assert.deepEqual(parsePlaylistMediaOptions([{id:m,companyId:c,name:'Imagem',storedAsset:{ secret:'s3-key' }}],c),[{id:m,name:'Imagem'}]);
  assert.equal(parsePlaylistMediaOptions([{id:m,companyId:p,name:'Outro'}],c),null);
});
test('D15C03-09 inclusão exige retorno exato, sem duplicação', () => {
  assert.equal(parseAddedDraftItem({ id:b,playlistVersionId:d,mediaVersionId:m,position:1,durationMs:10000 },snapshot,m,10000),true);
  assert.equal(parseAddedDraftItem({ id:b,playlistVersionId:p,mediaVersionId:m,position:1,durationMs:10000 },snapshot,m,10000),false);
});
test('D15C03-10 remoção exige item específico e contagem coerente', () => {
  assert.equal(parseRemovedDraftItem({success:true,draftId:d,removedItemId:a,remaining:0},snapshot,a),true);
  assert.equal(parseRemovedDraftItem({success:true,draftId:d,removedItemId:a,remaining:1},snapshot,a),false);
});
test('D15C03-11 erros fixos não refletem payloads ou segredos', () => {
  const e = {response:{ status:409,data:{secret:'TOKEN_NEVER'} }};
  assert.equal(playlistDraftError(e).includes('TOKEN_NEVER'),false);
  assert.match(playlistDraftError(e),/alterado/);
});
test('D15C03-12 UI usa apenas rotas add-cas/remove-cas e confirmação explícita', () => {
  const code = src('src/components/DoohPlaylistDraftEditor.tsx');
  assert.match(code,/\/add-cas/);assert.match(code,/\/remove-cas\//);
  assert.match(code,/window\.confirm/);
  assert.match(code,/draftStillCurrent/);
  assert.doesNotMatch(code,/\/publish|\/draft\/items\/order|\.delete\(/);
});
test('D15C03-13 backend CAS SERIALIZABLE e status READY obrigatório', (t) => {
  const file = backendFile('src/dooh-playlist-core/dooh-playlist-draft-items.service.ts');
  if (!existsSync(file)) { t.skip('Backend ausente no checkout isolado; executar Jest no backend.'); return; }
  const service = readFileSync(file, 'utf8');
  assert.match(service,/async addCas/);assert.match(service,/async removeCas/);
  assert.match(service,/compareDraftSnapshot/);
  assert.match(service,/TransactionIsolationLevel\.Serializable/);
  assert.match(service,/DoohMediaStatus\.READY/);
  assert.match(service,/processedAsset: \{ companyId, deletedAt: null \}/);
});
test('D15C03-14 preserva catálogo anterior e backend mantém endpoints legados', (t) => {
  const page = src('src/components/DoohPlaylistCatalogReadOnly.tsx');
  const file = backendFile('src/dooh-playlist-core/dooh-playlists.controller.ts');
  if (!existsSync(file)) { t.skip('Backend ausente no checkout isolado; executar Jest no backend.'); return; }
  const ctr = readFileSync(file, 'utf8');
  assert.match(page,/DoohPlaylistDraftEditor/);
  assert.match(page,/DoohPlaylistCreateRename/);
  assert.match(ctr,/\@Post\(':id\/draft\/items'\)/);
  assert.match(ctr,/\@Delete\(':id\/draft\/items\/:itemId'\)/);
});
