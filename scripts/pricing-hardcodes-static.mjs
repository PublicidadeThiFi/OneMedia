import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNotIncludes(relativePath, fragments) {
  const content = read(relativePath);
  for (const fragment of fragments) {
    assert(!content.includes(fragment), `${relativePath}: não deveria conter ${JSON.stringify(fragment)}`);
  }
}

assert(!exists('src/components/landing/pricingData.ts'), 'pricingData.ts legado deve ser removido.');
assert(!exists('src/components/landing/mobile/MobilePricing.tsx'), 'MobilePricing.tsx legado e não utilizado deve ser removido.');

assertNotIncludes('src/lib/plans.ts', [
  'FIXED_PLANS',
  'PRO_2000_PLAN_IDS',
  'PLATFORM_PLANS',
  'monthlyPrice',
  'getMultiOwnerPriceCents',
  'getMultiOwnerPlanPrice',
]);

assertNotIncludes('src/types/signup.ts', [
  'PLAN_DEFINITIONS',
  'selectedPlatformPlanId',
  'selectedPlanRange',
  'planId?:',
]);

assertNotIncludes('src/components/settings/SubscriptionSettings.tsx', [
  'monthlyPrice >= 10000',
  'priceIsCents',
  'getMultiOwnerPriceCents',
  'getMultiOwnerPlanPrice',
  'priceBrl:',
]);

const activeFiles = [
  'src/lib/plans.ts',
  'src/components/landing/Pricing.tsx',
  'src/components/signup/Step1Plan.tsx',
  'src/pages/cadastro.tsx',
  'src/components/settings/SubscriptionSettings.tsx',
];
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
for (const relativePath of activeFiles) {
  assert(!uuidPattern.test(read(relativePath)), `${relativePath}: UUID comercial hardcoded encontrado.`);
}

assert(read('src/components/landing/Pricing.tsx').includes("from './pricingFeatures'"), 'Landing deve usar pricingFeatures sem pricingData legado.');
assert(read('src/components/signup/Step1Plan.tsx').includes("from '../landing/pricingFeatures'"), 'Signup deve usar pricingFeatures sem pricingData legado.');

console.log('Pricing hardcodes/UUID frontend static check: OK');
