import { escapeCsvValue } from './csv';
import { buildDashboardBackendQuery, toQueryString } from './query';

let didRun = false;

function isEnabled(): boolean {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('dashboardQa');
    if (qp === '1' || qp === 'true') return true;
    return window.localStorage.getItem('dashboard.qa') === '1';
  } catch {
    return false;
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

/**
 * Lightweight DEV-only checks (no jest/vitest required).
 * Enable via:
 * - localStorage.setItem('dashboard.qa','1')
 * - ?dashboardQa=1
 */
export function runDashboardQaChecksOnce() {
  if (didRun) return;
  if (typeof window === 'undefined') return;
  if (!isEnabled()) return;
  didRun = true;

  try {
    // CSV escaping
    assert(escapeCsvValue('abc') === 'abc', 'escapeCsvValue basic');
    assert(escapeCsvValue('a;b').includes('"'), 'escapeCsvValue delimiter');
    assert(escapeCsvValue('a\n b').includes('"'), 'escapeCsvValue newline');

    // Query builder trimming + omission
    const q = buildDashboardBackendQuery({ datePreset: '30d', query: '  hello  ', city: '  ', mediaType: 'ALL' });
    assert(q.q === 'hello', 'buildDashboardBackendQuery trims query');
    assert(q.city === undefined, 'buildDashboardBackendQuery omits empty city');

    const qs = toQueryString(q);
    assert(qs.includes('q=hello'), 'toQueryString includes trimmed q');
    assert(!qs.includes('city='), 'toQueryString omits empty city');

    console.info('[dashboard][qa] ok');
  } catch (err) {
    console.error('[dashboard][qa] failed', err);
  }
}
