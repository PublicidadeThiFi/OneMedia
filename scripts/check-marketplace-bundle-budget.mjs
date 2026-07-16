#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
  console.error('dist não encontrado. Execute npm run build antes do orçamento de bundle.');
  process.exit(1);
}

const maxChunkGzipKb = Number(process.env.MARKETPLACE_MAX_CHUNK_GZIP_KB || 650);
const maxTotalGzipKb = Number(process.env.MARKETPLACE_MAX_TOTAL_JS_GZIP_KB || 2600);
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.js')) {
      const raw = readFileSync(path);
      files.push({ file: relative(dist, path), raw: raw.length, gzip: gzipSync(raw).length });
    }
  }
}
walk(dist);

if (!files.length) {
  console.error('Nenhum bundle JavaScript foi encontrado em dist.');
  process.exit(1);
}

files.sort((a, b) => b.gzip - a.gzip);
const totalGzipKb = files.reduce((sum, item) => sum + item.gzip, 0) / 1024;
const largestGzipKb = files[0].gzip / 1024;
console.table(files.slice(0, 12).map((item) => ({
  arquivo: item.file,
  'raw KB': (item.raw / 1024).toFixed(1),
  'gzip KB': (item.gzip / 1024).toFixed(1),
})));
console.log(`Total JS gzip: ${totalGzipKb.toFixed(1)} KB`);
console.log(`Maior chunk gzip: ${largestGzipKb.toFixed(1)} KB`);

if (largestGzipKb > maxChunkGzipKb || totalGzipKb > maxTotalGzipKb) {
  console.error(`Orçamento reprovado. Limites: chunk <= ${maxChunkGzipKb} KB; total <= ${maxTotalGzipKb} KB gzip.`);
  process.exit(1);
}
