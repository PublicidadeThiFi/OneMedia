import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function walk(relativeDir) {
  const dir = path.join(root, relativeDir);
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(path.relative(root, full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const publicFiles = [
  ...await walk('src/components/landing'),
  ...await walk('src/components/signup'),
  path.join(root, 'src/components/settings/SubscriptionSettings.tsx'),
  ...[
    'src/pages/index.tsx',
    'src/pages/landing-mobile.tsx',
    'src/pages/planos.tsx',
    'src/pages/cadastro.tsx',
    'src/pages/termos.tsx',
    'src/pages/privacidade.tsx',
    'src/pages/contato.tsx',
  ].map((file) => path.join(root, file)),
];

const forbidden = [
  /\bNF-?e\b/gi,
  /\bNFS-?e\b/gi,
  /\bNFe\b/g,
  /\bNFSe\b/g,
  /notas?\s+fiscais?/gi,
  /emiss[aã]o.{0,40}(?:nota|fiscal)/gi,
];

for (const file of publicFiles) {
  const source = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    pattern.lastIndex = 0;
    const match = pattern.exec(source);
    if (match) {
      throw new Error(
        `[fiscal-communication] Comunicação fiscal pública encontrada em ${path.relative(root, file)}: ${match[0]}`,
      );
    }
  }
}

// A Etapa 27 remove somente a promessa/comunicação comercial.
// Estruturas internas/mocks de fiscalidade permanecem preservadas.
const [settingsMock, activityMock] = await Promise.all([
  readFile(path.join(root, 'src/lib/mockDataSettings.ts'), 'utf8'),
  readFile(path.join(root, 'src/lib/mockDataActivityLog.ts'), 'utf8'),
]);

if (!settingsMock.includes('nfe: { enabled: false }')) {
  throw new Error('[fiscal-communication] Estrutura interna nfe do mock de settings foi removida.');
}
if (!activityMock.includes('nfNumber') || !activityMock.includes('nfSerie')) {
  throw new Error('[fiscal-communication] Estrutura interna de Nota Fiscal do ActivityLog foi removida.');
}

console.log('Fiscal communication frontend static check: OK');
