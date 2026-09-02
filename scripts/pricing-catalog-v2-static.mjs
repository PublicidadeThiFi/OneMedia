import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(relativePath, fragments) {
  const content = read(relativePath);
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      throw new Error(`${relativePath}: esperado encontrar ${JSON.stringify(fragment)}`);
    }
  }
}

function assertNotIncludes(relativePath, fragments) {
  const content = read(relativePath);
  for (const fragment of fragments) {
    if (content.includes(fragment)) {
      throw new Error(`${relativePath}: não deveria conter ${JSON.stringify(fragment)}`);
    }
  }
}

assertIncludes('src/lib/publicPricingCatalog.ts', [
  "'/public/pricing-catalog'",
  'PUBLIC_PRICING_CATALOG_VERSION = 2',
]);

assertIncludes('src/components/landing/Pricing.tsx', [
  'usePublicPricingCatalog',
  'getCatalogOffer',
  'plan.entitlements.pointsLimit',
  "['MONTHLY', 'ANNUAL']",
]);

assertNotIncludes('src/components/landing/Pricing.tsx', [
  'displayPlans.map',
  'proSliderConfig',
  'useProSliderPrice',
]);

assertIncludes('src/components/signup/Step1Plan.tsx', [
  'usePublicPricingCatalog',
  'selectedPlanCode',
  'selectedOfferCode',
  'plan.entitlements.usersLimit',
]);

assertIncludes('src/pages/cadastro.tsx', [
  'planCode: step1Data.selectedPlanCode',
]);

assertIncludes('src/components/Settings.tsx', [
  'usePublicPricingCatalog',
  'pricingCatalog={pricingCatalog}',
]);

assertIncludes('src/components/settings/SubscriptionSettings.tsx', [
  'Alterar ou contratar plano',
  "getCatalogOffer(catalogPlan, 'MONTHLY')",
  "getCatalogOffer(catalogPlan, 'ANNUAL')",
]);

console.log('Pricing Catalog V2 frontend static check: OK');
