import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlaylistDraft } from '../src/lib/doohPlaylistDraftEditorContract.ts';
import { publishCasPayload, publishReviewReady, parsePlaylistPublished, playlistPublishError } from '../src/lib/doohPlaylistPublishContract.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(resolve(root, p), 'utf8');
const backend = resolve(root, '../ooh-manager-api/src/dooh-playlist-core');
const p='c34af24c-0211-4651-8db1-134608681234';
const d='4844d54c-23ac-4b38-bb18-123456789012';
const a='ea17e36b-25af-4a03-8b11-123456789012';
const m='a3add193-62c9-4fca-ab66-123456789012';
const next='ece4d54c-23ac-4b38-bb18-123456789012';
const draft = parsePlaylistDraft({ playlistId:p, draftId:d, items:[{id:a,mediaVersionId:m,position:0,durationMs:5000}] }, p);
assert.ok(draft);
test('D15C05-01 exige snapshot não vazio e válido',()=>{
 assert.equal(publishReviewReady(draft),true);
 assert.equal(publishReviewReady({...draft,items:[]}),false);
});
test('D15C05-02 envia lista completa revisada, não apenas ID do draft',()=>{
 assert.deepEqual(publishCasPayload(draft),{expectedDraftId:d,expectedItems:[{id:a,mediaVersionId:m,position:0,durationMs:5000}]});
});
test('D15C05-03 não gera payload para draft vazio ou errado',()=>{
 assert.equal(publishCasPayload({...draft,items:[]}),null);
 assert.equal(publishCasPayload({...draft,items:[{...draft.items[0],position:1}]}),null);
});
test('D15C05-04 recibo exige mesmo draft e playlist, próxima versão e checksum',()=>{
 const receipt={playlistId:p,published:{id:d,version:1,checksum:'a'.repeat(64),publishedAt:'2026-10-14T12:00:00.000Z'},nextDraft:{id:next,version:2},alreadyPublished:false};
 assert.equal(parsePlaylistPublished(receipt,draft,0)?.publishedVersion,1);
 assert.equal(parsePlaylistPublished({...receipt,playlistId:next},draft,0),null);
 assert.equal(parsePlaylistPublished({...receipt,published:{...receipt.published,id:next}},draft,0),null);
 assert.equal(parsePlaylistPublished(receipt,draft,1),null);
});
test('D15C05-05 não valida checksum inválido ou próxima versão repetida',()=>{
 const receipt={playlistId:p,published:{id:d,version:1,checksum:'a'.repeat(63),publishedAt:'2026-10-14T12:00:00.000Z'},nextDraft:{id:d,version:2},alreadyPublished:false};
 assert.equal(parsePlaylistPublished(receipt,draft,0),null);
});
test('D15C05-06 mensagens não refletem segredos',()=>{
 assert.equal(playlistPublishError({response:{status:409,data:{token:'TOKEN_PRIVATE'}}}).includes('TOKEN_PRIVATE'),false);
});
test('D15C05-07 UI build QA off por padrão e confirmação dupla',()=>{
 const code=src('src/components/DoohPlaylistPublishQa.tsx');
 assert.match(code,/import\.meta\.env\.MODE === 'qa'/);
 assert.match(code,/VITE_DOOH_PLAYLIST_PUBLISH_QA_ENABLED/);
 assert.match(code,/confirmation === 'PUBLICAR'/);
 assert.match(code,/window\.confirm/);
});
test('D15C05-08 UI compara estado antes de publicar e usa somente publish-cas',()=>{
 const code=src('src/components/DoohPlaylistPublishQa.tsx');
 assert.match(code,/draftStillCurrent/);
 assert.match(code,/parsePlaylistPublished/);
 assert.match(code,/\/publish-cas/);
 assert.doesNotMatch(code,/\/schedule|\/manifest|\/deploy/);
});
test('D15C05-09 catálogo preserva editor, ordenação e Marketplace',()=>{
 const code=src('src/components/DoohPlaylistCatalogReadOnly.tsx');
 assert.match(code,/DoohPlaylistPublishQa/);
 assert.match(code,/DoohPlaylistDraftReorder/);
 assert.match(code,/DoohPlaylistDraftEditor/);
});
test('D15C05-10 backend limita QA e bloqueia endpoint legado', (t)=>{
 const controller=resolve(backend,'dooh-playlists.controller.ts');
 const gate=resolve(backend,'dooh-playlist-publish-qa-gate.ts');
 if(!existsSync(controller)||!existsSync(gate)){t.skip('Backend ausente em checkout isolado; executar Jest backend.');return;}
 assert.match(readFileSync(controller,'utf8'),/assertDoohPlaylistPublishQaAllowed\(req\.user\.companyId\)/);
 assert.match(readFileSync(controller,'utf8'),/@Post\(':id\/publish-cas'\)/);
 const gateCode=readFileSync(gate,'utf8');
 assert.match(gateCode,/env\.NODE_ENV === 'production'/);
 assert.match(gateCode,/DOOH_PLAYLIST_PUBLISH_QA_ENABLED/);
});
test('D15C05-11 servidor confere itens completos dentro de SERIALIZABLE',(t)=>{
 const f=resolve(backend,'dooh-playlist-publication.service.ts');
 if(!existsSync(f)){t.skip('Backend ausente no checkout isolado.');return;}
 const code=readFileSync(f,'utf8');
 assert.match(code,/expectedItems &&/);
 assert.match(code,/item\.mediaVersionId !== expected\.mediaVersionId/);
 assert.match(code,/DOOH_PLAYLIST_PUBLISH_SNAPSHOT_STALE/);
 assert.match(code,/TransactionIsolationLevel\.Serializable/);
});
test('D15C05-12 nenhuma flag é ativada por patch e publicação permanece independente da distribuição',()=>{
 const code=src('src/components/DoohPlaylistPublishQa.tsx');
 assert.match(code,/NÃO configura agendamento, manifest, distribuição/);
 assert.doesNotMatch(code,/apiClient\.(put|delete)\(/);
});
