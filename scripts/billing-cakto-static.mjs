import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const runtimeFiles = [
  'src/components/settings/SubscriptionSettings.tsx',
  'src/components/Settings.tsx',
  'src/contexts/CompanyContext.tsx',
  'src/contexts/AuthContext.tsx',
  'src/pages/cadastro.tsx',
  'src/components/signup/Step2Company.tsx',
  'src/lib/billingCheckout.ts',
  'src/lib/apiClient.ts',
  'src/types/index.ts',
  'scripts/validate-public-env.mjs',
  'envExample.md',
  'vercel.json',
];

const runtimeText = runtimeFiles.map((file) => `${file}\n${read(file)}`).join('\n');

const forbidden = [
  /mercado\s*pago/i,
  /mercadopago/i,
  /VITE_MERCADO_PAGO_PUBLIC_KEY/i,
  /activate-card/i,
  /ActivateMercadoPagoCardPayload/i,
  /cardToken/i,
  /sdk\.mercadopago\.com/i,
  /\/platform-subscription\/addons(?:\/remove)?/i,
];

for (const pattern of forbidden) {
  if (pattern.test(runtimeText)) failures.push(`Referência proibida remanescente: ${pattern}`);
}

const checkout = read('src/lib/billingCheckout.ts');
for (const required of [
  "'/billing/checkout'",
  "'Idempotency-Key'",
  "'pay.cakto.com.br'",
  "provider !== 'CAKTO'",
  'window.location.assign',
  'resumePendingCaktoCheckout',
]) {
  if (!checkout.includes(required)) failures.push(`billingCheckout.ts sem proteção/integração obrigatória: ${required}`);
}

const apiClient = read('src/lib/apiClient.ts');
if (!apiClient.includes("/^\\/billing\\/checkout\\b/i")) {
  failures.push('apiClient não libera /billing/checkout quando a conta está bloqueada.');
}

const settings = read('src/components/settings/SubscriptionSettings.tsx');
for (const required of ['startCaktoCheckout', 'selectedOffer.code', 'Ir para checkout Cakto']) {
  if (!settings.includes(required)) failures.push(`SubscriptionSettings sem fluxo Cakto: ${required}`);
}

const company = read('src/contexts/CompanyContext.tsx');
for (const forbiddenCall of [
  "apiClient.put<PlatformSubscription>('/platform-subscription'",
  "'/platform-subscription/addons'",
  "'/platform-subscription/addons/remove'",
]) {
  if (company.includes(forbiddenCall)) failures.push(`CompanyContext ainda contém mutação direta: ${forbiddenCall}`);
}

const signup = read('src/pages/cadastro.tsx');
if (!signup.includes('rememberPendingBillingOffer(step1Data.selectedOfferCode)')) {
  failures.push('Cadastro não preserva a oferta escolhida para checkout após autenticação.');
}

const auth = read('src/contexts/AuthContext.tsx');
if (!auth.includes('resumePendingCaktoCheckout')) {
  failures.push('AuthContext não retoma checkout pendente após login.');
}

if (failures.length) {
  console.error(failures.map((failure) => `[billing-cakto] ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Cakto hosted checkout frontend static check: OK');
