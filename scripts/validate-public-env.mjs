const isTruthy = (v) => ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase());
const isProdLike = isTruthy(process.env.CI) || isTruthy(process.env.GITHUB_ACTIONS) || String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const errors = [];
const warnings = [];

const forbiddenPublicPatterns = [
  /SECRET/i,
  /PASSWORD/i,
  /PRIVATE/i,
  /JWT/i,
  /ACCESS_TOKEN/i,
  /REFRESH_TOKEN/i,
  /ACCESS_KEY/i,
  /WEBHOOK_SECRET/i,
];

const allowedPublicKeys = new Set([
  'VITE_API_URL',
  'VITE_APP_URL',
  'VITE_TURNSTILE_SITE_KEY',
  'VITE_MERCADO_PAGO_PUBLIC_KEY',
]);

for (const key of Object.keys(process.env)) {
  if (!key.startsWith('VITE_')) continue;

  if (key === 'VITE_WAITLIST_WEBHOOK_URL') {
    errors.push('VITE_WAITLIST_WEBHOOK_URL não deve mais existir no frontend. Use WAITLIST_WEBHOOK_URL apenas no backend.');
    continue;
  }

  if (!allowedPublicKeys.has(key) && forbiddenPublicPatterns.some((pattern) => pattern.test(key))) {
    errors.push(`${key} parece conter segredo, token ou credencial e não deve ser exposta no bundle do frontend.`);
  }
}

function validateUrl(name, value, opts = {}) {
  if (!value) return;
  const raw = String(value).trim();

  if (opts.allowRelative && raw.startsWith('/')) return;

  try {
    const url = new URL(raw);
    const isLocal = url.protocol === 'http:' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    if (isProdLike && !isLocal && url.protocol !== 'https:') {
      errors.push(`${name} deve usar HTTPS em build de produção.`);
    }
  } catch {
    errors.push(`${name} deve ser uma URL válida${opts.allowRelative ? ' ou rota relativa iniciando com /' : ''}.`);
  }
}

validateUrl('VITE_API_URL', process.env.VITE_API_URL, { allowRelative: true });
validateUrl('VITE_APP_URL', process.env.VITE_APP_URL, { allowRelative: false });

if (isProdLike && !String(process.env.VITE_API_URL || '').trim()) {
  warnings.push('VITE_API_URL não foi definido. Isso só é seguro se o deploy usar rewrite/proxy no mesmo host.');
}

if (warnings.length) {
  for (const warning of warnings) {
    console.warn(`[public-env] ${warning}`);
  }
}

if (errors.length) {
  console.error(errors.map((entry) => `[public-env] ${entry}`).join('\n'));
  process.exit(1);
}

console.log('[public-env] Validação de ambiente público concluída.');
