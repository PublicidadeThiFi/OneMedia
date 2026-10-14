import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftGroupMemberChange, isExpectedMembershipResult, safeMembershipError } from '../src/lib/doohSafeGroupMembershipContract.ts';
// This is a cross-repository structural check. Never assume a folder named
// "backend" exists beside the frontend. GitHub frontend-only checkouts may
// legitimately omit the backend; its independent Jest suite remains mandatory.
const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const backendServiceRelativePath = path.join('src', 'dooh-player-core', 'dooh-player-admin.service.ts');
function locateBackendService() {
  const configuredRoot = process.env.ONEMEDIA_BACKEND_ROOT?.trim();
  if (configuredRoot) {
    const configuredFile = path.join(path.resolve(configuredRoot), backendServiceRelativePath);
    assert.ok(fs.existsSync(configuredFile),
      `ONEMEDIA_BACKEND_ROOT configurado, mas o serviço não existe: ${configuredFile}`);
    return configuredFile;
  }
  for (const sibling of ['ooh-manager-api', 'backend']) {
    const candidate = path.resolve(frontendRoot, '..', sibling, backendServiceRelativePath);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const c = '33333333-3333-4333-8333-333333333333';
const g = '44444444-4444-4444-8444-444444444444';
const member = (id) => ({id,name:'Player',lifecycleStatus:'ACTIVE',online:false,memberSince:'2026-10-10T12:00:00Z'});
const group = (members = [member(a),member(b)],scheduleTargetCount=0) => ({id:g,name:'QA grupo',scheduleTargetCount,members});
const p = (id,status='ACTIVE') => ({id,lifecycleStatus:status});
test('D15A1-04-01 adição conserva todos os membros existentes',()=>{
  assert.deepEqual(draftGroupMemberChange(group(), 'add',p(c)),{expectedPlayerIds:[a,b],playerIds:[a,b,c]});
});
test('D15A1-04-02 remoção explícita elimina só 1 membro',()=>{
  assert.deepEqual(draftGroupMemberChange(group(),'remove',p(a)),{expectedPlayerIds:[a,b],playerIds:[b]});
});
test('D15A1-04-03 bloqueia inclusão duplicada e exclusão inexistente',()=>{
  assert.equal(draftGroupMemberChange(group(),'add',p(a)),null);
  assert.equal(draftGroupMemberChange(group(),'remove',p(c)),null);
});
test('D15A1-04-04 bloqueia aposentado e grupos com programação',()=>{
  assert.equal(draftGroupMemberChange(group(),'add',p(c,'RETIRED')),null);
  assert.equal(draftGroupMemberChange(group([member(a)],1),'add',p(c)),null);
});
test('D15A1-04-05 rejeita duplicidade e ID inválido na leitura',()=>{
  assert.equal(draftGroupMemberChange(group([member(a),member(a)]),'add',p(c)),null);
  assert.equal(draftGroupMemberChange(group([member('invalid')]),'add',p(c)),null);
});
test('D15A1-04-06 valida resultado exato do servidor',()=>{
  assert.equal(isExpectedMembershipResult({id:g,members:[{id:a},{id:b}]},g,[a,b]),true);
  assert.equal(isExpectedMembershipResult({id:g,members:[{id:a},{id:a}]},g,[a,b]),false);
  assert.equal(isExpectedMembershipResult({id:g,members:[{id:c}]},g,[a,b]),false);
});
test('D15A1-04-07 mensagens de erro nunca refletem payloads secretos',()=>{
  const msg=safeMembershipError({response:{status:409,data:{token:'SECRET'}}});
  assert.match(msg,/Conflito/);assert.doesNotMatch(msg,/SECRET/);
});
test('D15A1-04-08 usa somente compare-and-set; não usa legacy PUT',()=>{
  const ui=fs.readFileSync('src/components/DoohGroupMembersSafeEditor.tsx','utf8');
  assert.match(ui,/members\/compare-and-set/);
  assert.doesNotMatch(ui,/`\/dooh\/player-groups\/\$\{encodeURIComponent\(selectedGroup.id\)\}\/members`/);
  assert.match(ui,/isOperationalWriteAllowed/);
  assert.match(ui,/window\.confirm/);
});
test('D15A1-04-09 backend trava grupo e compara membros dentro do mesmo SERIALIZABLE',(t)=>{
  const backendFile = locateBackendService();
  if (!backendFile) {
    t.skip('Checkout do backend não encontrado; verificar o CAS no Jest do ooh-manager-api.');
    return;
  }
  const backend = fs.readFileSync(backendFile, 'utf8');
  const start = backend.indexOf('async compareAndSetGroupMembers(');
  const end = backend.indexOf('async replaceGroupMembers(', start);
  assert.ok(start >= 0 && end > start, 'Método CAS deve existir antes do endpoint legado');
  const target = backend.slice(start, end);
  assert.match(target,/withSerializableRetry/);
  assert.ok(target.indexOf('doohPlayerGroup.updateMany') < target.indexOf('doohPlayerGroupMember.findMany'));
  assert.ok(target.indexOf('doohPlayerGroupMember.findMany') < target.indexOf('doohPlayerGroupMember.deleteMany'));
  assert.match(target,/DOOH_PLAYER_GROUP_MEMBERS_STALE/);
  // Apenas membros adicionados/removidos devem ser escritos.
  assert.match(target,/const toRemove = existing.filter/);
  assert.match(target,/const toAdd = nextPlayerIds.filter/);
});
test('D15A1-04-10 tela integra editor, sem restart nem despausa',()=>{
  const source=fs.readFileSync('src/components/DoohFoundationPage.tsx','utf8');
  const ui=fs.readFileSync('src/components/DoohGroupMembersSafeEditor.tsx','utf8');
  assert.match(source,/<DoohGroupMembersSafeEditor \/>/);
  assert.doesNotMatch(ui,/\/restart['`]/);
  assert.doesNotMatch(ui,/paused\s*:\s*false/);
});
