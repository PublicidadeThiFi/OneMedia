#!/usr/bin/env bash
# D13N — browser-only real React components with intercepted synthetic HTTP. No DB/AWS.
set -euo pipefail
cd "$(dirname "$0")/.."
node --input-type=commonjs <<'JS'
const fs=require('node:fs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.name!=='OneMedia' || pkg.scripts?.build!=='vite build' || !fs.existsSync('vite.config.ts')) {
  console.error('D13N_WRONG_PROJECT_ROOT__FRONTEND_ONEMEDIA_ONLY');process.exit(64);
}
for(const file of ['src/components/DoohPlayerInventoryReadOnly.tsx','src/components/DoohPlayerDetailReadOnly.tsx',
  'src/lib/doohPlayerInventoryContract.ts','src/lib/doohPlayerDetailContract.ts','src/lib/doohPlayerReadFailure.ts',
  'tools/dooh-ui/d13n/playwright.config.ts']) {
 if(!fs.statSync(file).isFile()) {console.error('D13N_MISSING_APPROVED_FRONTEND_BASELINE');process.exit(65);}
}
JS
if [[ ! -x node_modules/.bin/playwright || ! -x node_modules/.bin/vite ]]; then
  echo 'D13N_FRONTEND_DEPENDENCIES_NOT_INSTALLED: execute npm ci na pasta OneMedia e repita' >&2
  exit 66
fi
# Preserve D13L contract checks + actual Vite production build.
bash scripts/run-d13l-dooh-operational-safety-qa.sh
# Starts Vite ONLY on 127.0.0.1:41741. Synthetic HTTP GET intercepted by Playwright.
./node_modules/.bin/playwright test --config tools/dooh-ui/d13n/playwright.config.ts
printf '\nD13N_FRONTEND_BROWSER_READ_ONLY_QA_PASS__PRODUCTION_NO_GO\n'
