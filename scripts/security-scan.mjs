import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.pdf', '.zip', '.gz', '.tar', '.tgz', '.lock', '.xlsx', '.xls', '.doc', '.docx', '.mp4', '.mov', '.webm', '.avi', '.mkv', '.woff', '.woff2', '.ttf', '.eot', '.map'
]);
const FORBIDDEN_FILE_PATTERNS = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)id_rsa(\.pub)?$/i,
  /\.(pem|key|p12|pfx)$/i,
];
const CONTENT_PATTERNS = [
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'JWT token', regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9._-]{8,}\.[A-Za-z0-9._-]{8,}\b/ },
  { name: 'Database URL with embedded password', regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/i },
  { name: 'Stripe secret key', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'Webhook URL hardcoded', regex: /https?:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9/_-]*webhook[A-Za-z0-9/_-]*/i },
];
const ASSIGNMENT_REGEX = /\b([A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|API_KEY|WEBHOOK)[A-Z0-9_]*)\b\s*[:=]\s*["']?([^\s"'`,;]{8,})/g;
const SAFE_VALUE_PATTERNS = [/^\$\{?{?\s*(?:vars|secrets|env)\./i, /^changeme$/i, /^placeholder$/i, /^example$/i, /^your[_-]/i, /^replace[_-]/i, /^dummy/i, /^test_/i, /^<.*>$/, /^\*+$/];
const ALLOWED_PATH_SNIPPETS = ['envExample.md'];

function shouldSkipFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (ALLOWED_PATH_SNIPPETS.some((snippet) => rel.includes(snippet))) return true;
  const ext = path.extname(rel).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function looksSafeValue(value, key = '') {
  const normalized = String(value || '').trim();
  const normalizedKey = String(key || '').trim().toUpperCase();
  if (!normalized) return true;
  if (normalizedKey.startsWith('MOCK_') || normalizedKey.startsWith('TEST_')) return true;
  if (normalized.startsWith('/')) return true;
  return SAFE_VALUE_PATTERNS.some((pattern) => pattern.test(normalized));
}

const findings = [];

for (const filePath of walk(ROOT)) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');

  if (FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(rel))) {
    findings.push(`[forbidden-file] ${rel}`);
    continue;
  }

  if (shouldSkipFile(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const pattern of CONTENT_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      findings.push(`[pattern:${pattern.name}] ${rel}`);
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    ASSIGNMENT_REGEX.lastIndex = 0;
    for (const match of line.matchAll(ASSIGNMENT_REGEX)) {
      const key = match[1];
      const value = match[2];
      if (looksSafeValue(value, key)) continue;
      findings.push(`[assignment:${key}] ${rel}:${index + 1}`);
    }
  }
}

if (findings.length) {
  console.error('Falha no security scan. Possíveis segredos versionados encontrados:');
  for (const finding of findings) {
    console.error(` - ${finding}`);
  }
  process.exit(1);
}

console.log('Security scan concluído sem segredos versionados aparentes.');
