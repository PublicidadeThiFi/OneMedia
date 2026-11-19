import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDoohPointOptions, parseDoohScreenOptions } from '../src/lib/doohScreenSelectionContract.ts';
const a = 'ebd76457-3762-48b6-9c8d-7c2f9d8b31ef';
const b = 'e0aeb166-740d-424d-850e-ce5220964cb4';
const point = 'dd6af179-a998-4cd6-b10e-25f33a8d734c';
const unit = '7b29b50f-657d-4886-89b8-604f6dc835fb';
const validPoint = { id: point, companyId: a, name: 'Loja Centro', type: 'DOOH' };
const validScreen = { id: unit, companyId: a, mediaPointId: point, unitType: 'SCREEN', isActive: true, label: 'Painel LED' };
test('P0-02 pontos do tenant consultados sem expor UUID ao operador', () => {
 assert.deepEqual(parseDoohPointOptions({data:[validPoint],total:1},a), {items:[{id:point,name:'Loja Centro'}],hasMore:false});
});
test('P0-02 paginação sinaliza busca necessária', () => {
 assert.equal(parseDoohPointOptions({data:[validPoint],total:101},a)?.hasMore,true);
});
test('P0-02 outro tenant é recusado', () => {
 assert.equal(parseDoohPointOptions({data:[{...validPoint, companyId:b}],total:1},a),null);
 assert.equal(parseDoohScreenOptions([{...validScreen,companyId:b}],a,point),null);
});
test('P0-02 somente SCREEN ativa aparece, FACE/inativa são omitidas', () => {
 const other = '71703bf9-426d-48aa-bffc-bdd578a03756';
 assert.deepEqual(parseDoohScreenOptions([validScreen,{...validScreen,id:other,unitType:'FACE'}],a,point),[{id:unit,label:'Painel LED'}]);
 assert.deepEqual(parseDoohScreenOptions([{...validScreen,isActive:false}],a,point),[]);
});
test('P0-02 payload incompatível e ponto divergente falham fechado', () => {
 assert.equal(parseDoohPointOptions({unexpected:[]},a),null);
 assert.equal(parseDoohScreenOptions([{...validScreen,mediaPointId:b}],a,point),null);
 assert.equal(parseDoohScreenOptions([{...validScreen},{...validScreen}],a,point),null);
});
test('P0-02 associação continua revalidada imediatamente antes de escrita', () => {
 const source=readFileSync(new URL('../src/components/DoohPlayerPairingAndAssignment.tsx',import.meta.url),'utf8');
 assert.match(source,/parseScreenCandidate\(unitResponse\.data, companyId, checkedScreen\.id\)/);
 assert.match(source,/parseDoohPlayerDetail\(playerResponse\.data, selectedPlayer\.id\)/);
 assert.match(source,/\/dooh\/players\/\$\{encodeURIComponent\(selectedPlayer\.id\)\}\/assignment/);
 assert.doesNotMatch(source,/ID da unidade SCREEN \(UUID\)/);
});
