import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`[annual-policy] Ausente: ${label}`);
}

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`[annual-policy] Comunicação antiga encontrada: ${label}`);
}

const targetFiles = [
  'src/lib/publicPricingCatalog.ts',
  'src/components/landing/Pricing.tsx',
  'src/components/signup/Step1Plan.tsx',
  'src/components/settings/SubscriptionSettings.tsx',
  'src/pages/planos.tsx',
];

const sources = Object.fromEntries(
  await Promise.all(targetFiles.map(async (file) => [file, await read(file)])),
);
const combined = targetFiles.map((file) => sources[file]).join('\n');

assertNotMatches(combined, /20\s*%/i, '20% aplicado à condição anual');
assertNotMatches(combined, /pagamentos?\s+anuais?.{0,60}parcelad/gi, 'parcelamento da oferta anual');
assertNotMatches(combined, /anual.{0,80}parcelad/gi, 'parcelamento da oferta anual');
assertNotMatches(combined, /(?:2990|4990|7990)(?:[.,]00)?/g, 'preços anuais hardcoded no frontend');

const catalog = sources['src/lib/publicPricingCatalog.ts'];
assertContains(catalog, 'getCatalogAnnualPaymentTerms', 'resolver das condições anuais');
assertContains(catalog, "mode !== 'UPFRONT'", 'validação de cobrança anual upfront');
assertContains(catalog, 'installments !== 1', 'validação de cobrança anual em uma única cobrança');
assertContains(catalog, 'monthsAccess', 'meses de acesso vindos do catálogo');
assertContains(catalog, 'monthsCharged', 'meses cobrados vindos do catálogo');
assertContains(catalog, 'effectiveDiscountPercent', 'economia efetiva derivada da razão 10/12');

assertContains(sources['src/components/landing/Pricing.tsx'], 'getCatalogAnnualPaymentTerms', 'landing usa condição anual do catálogo');
assertContains(sources['src/components/signup/Step1Plan.tsx'], 'getCatalogAnnualPaymentTerms', 'signup usa condição anual do catálogo');
assertContains(sources['src/components/settings/SubscriptionSettings.tsx'], 'getCatalogAnnualPaymentTerms', 'settings usa condição anual do catálogo');
assertContains(sources['src/pages/planos.tsx'], 'getCatalogSharedAnnualPaymentTerms', 'FAQ anual usa condição compartilhada do catálogo');
assertContains(combined, 'pagamento integral à vista', 'comunicação explícita de pagamento integral à vista');

console.log('Annual policy frontend static check: OK');
