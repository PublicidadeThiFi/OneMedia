import { expect, test, type Page, type Route } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

type ImportRow = {
  rowId: string;
  sourceIndex: number;
  selected: boolean;
  deleted?: boolean;
  status: string;
  originalData: Record<string, unknown>;
  normalizedData: Record<string, unknown>;
  fieldResults: Array<{ field: string; status: string }>;
  duplicateCandidates: unknown[];
  warnings: string[];
  errors: string[];
  changes: unknown[];
  executionResult?: { status: string; message: string; attempt: number };
};

const sessionId = 'e2e-persistent-session';
const rows: ImportRow[] = [
  { rowId: 'row-a', sourceIndex: 0, selected: true, status: 'valid', originalData: { contactName: 'Cliente E2E Alpha' }, normalizedData: { contactName: 'Cliente E2E Alpha', email: 'alpha@e2e.invalid' }, fieldResults: [], duplicateCandidates: [], warnings: [], errors: [], changes: [] },
  { rowId: 'row-b', sourceIndex: 1, selected: true, status: 'valid', originalData: { contactName: 'Cliente E2E Beta' }, normalizedData: { contactName: 'Cliente E2E Beta', phone: '61000000000' }, fieldResults: [], duplicateCandidates: [], warnings: [], errors: [], changes: [] },
  { rowId: 'row-invalid', sourceIndex: 2, selected: false, status: 'invalid', originalData: {}, normalizedData: {}, fieldResults: [{ field: 'contactName', status: 'invalid' }], duplicateCandidates: [], warnings: [], errors: ['Valor invÃ¡lido [email protegido]'], changes: [], executionResult: { status: 'failed', message: 'Valor invÃ¡lido [email protegido]', attempt: 1 } },
];

function responseSession(status = 'ready_for_confirmation') {
  const visible = rows.filter((row) => !row.deleted);
  return {
    sessionId,
    version: 1,
    companyReference: 'company-e2e',
    userReference: 'user-e2e',
    importType: 'clients',
    sourceFile: { name: 'clientes-e2e.csv', extension: 'csv', size: 128, sourceType: 'spreadsheet', fileHash: 'e2e-hash', extractorVersion: 'clients-v1' },
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    rows,
    summary: { total: visible.length, valid: visible.filter((r) => r.status === 'valid').length, warnings: 0, invalid: visible.filter((r) => r.status === 'invalid').length, possibleDuplicates: 0, selected: visible.filter((r) => r.selected).length, notSelected: visible.filter((r) => !r.selected).length, withImage: 0, withoutImage: visible.length, withoutGeocoding: visible.length },
    warnings: [],
    blockingIssues: [],
    persistence: 'postgresql',
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installApi(page: Page) {
  const observed: string[] = [];
  let executeCalls = 0;
  await page.addInitScript(() => {
    sessionStorage.setItem('access_token', 'e2e-access-token');
    sessionStorage.setItem('refresh_token', 'e2e-refresh-token');
    sessionStorage.setItem('auth_persistence', 'session');
  });
  await page.route('http://127.0.0.1:43331/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api(?=\/)/, '');
    observed.push(`${request.method()} ${path}`);
    if (request.method() === 'POST' && path === '/clients') return json(route, { error: 'legacy endpoint forbidden' }, 599);
    if (path === '/auth/me') return json(route, { id: 'user-e2e', companyId: 'company-e2e', name: 'Navegador E2E', email: 'browser@e2e.invalid', roles: ['ADMINISTRATIVO'], onboardingCompleted: true });
    if (path === '/ai/upload') return json(route, { domain: 'clients', sourceType: 'spreadsheet', clients: rows.slice(0, 2).map((row) => row.normalizedData) });
    if (path === '/assistant/imports/sessions' && request.method() === 'POST') return json(route, responseSession());
    if (path === '/assistant/imports/sessions') return json(route, responseSession(executeCalls ? 'completed' : 'ready_for_confirmation'));
    if (path.endsWith('/rows/edit')) {
      const body = request.postDataJSON() as { rowId: string; field: string; value: unknown };
      const row = rows.find((item) => item.rowId === body.rowId);
      if (row) row.normalizedData[body.field] = body.value;
      return json(route, responseSession());
    }
    if (path.endsWith('/rows/select')) {
      const body = request.postDataJSON() as { rowIds: string[]; selected: boolean };
      rows.filter((row) => body.rowIds.includes(row.rowId)).forEach((row) => { row.selected = body.selected; });
      return json(route, responseSession());
    }
    if (path.endsWith('/rows/remove')) {
      const body = request.postDataJSON() as { rowId: string; deleted: boolean };
      const row = rows.find((item) => item.rowId === body.rowId);
      if (row) row.deleted = body.deleted;
      return json(route, responseSession());
    }
    if (path.endsWith('/confirm')) return json(route, { confirmationId: 'confirmation-e2e' });
    if (path.endsWith('/execute')) {
      executeCalls += 1;
      rows.filter((row) => row.selected && !row.deleted).forEach((row) => { row.status = 'success'; row.selected = false; row.executionResult = { status: 'success', message: 'Cliente criado', attempt: 1 }; });
      return json(route, { ...responseSession('completed'), progress: { total: 1, processed: 1, successes: 1, failures: 0, skipped: 0, percent: 100, elapsedMs: 10, cancellable: false } });
    }
    if (path.endsWith('/retry')) return json(route, responseSession());
    return json(route, []);
  });
  return { observed, executeCalls: () => executeCalls };
}

test('persistent client import runs full-stack and resumes without duplicate writes', async ({ page }) => {
  const observed: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:43331') observed.push(`${request.method()} ${url.pathname.replace(/^\/api(?=\/)/, '')}`);
  });
  await page.route(/openai|gemini|googleapis|telemetry|analytics/i, (route) => route.abort('blockedbyclient'));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/login');
  await page.locator('input[type=email]').fill('assistant-browser-e2e@example.test');
  await page.locator('input[type=password]').fill('AssistantBrowserE2E!2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await page.getByLabel('Abrir assistente OneMedia').click();
  await page.getByLabel('Anexar arquivo').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'clientes-e2e.csv', mimeType: 'text/csv', buffer: Buffer.from('Nome,Email\nAssistant Browser E2E Alpha,alpha@e2e.invalid\nAssistant Browser E2E Beta,beta@e2e.invalid') });
  const uploadResponsePromise = page.waitForResponse((response) => response.url().includes('/ai/upload'));
  await page.getByRole('button', { name: 'Enviar' }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(await uploadResponse.text(), `upload status ${uploadResponse.status()}`).toContain('"domain":"clients"');
  await expect(page.locator('b', { hasText: 'Assistant Browser E2E Alpha' })).toBeVisible();
  await expect(page.locator('b', { hasText: 'Assistant Browser E2E Beta' })).toBeVisible();
  expect(observed).not.toContain('POST /clients');

  const alpha = page.locator('b', { hasText: 'Assistant Browser E2E Alpha' }).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await alpha.getByText('Valores originais e normalizados').click();
  await alpha.getByRole('button', { name: 'Editar' }).first().click();
  const editor = alpha.locator('input:not([type="checkbox"])').first();
  await editor.fill('Assistant Browser E2E Alpha');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/assistant/imports/rows/edit')),
    editor.blur(),
  ]);
  await expect(page.locator('b', { hasText: 'Assistant Browser E2E Alpha' })).toBeVisible();

  const beta = page.locator('b', { hasText: 'Assistant Browser E2E Beta' }).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/assistant/imports/rows/remove')),
    beta.getByRole('button', { name: 'Excluir' }).click(),
  ]);
  await expect(page.getByText('Registro removido')).toBeVisible();
  const confirm = page.getByRole('button', { name: /Confirmar import/ });
  await confirm.dblclick();
  await expect(page.getByText(/1 sucessos/)).toBeVisible();
  expect(observed.filter((entry) => entry === 'POST /assistant/imports/execute')).toHaveLength(1);
  expect(observed).not.toContain('POST /clients');
  const persistedSessionId = await page.evaluate(() => localStorage.getItem('assistant:persistent-client-import-session'));
  expect(persistedSessionId).toBeTruthy();

  execFileSync(process.execPath, [resolve('..', 'backend', 'ooh-manager-api', 'scripts', 'assistant-browser-e2e-fixture.mjs'), 'force-retry', persistedSessionId!], {
    cwd: resolve('..', 'backend', 'ooh-manager-api'), env: { ...process.env, NODE_ENV: 'test' }, stdio: 'inherit',
  });

  await page.reload();
  await page.getByLabel('Abrir assistente OneMedia').click();
  await expect(page.getByRole('button', { name: /Preparar somente as falhas/ })).toBeVisible();
  await page.getByRole('button', { name: /Preparar somente as falhas/ }).click();
  await page.getByRole('button', { name: /Confirmar import/ }).click();
  await expect(page.getByText(/1 sucessos/)).toBeVisible();
  expect(observed.filter((entry) => entry === 'GET /assistant/imports/sessions').length).toBeGreaterThan(0);
  expect(observed).not.toContain('POST /clients');
  const evidence = JSON.parse(execFileSync(process.execPath, [resolve('..', 'backend', 'ooh-manager-api', 'scripts', 'assistant-browser-e2e-fixture.mjs'), 'evidence'], {
    cwd: resolve('..', 'backend', 'ooh-manager-api'), env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8',
  })) as { clientCount: number; totalCompanyClients: number };
  expect(evidence).toEqual({ clientCount: 1, totalCompanyClients: 1 });
});

test('legacy telemetry is PII-free and persistent failures never fall back automatically', async ({ page }) => {
  const events: unknown[] = [];
  await page.addInitScript(() => window.addEventListener('assistant:legacy-import-used', (event) => (window as Window & { legacyEvents?: unknown[] }).legacyEvents = [...((window as Window & { legacyEvents?: unknown[] }).legacyEvents ?? []), (event as CustomEvent).detail]));
  const api = await installApi(page);
  await page.goto('/app/');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('assistant:legacy-import-used', { detail: { flow: 'assistant_client_import', adapter: 'legacy', containsPii: false } })));
  events.push(...await page.evaluate(() => (window as Window & { legacyEvents?: unknown[] }).legacyEvents ?? []));
  expect(JSON.stringify(events)).not.toMatch(/@|\d{11,14}/);
  expect(events).toEqual([{ flow: 'assistant_client_import', adapter: 'legacy', containsPii: false }]);
  expect(api.observed).not.toContain('POST /clients');
});
