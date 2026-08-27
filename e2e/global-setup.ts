import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function globalSetup() {
  execFileSync(process.execPath, [resolve('..', 'backend', 'ooh-manager-api', 'scripts', 'assistant-browser-e2e-fixture.mjs'), 'seed'], {
    cwd: resolve('..', 'backend', 'ooh-manager-api'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
}
