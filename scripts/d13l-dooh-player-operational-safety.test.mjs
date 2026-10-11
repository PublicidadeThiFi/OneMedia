import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseDoohPlayerInventoryResponse,
  isDoohPlayerInventoryResponse,
} from '../src/lib/doohPlayerInventoryContract.ts';
import { doohPlayerReadFailure } from '../src/lib/doohPlayerReadFailure.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => readFileSync(join(root, name), 'utf8');
const item = {
  id: 'a10b1d85-9139-4831-bb10-28b3412a7266',
  name: 'Totem do hall', platform: 'ANDROID', lifecycleStatus: 'ACTIVE',
  online: false, lastSeenAt: null, appVersion: null,
  currentManifestVersion: '12', desiredManifestVersion: '13',
  currentAssignment: null,
};
const meta = {page:1, pageSize:20, total:1, totalPages:1, offlineAfterSeconds:180};
const make = (players=[item], m=meta) => ({items:players, meta:m});

test('01 lista aceita o DTO administrativo real e devolve somente campos permitidos', () => {
  const raw = make([{...item, installationId:'private-install', metadata:{token:'private-token'},
    groups:[{id:'hidden-group',name:'private-group'}],
    credential:{credentialId:'private-credential'}, assignmentHistory:[{assignedById:'hidden-actor'}]}]);
  const projected = parseDoohPlayerInventoryResponse(raw);
  assert.ok(projected);
  for (const secret of ['private-install','private-token','private-group','private-credential','hidden-actor',
    'installationId','metadata','credential','assignmentHistory']) {
    assert.ok(!JSON.stringify(projected).includes(secret), secret);
  }
  assert.deepEqual(Object.keys(projected).sort(), ['items','meta']);
  assert.deepEqual(Object.keys(projected.items[0]).sort(), Object.keys(item).sort());
});

test('02 associação preserva somente identificação mínima da tela', () => {
  const projected = parseDoohPlayerInventoryResponse(make([{
    ...item,
    currentAssignment: {id:'assign',assignedById:'hidden-operator',
      mediaUnit:{id:'screen',label:'Tela A',unitType:'SCREEN',isActive:true,
        mediaPoint:{name:'hidden-point',addressCity:'hidden-city',addressState:'hidden-state'}}},
  }]));
  assert.ok(projected);
  assert.deepEqual(projected.items[0].currentAssignment, {id:'assign',mediaUnit:{id:'screen',label:'Tela A',unitType:'SCREEN',isActive:true}});
  assert.ok(!JSON.stringify(projected).includes('hidden-'));
});

test('03 inventário rejeita status online impossível para lifecycle não ACTIVE', () => {
  for (const lifecycleStatus of ['INACTIVE','RETIRED']) {
    assert.equal(parseDoohPlayerInventoryResponse(make([{...item,lifecycleStatus,online:true}])),null);
  }
});

test('04 ids duplicados não geram uma lista aparentemente íntegra', () => {
  assert.equal(parseDoohPlayerInventoryResponse(make([item,{...item}],{...meta,total:2})),null);
});

test('05 paginação inconsistente é recusada', () => {
  for (const m of [
    {...meta,totalPages:2}, {...meta,pageSize:101}, {...meta,total:0},
    {...meta,offlineAfterSeconds:0}, {...meta,totalPages:0},
    {...meta,total:'1'}, {...meta,pageSize:0},
  ]) assert.equal(parseDoohPlayerInventoryResponse(make([item],m)),null);
});

test('06 mudança de empresa ou página não é inferida pelo conteúdo do DTO', () => {
  // A API é tenant-scoped pelo JWT; a UI deve validar contexto de snapshot, filtros e chave da requisição.
  const list = src('src/components/DoohPlayerInventoryReadOnly.tsx');
  assert.match(list,/snapshot\?\.companyId === companyId/);
  assert.match(list,/JSON\.stringify\(\[companyId, page, search, lifecycle, connectivity, reload\]\)/);
  assert.match(list,/data\?\.requestKey === requestKey/);
  assert.match(list,/selected\?\.requestKey === requestKey/);
  assert.match(list,/return \(\) => controller\.abort\(\)/);
});

test('07 estado bruto da API nunca é salvo no inventário', () => {
  const list=src('src/components/DoohPlayerInventoryReadOnly.tsx');
  assert.match(list,/const projected = parseDoohPlayerInventoryResponse\(result\)/);
  assert.match(list,/setData\(\{ requestKey, response: projected \}\)/);
  assert.doesNotMatch(list,/setData\(\{ requestKey, response: result \}\)/);
});

test('08 lista permite página maior que total após exclusão concorrente, sem inventar resultados', () => {
  const parsed=parseDoohPlayerInventoryResponse(make([], {...meta,page:3,total:1,totalPages:1}));
  assert.ok(parsed);
  assert.equal(parsed.items.length,0);
  assert.match(src('src/components/DoohPlayerInventoryReadOnly.tsx'),/Esta página não está mais disponível/);
});

test('09 resposta sem itens continua válida para inventário realmente vazio', () => {
  assert.ok(parseDoohPlayerInventoryResponse(make([], {...meta,total:0,totalPages:1})));
  assert.equal(isDoohPlayerInventoryResponse({statusCode:403,message:'private-username'}),false);
});

test('10 indisponibilidade de autenticação recebe mensagem fixa sem refletir o backend', () => {
  const message=doohPlayerReadFailure({response:{status:401,data:{token:'PRIVATE'}}},'inventory');
  assert.match(message,/Sessão não autenticada/);
  assert.doesNotMatch(message,/PRIVATE/);
});

test('11 acesso negado ou pagamento requerido não é tratado como falha de rede', () => {
  for (const status of [402,403]) {
    const message=doohPlayerReadFailure({response:{status}},'detail');
    assert.match(message,/não autorizada/);
  }
});

test('12 player inexistente não expõe identificadores nem induz a criar player', () => {
  const message=doohPlayerReadFailure({response:{status:404,data:{playerId:'secret'}}},'detail');
  assert.match(message,/não está mais disponível/);
  assert.ok(!message.includes('secret'));
});

test('13 endpoint de inventário ausente é diagnosticado separadamente', () => {
  assert.match(doohPlayerReadFailure({response:{status:404}},'inventory'),/não está disponível nesta API/);
});

test('14 limite HTTP e indisponibilidade do serviço são classificados sem mensagens arbitrárias', () => {
  assert.match(doohPlayerReadFailure({response:{status:429}},'inventory'),/temporariamente limitadas/);
  assert.match(doohPlayerReadFailure({response:{status:503}},'inventory'),/temporariamente indisponível/);
  assert.doesNotMatch(doohPlayerReadFailure({response:{status:503},message:'secret'},'inventory'),/secret/);
});

test('15 erro inesperado/cancelamento não reflete detalhes privados', () => {
  const message=doohPlayerReadFailure({message:'token, internal hostname, stack',code:'ECONNABORTED'},'detail');
  assert.match(message,/Confirme a conexão/);
  assert.doesNotMatch(message,/token|stack|hostname/);
});

test('16 todos os fluxos DOOH continuam GET, sem comandos nem exportações', () => {
  const list=src('src/components/DoohPlayerInventoryReadOnly.tsx');
  const detail=src('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.match(list,/apiClient\.get<unknown>\('\/dooh\/players'/);
  assert.match(detail,/apiClient\.get<unknown>\(`/);
  for (const s of [list,detail]) {
    assert.doesNotMatch(s,/apiClient\.(post|patch|put|delete)\b/i);
    assert.doesNotMatch(s,/\/restart|\/pair\b|\/publish\b/);
    assert.match(s,/controller\.signal\.aborted/);
    assert.match(s,/doohPlayerReadFailure\(error, '(?:inventory|detail)'\)/);
  }
});

test('17 nenhuma alteração de entitlement pode ser inferida por consulta GET', () => {
  const s=src('src/components/DoohPlayerInventoryReadOnly.tsx');
  assert.match(s,/snapshot\.modules\.DOOH\.granted/);
  assert.match(s,/\['FULL', 'READ_ONLY'\]\.includes/);
  assert.match(s,/ADMINISTRATIVO.*TI|TI.*ADMINISTRATIVO/);
});

test('18 API não é considerada prova de exibição e o D13K descarta dados sensíveis', () => {
  const s=src('src/components/DoohPlayerDetailReadOnly.tsx');
  assert.match(s,/não comprovam reprodução física/);
  assert.match(s,/setData\(parsed\)/);
  assert.doesNotMatch(s,/setData\(result\)/);
});
