import fs from 'node:fs';

const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || String(Date.now());
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/version.json', JSON.stringify({ version }));
console.log('version.json ->', version);
