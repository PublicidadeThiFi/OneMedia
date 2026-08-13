#!/usr/bin/env node
import { QaReport, assertRemoteAllowed, fetchTimed, inspectSpaDocumentResponse, redactUrl } from './final-qa-lib.mjs';

const report = new QaReport('OneMedia Frontend — Final QA HTTP SAFE');
const baseUrl = String(process.env.QA_WEB_BASE_URL || process.env.MARKETPLACE_WEB_BASE_URL || '').trim().replace(/\/$/, '');
if (!baseUrl) throw new Error('Defina QA_WEB_BASE_URL.');
assertRemoteAllowed(baseUrl);

async function fetchText(pathname) {
  return fetchTimed(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'OneMedia-Final-QA-Safe/1.0', Accept: 'text/html,*/*' },
  });
}

// Validate the hosting shell and the explicit GitHub Pages SPA fallback machinery once.
try {
  const { response, text, latencyMs } = await fetchText('/');
  const inspected = inspectSpaDocumentResponse(response.status, response.headers.get('content-type'), text);
  if (response.status === 200 && inspected.mode === 'direct-shell') report.pass('Shell principal HTTP /', { status: response.status, latencyMs }, 'hosting');
  else report.fail('Shell principal HTTP /', { status: response.status, latencyMs, inspected, body: text.slice(0, 180) }, 'hosting');
} catch (error) {
  report.fail('Shell principal HTTP /', error instanceof Error ? error.message : String(error), 'hosting');
}

for (const [pathname, required] of [
  ['/route-redirect.js', ['?p=', 'replace(']],
  ['/route-restore.js', ['URLSearchParams', 'replaceState']],
]) {
  try {
    const { response, text, latencyMs } = await fetchTimed(`${baseUrl}${pathname}`, { redirect: 'manual', headers: { 'User-Agent': 'OneMedia-Final-QA-Safe/1.0' } });
    const missing = required.filter((token) => !text.includes(token));
    if (response.status === 200 && missing.length === 0) report.pass(`Infra SPA ${pathname}`, { status: response.status, latencyMs }, 'hosting');
    else report.fail(`Infra SPA ${pathname}`, { status: response.status, latencyMs, missing }, 'hosting');
  } catch (error) {
    report.fail(`Infra SPA ${pathname}`, error instanceof Error ? error.message : String(error), 'hosting');
  }
}

const routes = [
  '/home', '/buscar?q=Aguas%20Claras', '/marketplace/entrar', '/marketplace/cadastro',
  '/termos', '/privacidade', '/planos', '/landing-mobile', '/cadastro',
];
const mediaMapUrl = String(process.env.QA_MEDIA_MAP_URL || '').trim();
if (mediaMapUrl) {
  const parsed = new URL(mediaMapUrl);
  if (parsed.origin === new URL(baseUrl).origin) routes.push(`${parsed.pathname}${parsed.search}`);
  else report.warn('QA_MEDIA_MAP_URL pertence a outra origem; smoke HTTP será ignorado', redactUrl(mediaMapUrl), 'media-kit');
}

for (const route of routes) {
  try {
    const { response, text, latencyMs } = await fetchText(route);
    const inspected = inspectSpaDocumentResponse(response.status, response.headers.get('content-type'), text);
    if (inspected.ok) {
      report.pass(`Entrada SPA ${route.includes('/mapa/') ? redactUrl(`${baseUrl}${route}`) : route}`, {
        status: response.status,
        latencyMs,
        mode: inspected.mode,
        note: inspected.mode === 'github-pages-spa-fallback' ? '404 esperado do GitHub Pages; resolução final validada no Chrome' : undefined,
      }, 'routes');
    } else {
      report.fail(`Entrada SPA ${route.includes('/mapa/') ? redactUrl(`${baseUrl}${route}`) : route}`, {
        status: response.status,
        latencyMs,
        inspected,
        body: text.slice(0, 180),
      }, 'routes');
    }
  } catch (error) {
    report.fail(`Entrada SPA ${route}`, error instanceof Error ? error.message : String(error), 'routes');
  }
}

report.print();
const payload = await report.write('frontend-http-safe.json');
if (!payload.summary.ok) process.exitCode = 1;
