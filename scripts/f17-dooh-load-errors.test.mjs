import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('src/components/DoohScreenContentWizard.tsx', 'utf8');
const publication = readFileSync('src/components/DoohScreenPublicationWizard.tsx', 'utf8');

test('F17 conteúdo: "não ativada" só quando o servidor nega; falha de carga vira "Tentar de novo"', () => {
  assert.match(content, /setEnabled\(cap\); setDenied\(!cap\);/);
  assert.match(content, /\{loaded && denied && <p[^>]*>A preparação guiada ficará disponível/);
  assert.doesNotMatch(content, /\{loaded && !enabled && <p[^>]*>A preparação guiada/);
  assert.match(content, /Não conseguimos carregar o conteúdo desta tela agora\./);
  assert.match(content, /if \(!autoRetried\.current\) \{ autoRetried\.current = true; window\.setTimeout/);
});

test('F17 publicação: "não liberada" só pela capacidade do servidor; falha de leitura tenta de novo', () => {
  assert.match(publication, /if\(!enabled\)\{setServerDenied\(true\);/);
  assert.match(publication, /!caps\.guided&&loaded&&serverDenied&&<p[^>]*>A publicação ainda não está liberada/);
  assert.doesNotMatch(publication, /!caps\.guided&&loaded&&<p[^>]*>A publicação ainda não está liberada/);
  assert.match(publication, /Não conseguimos carregar a situação da publicação agora\./);
  assert.match(publication, /if\(!autoRetried\.current\)\{autoRetried\.current=true;window\.setTimeout/);
  // A failed read still hides the publish controls (fail closed); only the message changes.
  assert.match(publication, /catch\(\(cause:unknown\)=>\{if\(!ctl\.signal\.aborted&&activeKey\.current===key\)\{setCaps\(DENIED\);setSingle\(false\);/);
});
