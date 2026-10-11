/** D13N Playwright UI: production React components, synthetic HTTP, no backend or DB. */
import { test, expect, type Page } from '@playwright/test';

const PRIVATE_TEST_MARKER = 'D13N_PRIVATE_METADATA_MUST_NOT_DISPLAY';
const seenMethods: string[] = [];

type Life = 'ACTIVE' | 'INACTIVE' | 'RETIRED';
type Item = { id: string; name: string; platform: string; lifecycleStatus: Life; online: boolean;
  lastSeenAt: string | null; appVersion: string | null; currentManifestVersion: string;
  desiredManifestVersion: string; currentAssignment: unknown };
function player(id: string, name: string, lifecycleStatus: Life, online: boolean): Item {
  return { id, name, platform: 'ANDROID', lifecycleStatus, online,
    lastSeenAt: online ? '2026-10-11T10:00:00.000Z' : null, appVersion: '1.0.0',
    currentManifestVersion: '1', desiredManifestVersion: '2',
    currentAssignment: id === 'player-a' ? {
      id: 'assignment-a', mediaUnit: { id: 'screen-a', label: 'Tela A', unitType: 'SCREEN', isActive: true },
    } : null };
}
const base: Item[] = [player('player-a','Alpha','ACTIVE',true),
  player('player-b','Bravo','ACTIVE',false), player('player-c','Charlie','INACTIVE',false)];
function inventory(url: URL, source: Item[] = base) {
  let filtered = [...source];
  const life = url.searchParams.get('lifecycleStatus');
  const online = url.searchParams.get('online');
  const search = url.searchParams.get('q')?.toLowerCase();
  if (life) filtered = filtered.filter(item => item.lifecycleStatus === life);
  if (online === 'true' || online === 'false') filtered = filtered.filter(item => item.online === (online === 'true'));
  if (search) filtered = filtered.filter(item => `${item.name} ${item.platform}`.toLowerCase().includes(search));
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = 20;
  const total = filtered.length;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize).map(item => ({ ...item,
    installationId: PRIVATE_TEST_MARKER, metadata: { secret: PRIVATE_TEST_MARKER } })),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), offlineAfterSeconds: 180 } };
}
function detail(item: Item) {
  return { ...item, offlineAfterSeconds: 180, groups: [],
    currentAssignment: item.id === 'player-a' ? { id: 'assignment-a', mediaUnit: {
      id: 'screen-a', label: 'Tela A', unitType: 'SCREEN', isActive: true, mediaPoint: { name: 'Ponto A' },
    } } : null,
    credential: { active: true, lastUsedAt: null, secretHash: PRIVATE_TEST_MARKER, id: PRIVATE_TEST_MARKER },
    manifestCount: 1, commandCount: 0, playbackEventCount: 0,
    installationId: PRIVATE_TEST_MARKER, metadata: { secret: PRIVATE_TEST_MARKER },
  };
}

async function setup(page: Page, opts: { status?: number; invalid?: boolean; source?: Item[] } = {}) {
  await page.route('**/api/dooh/players**', async route => {
    const req = route.request();
    seenMethods.push(req.method());
    const url = new URL(req.url());
    if (req.method() !== 'GET') throw new Error('D13N_READ_ONLY_HTTP_VIOLATION');
    const match = url.pathname.match(/\/players\/([^/]+)$/);
    if (opts.status) {
      await route.fulfill({ status: opts.status, contentType: 'application/json', body: JSON.stringify({ message: PRIVATE_TEST_MARKER }) });
      return;
    }
    if (opts.invalid) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{installationId: PRIVATE_TEST_MARKER}], meta: {} }) });
      return;
    }
    const item = match ? (opts.source || base).find(x => x.id === decodeURIComponent(match[1])) : undefined;
    await route.fulfill({ status: item || !match ? 200 : 404, contentType: 'application/json',
      body: JSON.stringify(match ? (item ? detail(item) : { message: PRIVATE_TEST_MARKER }) : inventory(url, opts.source)) });
  });
  await page.goto('/');
}

test.beforeEach(() => { seenMethods.length = 0; });

test('01 shows the inventory with real component and no private fields', async ({page}) => {
  await setup(page);
  await expect(page.getByText('Alpha', {exact:true})).toBeVisible();
  await expect(page.getByText('Bravo', {exact:true})).toBeVisible();
  await expect(page.getByText('3 player(s) no filtro')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(PRIVATE_TEST_MARKER);
});

test('02 ACTIVE offline remains licensed and is not displayed as operational', async ({page}) => {
  await setup(page);
  const row = page.getByRole('row').filter({hasText:'Bravo'});
  await expect(row).toContainText('ACTIVE');
  await expect(row).toContainText('Sem heartbeat recente');
  await expect(row).not.toContainText('Não operacional');
});

test('03 connectivity false filters inactive and active offline correctly', async ({page}) => {
  await setup(page);
  await page.getByLabel('Conectividade').selectOption('false');
  await expect(page.getByText('2 player(s) no filtro')).toBeVisible();
  await expect(page.getByText('Bravo', {exact:true})).toBeVisible();
  await expect(page.getByText('Charlie', {exact:true})).toBeVisible();
  await expect(page.getByText('Alpha', {exact:true})).toHaveCount(0);
});

test('04 detail shows sanitized technical diagnostics; closing hides them', async ({page}) => {
  await setup(page);
  await page.getByRole('button', {name:'Ver detalhes de Alpha'}).click();
  await expect(page.getByRole('region', {name:'Detalhes técnicos do player'})).toBeVisible();
  await expect(page.getByText('Ponto A')).toBeVisible();
  await expect(page.getByText('Versões de manifest divergentes; sincronização técnica pendente de verificação.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(PRIVATE_TEST_MARKER);
  await page.getByRole('button', {name:'Fechar detalhes'}).click();
  await expect(page.getByRole('region', {name:'Detalhes técnicos do player'})).toHaveCount(0);
});

test('05 filter changes hide a selected detail panel and remove old rows', async ({page}) => {
  await setup(page);
  await page.getByRole('button', {name:'Ver detalhes de Alpha'}).click();
  await expect(page.getByRole('region', {name:'Detalhes técnicos do player'})).toBeVisible();
  await page.getByLabel('Ciclo de vida').selectOption('INACTIVE');
  await expect(page.getByText('Charlie', {exact:true})).toBeVisible();
  await expect(page.getByRole('region', {name:'Detalhes técnicos do player'})).toHaveCount(0);
});

test('06 a denied role does not initiate another DOOH GET', async ({page}) => {
  await setup(page);
  await expect(page.getByText('Alpha', {exact:true})).toBeVisible();
  const before = seenMethods.length;
  await page.evaluate(() => (window as any).__d13nSetContext({roles:['FINANCEIRO']}));
  await expect(page.getByText(/Nenhum dado foi solicitado/)).toBeVisible();
  await expect(page.getByText('Alpha', {exact:true})).toHaveCount(0);
  await page.waitForTimeout(100);
  expect(seenMethods.length).toBe(before);
});

test('07 mismatched company snapshots close the view and never expose stale data', async ({page}) => {
  await setup(page);
  await expect(page.getByText('Alpha', {exact:true})).toBeVisible();
  await page.evaluate(() => (window as any).__d13nSetContext({companyId:'D13N-B'}));
  await expect(page.getByText(/Nenhum dado foi solicitado/)).toBeVisible();
  await expect(page.getByText('Alpha', {exact:true})).toHaveCount(0);
});

test('08 403 and 503 return fixed sanitized errors, never server messages', async ({page}) => {
  await setup(page, {status:403});
  await expect(page.getByRole('alert')).toContainText('Consulta não autorizada');
  await expect(page.locator('body')).not.toContainText(PRIVATE_TEST_MARKER);
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/api/dooh/players**', route => route.fulfill({status:503, contentType:'application/json',body:JSON.stringify({message:PRIVATE_TEST_MARKER})}));
  await page.getByRole('button', {name:'Atualizar'}).click();
  await expect(page.getByRole('alert')).toContainText('Serviço DOOH temporariamente indisponível');
  await expect(page.locator('body')).not.toContainText(PRIVATE_TEST_MARKER);
});

test('09 bad inventory fails closed instead of displaying incomplete data', async ({page}) => {
  await setup(page, {invalid:true});
  await expect(page.getByRole('alert')).toContainText('Resposta do inventário DOOH incompatível');
  await expect(page.getByRole('button',{name:/Ver detalhes de/})).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(PRIVATE_TEST_MARKER);
});

test('10 pagination and user search keep the interface read-only', async ({page}) => {
  const source = [...base, ...Array.from({length:21}, (_,i)=>player(`extra-${i}`,`Extra ${i}`,'ACTIVE',false))];
  await setup(page, {source});
  await expect(page.getByText('24 player(s) no filtro')).toBeVisible();
  await page.getByRole('button',{name:'Próxima'}).click();
  await expect(page.getByText('página 2 de 2')).toBeVisible();
  await page.getByLabel('Buscar player').fill('Alpha');
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await expect(page.getByText('1 player(s) no filtro')).toBeVisible();
  await expect(page.getByText('Alpha', {exact:true})).toBeVisible();
  expect(seenMethods.every(m => m === 'GET')).toBe(true);
});
