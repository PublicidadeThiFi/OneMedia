import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function globalTeardown() {
  execFileSync(process.execPath, [resolve('..', 'backend', 'ooh-manager-api', 'scripts', 'assistant-browser-e2e-fixture.mjs'), 'cleanup'], {
    cwd: resolve('..', 'backend', 'ooh-manager-api'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [resolve('..', 'backend', 'ooh-manager-api', 'scripts', 'assistant-browser-e2e-fixture.mjs'), 'verify-clean'], {
    cwd: resolve('..', 'backend', 'ooh-manager-api'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
}
