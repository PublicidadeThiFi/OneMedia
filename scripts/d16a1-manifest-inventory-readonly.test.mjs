import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canReadManifestInventory, parseDoohManifestInventory, manifestInventorySignals,
  manifestInventoryError } from '../src/lib/doohManifestInventoryContract.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const company = '11111111-1111-4111-8111-111111111111';
const other = '99999999-9999-4999-8999-999999999999';
const id = '22222222-2222-4222-8222-222222222222';
const sha = 'a'.repeat(64);
const at = '2026-10-15T12:00:00.000Z';
const player = { id, lifecycleStatus: 'ACTIVE', currentManifestVersion: '1', desiredManifestVersion: '2' };
const record = (version = '2') => ({ version, checksum: sha, publishedAt: at });
const response = () => ({ scope: 'PERSISTED_METADATA_ONLY', companyId: company, playerId: id,
  lifecycleStatus: 'ACTIVE', currentManifestVersion: '1', desiredManifestVersion: '2',
  latestRecordedVersion: '2', records: [record()], limit: 50, hasMore: false,
  payloadIntegrity: 'NOT_CHECKED', distribution: 'NOT_CHECKED', playback: 'NOT_CHECKED' });
const parse = (data, p = player) => parseDoohManifestInventory(data, company, p);
test('D16A01-01 aceita projeção segura sem payload bruto', () => {
 const v = parse({ ...response(), payload: { secret: 'do-not-display' } });
 assert.equal(v.latestRecordedVersion, '2'); assert.equal(v.records[0].checksumShort, 'aaaaaaaaaaaa…');
 assert.equal(JSON.stringify(v).includes('do-not-display'), false);
});
test('D16A01-02 aceita FULL e READ_ONLY apenas com papel técnico e empresa exata', () => {
 for (const mode of ['FULL','READ_ONLY']) assert.equal(canReadManifestInventory(company,company,company,true,mode,['TI']),true);
 for (const [session,grant,mode,roles] of [[other,company,'FULL',['TI']], [company,other,'FULL',['TI']],
  [company,company,'NONE',['TI']], [company,company,'READ_ONLY',['COMERCIAL']]]) {
  assert.equal(canReadManifestInventory(company,session,grant,true,mode,roles),false);
 }
 assert.equal(canReadManifestInventory(company,company,company,false,'FULL',['ADMINISTRATIVO']),false);
});
test('D16A01-03 rejeita respostas cross-tenant ou player diferente', () => {
 assert.equal(parse({ ...response(), companyId: other }),null);
 assert.equal(parse({ ...response(), playerId: other }),null);
});
test('D16A01-04 recusa revisão técnica diferente', () => {
 assert.equal(parse({ ...response(), desiredManifestVersion: '3' }),null);
 assert.equal(parse({ ...response(), currentManifestVersion: '0' }),null);
 assert.equal(parse({ ...response(), lifecycleStatus: 'INACTIVE' }),null);
});
test('D16A01-05 lista vazia não inventa total nem última versão', () => {
 const empty = { ...response(), records: [], latestRecordedVersion: null };
 const v = parse(empty); assert.equal(v.latestRecordedVersion,null); assert.deepEqual(v.records,[]);
 assert.equal(parse({ ...empty, hasMore: true }),null);
});
test('D16A01-06 rejeita registros duplicados ou desordenados', () => {
 assert.equal(parse({ ...response(), records: [record('2'),record('2')] }),null);
 assert.equal(parse({ ...response(), records: [record('2'),record('3')] }),null);
});
test('D16A01-07 mantém verificação exata de latest e limite 50', () => {
 assert.equal(parse({ ...response(), latestRecordedVersion: '1' }),null);
 assert.equal(parse({ ...response(), limit: 100 }),null);
 assert.equal(parse({ ...response(), hasMore: true }),null);
});
test('D16A01-08 limita a 50 versões e aceita aviso de histórico truncado', () => {
 const records = Array.from({length:50}, (_,i)=>record(String(50-i)));
 const v = parse({ ...response(), records, latestRecordedVersion: '50', hasMore:true });
 assert.equal(v.records.length,50); assert.equal(v.hasMore,true);
 assert.equal(parse({ ...response(), records:[...records,record('0')], latestRecordedVersion:'50', hasMore:true }),null);
});
test('D16A01-09 verifica checksum e timestamps sem receber chave do storage', () => {
 assert.equal(parse({ ...response(), records: [{...record(), checksum:'x'.repeat(64)}] }),null);
 assert.equal(parse({ ...response(), records: [{...record(), publishedAt:'yesterday'}] }),null);
});
test('D16A01-10 recusa versões negativas, grandes ou com zeros à esquerda', () => {
 for (const version of ['-1','9223372036854775808','02','2.0'])
  assert.equal(parse({ ...response(), records:[record(version)], latestRecordedVersion:version }),null);
});
test('D16A01-11 mantém limites de interpretação dos dados', () => {
 const v = parse(response()); const signals = manifestInventorySignals(v);
 assert.ok(signals.some(s=>s.includes('divergem')));
 assert.equal(JSON.stringify(v).includes('READY'),false);
 for (const field of ['distribution','playback','payloadIntegrity'])
  assert.equal(parse({ ...response(), [field]:'VERIFIED' }),null);
});
test('D16A01-12 versão igual não confirma download ou PoP', () => {
 const aligned = parse({ ...response(), currentManifestVersion:'2' }, {...player,currentManifestVersion:'2'});
 assert.ok(manifestInventorySignals(aligned).some(s=>s.includes('não comprova')));
});
test('D16A01-13 erros não refletem corpo da resposta ou credenciais', () => {
 const m = manifestInventoryError({ response: { status: 500, data: { token: 'PRIVATE_TOKEN' } } });
 assert.equal(m.includes('PRIVATE_TOKEN'),false);
});
test('D16A01-14 componente só consulta GET e cancela requisições ao trocar contexto', () => {
 const s=fs.readFileSync(path.join(root,'src/components/DoohManifestInventoryReadOnly.tsx'),'utf8');
 assert.match(s,/apiClient\.get<unknown>/); assert.match(s,/AbortController/);
 assert.match(s,/keyRef\.current === requestKey/); assert.doesNotMatch(s,/apiClient\.(post|patch|put|delete)/);
});
test('D16A01-15 integração preserva detalhe e não cria ações de player', () => {
 const s=fs.readFileSync(path.join(root,'src/components/DoohPlayerDetailReadOnly.tsx'),'utf8');
 assert.match(s,/DoohManifestInventoryReadOnly/); assert.match(s,/doohPlayerDetailSignals/);
});
test('D16A01-16 endpoint backend (quando disponível) não consulta payload ou cria manifest', () => {
 const src=path.resolve(root,'..','ooh-manager-api','src/dooh-manifest-core/dooh-manifest-inventory.service.ts');
 if (!fs.existsSync(src)) return; // CI frontend isolado: contrato backend testado pelo Jest
 const s=fs.readFileSync(src,'utf8');
 assert.match(s,/take: LIMIT \+ 1/); assert.match(s,/RepeatableRead/);
 assert.match(s,/resolveCompanyAccess/);
 assert.doesNotMatch(s,/doohManifest\.(create|update|delete)|select:\s*\{[^}]*payload:\s*true/);
});
