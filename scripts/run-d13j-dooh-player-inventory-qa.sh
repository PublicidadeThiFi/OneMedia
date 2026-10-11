#!/usr/bin/env bash
set -euo pipefail

# D13J: reject running the frontend QA from a backend checkout.
cd "$(dirname "$0")/.."
if [[ ! -f vite.config.ts || ! -f src/contexts/ProductAccessContext.tsx || ! -f src/components/DoohFoundationPage.tsx ]]; then
  echo 'D13J_WRONG_PROJECT_ROOT: execute o QA na raiz do frontend React/Vite OneMedia, nao em ooh-manager-api.' >&2
  exit 64
fi
node --input-type=commonjs <<'JS'
const fs = require('node:fs');
let pkg;
try { pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); }
catch { console.error('D13J_WRONG_PROJECT_ROOT: package.json indisponivel ou invalido.'); process.exit(64); }
if (pkg.name !== 'OneMedia' || pkg.scripts?.build !== 'vite build') {
  console.error('D13J_WRONG_PROJECT_ROOT: o projeto deve ser OneMedia (React/Vite), com script build="vite build".');
  process.exit(64);
}
JS
node --experimental-strip-types --test scripts/d13j-dooh-player-inventory.test.mjs
npm run build
echo 'D13J_FRONTEND_DOOH_INVENTORY_READ_ONLY_QA_PASS__PRODUCTION_NO_GO'
