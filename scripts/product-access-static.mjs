import fs from 'node:fs';

const required = [
  ['src/lib/platformAccess.ts', "apiClient.get<PlatformAccessSnapshot>('/platform-access')"],
  ['src/contexts/ProductAccessContext.tsx', 'export function ProductAccessProvider'],
  ['src/contexts/ProductAccessContext.tsx', 'export function useProductAccess'],
  ['src/contexts/ProductAccessContext.tsx', "(['OOH', 'DOOH'] as PlatformModule[])"],
  ['src/App.tsx', '<ProductAccessProvider>'],
];

const errors = [];
for (const [file, needle] of required) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) errors.push(`${file}: ausente ${needle}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('[product-access-static] PASS');
