#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f vite.config.ts || ! -f src/contexts/ProductAccessContext.tsx || ! -f src/components/DoohFoundationPage.tsx ]]; then
  echo 'D13K_WRONG_PROJECT_ROOT: execute na raiz do frontend OneMedia (React/Vite).' >&2
  exit 64
fi
node --input-type=commonjs <<'JS'
const fs = require('node:fs');
let pkg;
try { pkg = JSON.parse(fs.readFileSync('package.json','utf8')); } catch { process.exit(64); }
if (pkg.name !== 'OneMedia' || pkg.scripts?.build !== 'vite build') {
  console.error('D13K_WRONG_PROJECT_ROOT: requer OneMedia e build vite build');
  process.exit(64);
}
JS
node --experimental-strip-types --test scripts/d13j-dooh-player-inventory.test.mjs scripts/d13k-dooh-player-detail.test.mjs
npm run build
echo 'D13K_FRONTEND_DOOH_PLAYER_DETAIL_READ_ONLY_QA_PASS__PRODUCTION_NO_GO'
