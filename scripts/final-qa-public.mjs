#!/usr/bin/env node
import { QaReport, assertRemoteAllowed, fetchTimed, redactUrl } from './final-qa-lib.mjs';

const report = new QaReport('OneMedia Frontend — Final QA HTTP SAFE');
const baseUrl = String(process.env.QA_WEB_BASE_URL || process.env.MARKETPLACE_WEB_BASE_URL || '').trim().replace(/\/$/, '');
if (!baseUrl) throw new Error('Defina QA_WEB_BASE_URL.');
assertRemoteAllowed(baseUrl);
const routes = [
  '/', '/home', '/buscar?q=Aguas%20Claras', '/marketplace/entrar', '/marketplace/cadastro',
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
    const { response, text, latencyMs } = await fetchTimed(`${baseUrl}${route}`, { redirect: 'manual', headers: { 'User-Agent': 'OneMedia-Final-QA-Safe/1.0' } });
    const html = /text\/html/i.test(response.headers.get('content-type') || '') || text.includes('<!doctype html');
    const root = text.includes('id="root"') || text.includes("id='root'");
    if (response.status >= 200 && response.status < 400 && html && root) report.pass(`HTTP ${route}`, { status: response.status, latencyMs }, 'routes');
    else report.fail(`HTTP ${route}`, { status: response.status, latencyMs, html, root, body: text.slice(0, 180) }, 'routes');
  } catch (error) {
    report.fail(`HTTP ${route}`, error instanceof Error ? error.message : String(error), 'routes');
  }
}
report.print();
const payload = await report.write('frontend-http-safe.json');
if (!payload.summary.ok) process.exitCode = 1;
