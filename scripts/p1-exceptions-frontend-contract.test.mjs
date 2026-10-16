import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ctx = readFileSync('src/contexts/CompanyContext.tsx','utf8');
const type = readFileSync('src/types/index.ts','utf8');
test('P1-F01 frontend inclui terceira conta sem domínio-wide', () => {
  assert.match(ctx,/['"]douguerpw2@hotmail\.com['"]/);
  assert.doesNotMatch(ctx,/endsWith\(['"]@hotmail/);
});
test('P1-F02 frontend prioriza flag canônica recebida da API', () => {
  assert.match(ctx,/typeof company\?\.trialExempt === 'boolean'/);
  assert.match(type,/trialExempt\?: boolean/);
});
test('P1-F03 fallback legado não é removido',()=>{
  assert.match(ctx,/company\?\.notificationPrefs\?\.trialExempt === true/);
});
test('P1-F04 frontend não concede grants de módulos nem ativa Marketplace',()=>{
  assert.doesNotMatch(ctx,/marketplaceEnabled:\s*true|create.*Grant|grant.*DOOH/);
});
