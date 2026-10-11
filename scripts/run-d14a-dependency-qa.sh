#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node - <<'NODE'
const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8'));
if(p.name!=='OneMedia'||p.dependencies.axios!=='1.20.0') throw Error('D14A_FRONTEND_PACKAGE_BASELINE_MISMATCH');
console.log('D14A_FRONTEND_PACKAGE_GUARD_PASS');
NODE
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
node - <<'NODE'
const fs=require('fs'),l=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
if(l.packages['node_modules/axios']?.version!=='1.20.0'||l.packages[''].dependencies.axios!=='1.20.0') throw Error('D14A_FRONTEND_LOCK_MISMATCH');
console.log('D14A_FRONTEND_LOCK_GUARD_PASS');
NODE
npm ci --no-audit --no-fund
npm run security:scan
npm run security:audit
npm run build
printf '\nD14A_FRONTEND_DEPS_LOCAL_QA_PASS__PRODUCTION_NO_GO\n'
printf 'IMPORTANTE: inclua package.json E package-lock.json no commit; CI usa npm ci.\n'
