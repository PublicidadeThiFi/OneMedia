import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`[trial-policy] Ausente: ${label}`);
}

const files = await walk(srcRoot);
const forbidden = [
  /teste.{0,50}(?:30|19)\s*dias/gi,
  /(?:30|19)\s*dias.{0,50}teste/gi,
  /trial[-_: ]?(?:30|19)(?:[-_: ]?days?)?/gi,
  /(?:30|19)[-_ ]days?[-_: ]?trial/gi,
  /1\s+m[eê]s\s+gratuito/gi,
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    pattern.lastIndex = 0;
    const match = pattern.exec(source);
    if (match) {
      throw new Error(`[trial-policy] Comunicação antiga encontrada em ${path.relative(root, file)}: ${match[0]}`);
    }
  }
}

const [catalog, pricing, signupPlan, success, terms] = await Promise.all([
  readFile(path.join(root, 'src/lib/publicPricingCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/components/landing/Pricing.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/signup/Step1Plan.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/signup/SuccessScreen.tsx'), 'utf8'),
  readFile(path.join(root, 'src/pages/termos.tsx'), 'utf8'),
]);

assertContains(catalog, 'getCatalogMonthlyTrialDays', 'resolver único do trial mensal do catálogo');
assertContains(pricing, 'offer.trialDays', 'preço/landing exibe trialDays da oferta');
assertContains(signupPlan, 'offer.trialDays', 'signup exibe trialDays da oferta selecionada');
assertContains(success, 'selectedOffer.trialDays', 'sucesso do signup respeita trial da oferta selecionada');
assertContains(terms, 'usePublicTrialDays', 'termos usam a política pública do catálogo');

console.log('Trial policy frontend static check: OK');
