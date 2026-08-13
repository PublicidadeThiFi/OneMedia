#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export const RESULTS_DIR = path.resolve(process.cwd(), '.qa-results');

export function isTruthy(value) {
  return ['1', 'true', 'yes', 'y', 'sim'].includes(String(value || '').trim().toLowerCase());
}

export function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function assertRemoteAllowed(value, envName = 'QA_ALLOW_PRODUCTION') {
  if (isLocalUrl(value)) return;
  if (!isTruthy(process.env[envName])) throw new Error(`Execução remota bloqueada. Defina ${envName}=true para testar ${value}.`);
  if (!String(value).startsWith('https://')) throw new Error(`Destino remoto precisa usar HTTPS: ${value}`);
}

export class QaReport {
  constructor(name) { this.name = name; this.startedAt = new Date().toISOString(); this.checks = []; }
  add(status, name, details = null, category = 'general') { this.checks.push({ status, name, category, details: details instanceof Error ? details.message : details }); }
  pass(name, details, category) { this.add('PASS', name, details, category); }
  fail(name, details, category) { this.add('FAIL', name, details, category); }
  warn(name, details, category) { this.add('WARN', name, details, category); }
  skip(name, details, category) { this.add('SKIP', name, details, category); }
  summary() {
    const counts = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
    for (const check of this.checks) counts[check.status] += 1;
    return { ...counts, total: this.checks.length, ok: counts.FAIL === 0 };
  }
  print() {
    console.log(`\n=== ${this.name} ===`);
    for (const c of this.checks) console.log(`${c.status} [${c.category}] ${c.name}${c.details == null ? '' : ` — ${typeof c.details === 'string' ? c.details : JSON.stringify(c.details)}`}`);
    console.log('\nResumo:', this.summary());
  }
  async write(fileName) {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    const payload = { name: this.name, startedAt: this.startedAt, finishedAt: new Date().toISOString(), summary: this.summary(), checks: this.checks };
    await fs.writeFile(path.join(RESULTS_DIR, fileName), JSON.stringify(payload, null, 2));
    return payload;
  }
}

export async function fetchTimed(url, options = {}, timeoutMs = Number(process.env.QA_HTTP_TIMEOUT_MS || 15000)) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { response, text, latencyMs: Math.round(performance.now() - started) };
  } finally { clearTimeout(timer); }
}

export function redactUrl(value) {
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/(\/mapa\/)[^/]+/, '$1<redacted>');
    url.search = '';
    return url.toString();
  } catch { return '<invalid-url>'; }
}
