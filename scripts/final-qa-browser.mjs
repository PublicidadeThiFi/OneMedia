#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { QaReport, assertRemoteAllowed, isExpectedSpaDocumentFallback, redactUrl } from './final-qa-lib.mjs';

const report = new QaReport('OneMedia Frontend — Final QA Browser SAFE');
const baseUrl = String(process.env.QA_WEB_BASE_URL || '').trim().replace(/\/$/, '');
if (!baseUrl) throw new Error('Defina QA_WEB_BASE_URL.');
assertRemoteAllowed(baseUrl);
const baseOrigin = new URL(baseUrl).origin;
const mediaMapUrl = String(process.env.QA_MEDIA_MAP_URL || '').trim();

function findChrome() {
  const configured = String(process.env.CHROME_BIN || '').trim();
  const candidates = [configured, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes('/') && fs.existsSync(candidate)) return candidate;
    const found = spawnSync('bash', ['-lc', `command -v ${JSON.stringify(candidate)} 2>/dev/null`], { encoding: 'utf8' }).stdout.trim();
    if (found) return found;
  }
  return null;
}

class ChromePipe {
  constructor(bin) {
    this.pending = new Map();
    this.waiters = [];
    this.id = 0;
    this.buffer = Buffer.alloc(0);
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onemedia-final-qa-'));
    this.userDataDir = userDataDir;
    this.child = spawn(bin, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-pipe', `--user-data-dir=${userDataDir}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
    this.writePipe = this.child.stdio[3];
    this.readPipe = this.child.stdio[4];
    this.readPipe.on('data', (chunk) => this.onData(chunk));
    this.child.on('exit', (code) => {
      for (const { reject } of this.pending.values()) reject(new Error(`Chrome encerrou com código ${code}`));
      this.pending.clear();
    });
  }
  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let index;
    while ((index = this.buffer.indexOf(0)) >= 0) {
      const raw = this.buffer.subarray(0, index).toString('utf8').trim();
      this.buffer = this.buffer.subarray(index + 1);
      if (!raw) continue;
      let msg; try { msg = JSON.parse(raw); } catch { continue; }
      if (msg.id && this.pending.has(msg.id)) {
        const waiter = this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? waiter.reject(new Error(msg.error.message || JSON.stringify(msg.error))) : waiter.resolve(msg.result || {});
        continue;
      }
      if (msg.method) {
        const remaining = [];
        for (const waiter of this.waiters) {
          if (waiter.method === msg.method && (!waiter.sessionId || waiter.sessionId === msg.sessionId)) waiter.resolve(msg.params || {});
          else remaining.push(waiter);
        }
        this.waiters = remaining;
        this.onEvent?.(msg);
      }
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.writePipe.write(Buffer.concat([Buffer.from(JSON.stringify(payload)), Buffer.from([0])]));
    });
  }
  waitEvent(method, sessionId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((x) => x.resolve !== wrappedResolve);
        reject(new Error(`Timeout aguardando ${method}`));
      }, timeoutMs);
      const wrappedResolve = (value) => { clearTimeout(timer); resolve(value); };
      this.waiters.push({ method, sessionId, resolve: wrappedResolve });
    });
  }
  async close() {
    try { await this.send('Browser.close'); } catch {}
    await sleep(250);
    if (!this.child.killed) this.child.kill('SIGKILL');
    fs.rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

const chromeBin = findChrome();
if (!chromeBin) throw new Error('Chrome/Chromium não encontrado. Defina CHROME_BIN.');
const chrome = new ChromePipe(chromeBin);
let sessionId;
try {
  await sleep(500);
  const target = await chrome.send('Target.createTarget', { url: 'about:blank' });
  const attached = await chrome.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  sessionId = attached.sessionId;
  await Promise.all([
    chrome.send('Page.enable', {}, sessionId), chrome.send('Runtime.enable', {}, sessionId), chrome.send('Network.enable', {}, sessionId), chrome.send('Log.enable', {}, sessionId),
  ]);
  let networkEvents = [];
  let consoleErrors = [];
  chrome.onEvent = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Network.responseReceived') networkEvents.push({ url: msg.params?.response?.url, status: msg.params?.response?.status, type: msg.params?.type });
    if (msg.method === 'Network.loadingFailed') networkEvents.push({ url: msg.params?.url, status: 0, error: msg.params?.errorText, type: msg.params?.type });
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(`exception: ${msg.params?.exceptionDetails?.text || 'unknown'}`);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') consoleErrors.push('console.error');
    if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') consoleErrors.push(msg.params.entry.text || 'log error');
  };

  async function evaluate(expression) {
    const result = await chrome.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate falhou');
    return result.result?.value;
  }

  async function visit(name, url, viewport, expectations = {}) {
    networkEvents = []; consoleErrors = [];
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile }, sessionId);
    const loaded = chrome.waitEvent('Page.loadEventFired', sessionId, 20000).catch(() => null);
    await chrome.send('Page.navigate', { url }, sessionId);
    await loaded;
    await sleep(Number(process.env.QA_BROWSER_SETTLE_MS || 2500));
    const state = await evaluate(`(() => ({
      href: location.href,
      pathname: location.pathname,
      title: document.title,
      bodyText: (document.body?.innerText || '').slice(0, 5000),
      root: Boolean(document.getElementById('root')),
      brokenImages: Array.from(document.images).filter(img => img.complete && img.naturalWidth === 0).map(img => img.currentSrc || img.src).slice(0, 20),
      maps: Array.from(document.querySelectorAll('.leaflet-container')).map(el => ({width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height})),
      mediaCount: document.querySelectorAll('img,video').length,
      videoCount: document.querySelectorAll('video').length,
      hasProposalCta: (document.body?.innerText || '').includes('Solicitar proposta'),
      errorBoundary: (document.body?.innerText || '').includes('Algo deu errado ao carregar o app'),
      loadingStuck: (document.body?.innerText || '').trim() === 'Carregando aplicativo…'
    }))()`);
    const expectedSpaFallbacks = networkEvents.filter((event) => isExpectedSpaDocumentFallback(event, url, baseOrigin));
    const badNetwork = networkEvents.filter((event) => {
      if (!event.url) return false;
      if (isExpectedSpaDocumentFallback(event, url, baseOrigin)) return false;
      let sameOrigin = false;
      try { sameOrigin = new URL(event.url).origin === baseOrigin || new URL(event.url).hostname === 'api.onemediaap.com.br'; } catch {}
      return sameOrigin && ((event.status >= 400) || event.status === 0);
    });
    const brokenSameOrigin = state.brokenImages.filter((src) => { try { const u = new URL(src); return u.origin === baseOrigin || u.hostname === 'api.onemediaap.com.br'; } catch { return true; } });
    const errors = [];
    if (!state.root) errors.push('root ausente');
    if (state.errorBoundary) errors.push('error boundary visível');
    if (state.loadingStuck) errors.push('loading travado');
    if (badNetwork.length) errors.push(`network errors: ${JSON.stringify(badNetwork.slice(0, 8))}`);
    if (brokenSameOrigin.length) errors.push(`imagens quebradas: ${JSON.stringify(brokenSameOrigin.slice(0, 8))}`);
    if (expectations.pathname && state.pathname !== expectations.pathname) errors.push(`pathname=${state.pathname}; esperado=${expectations.pathname}`);
    if (expectations.map && !state.maps.some((m) => m.width > 150 && m.height > 150)) errors.push(`Leaflet sem dimensão útil: ${JSON.stringify(state.maps)}`);
    if (expectations.noProposalCta && state.hasProposalCta) errors.push('CTA Solicitar proposta presente');
    if (expectations.video && state.videoCount < 1) errors.push('nenhum player de vídeo encontrado');
    if (consoleErrors.length) {
      const criticalConsole = consoleErrors.filter((x) => !/favicon|ResizeObserver/i.test(x));
      if (criticalConsole.length) errors.push(`console errors: ${JSON.stringify(criticalConsole.slice(0, 6))}`);
    }
    if (errors.length) {
      report.fail(`${name} (${viewport.width}px)`, { url: url.includes('/mapa/') ? redactUrl(url) : url, errors, state }, 'browser');
      return { ok: false, state };
    }
    report.pass(`${name} (${viewport.width}px)`, { pathname: state.pathname, maps: state.maps.length, mediaCount: state.mediaCount, spaFallback404s: expectedSpaFallbacks.length }, 'browser');
    return { ok: true, state };
  }

  const desktop = { width: 1365, height: 900, mobile: false };
  const mobile = { width: 390, height: 844, mobile: true };
  await visit('Home institucional', `${baseUrl}/home`, desktop, { pathname: '/home' });
  await visit('Marketplace', `${baseUrl}/`, desktop, { pathname: '/' });
  await visit('Busca sem acento', `${baseUrl}/buscar?q=Aguas%20Claras`, desktop, { pathname: '/buscar' });
  await visit('Login marketplace', `${baseUrl}/marketplace/entrar`, desktop, { pathname: '/marketplace/entrar' });
  await visit('Cadastro marketplace', `${baseUrl}/marketplace/cadastro`, desktop, { pathname: '/marketplace/cadastro' });
  await visit('Landing antiga redirecionada', `${baseUrl}/landing-mobile`, mobile, { pathname: '/home' });
  await visit('Home mobile', `${baseUrl}/home`, mobile, { pathname: '/home' });
  await visit('Marketplace mobile', `${baseUrl}/`, mobile, { pathname: '/' });
  if (mediaMapUrl) {
    assertRemoteAllowed(mediaMapUrl);
    const mapDesktop = await visit('Mapa compartilhado', mediaMapUrl, desktop, { map: true, noProposalCta: true });
    if (mapDesktop?.ok) {
      const cardCount = await evaluate(`document.querySelectorAll('.media-map-result-card').length`);
      if (!cardCount) report.fail('Mapa compartilhado possui cards navegáveis', 'Nenhum .media-map-result-card encontrado.', 'media-kit');
      else {
        report.pass('Mapa compartilhado possui cards navegáveis', { total: cardCount }, 'media-kit');
        let galleryFound = false;
        let multiMediaFound = false;
        let videoFound = false;
        for (let index = 0; index < Math.min(cardCount, 8); index += 1) {
          await evaluate(`document.querySelectorAll('.media-map-result-card')[${index}]?.click()`);
          await sleep(350);
          const detail = await evaluate(`(() => ({
            sheet: Boolean(document.querySelector('.media-map-detail-sheet')),
            gallery: Boolean(document.querySelector('.media-map-gallery')),
            segments: document.querySelectorAll('.media-map-gallery-segment').length,
            counter: document.querySelector('.media-map-gallery-counter')?.textContent || ''
          }))()`);
          if (detail.gallery) galleryFound = true;
          if (detail.segments > 1) {
            multiMediaFound = true;
            const counters = [];
            for (let mediaIndex = 0; mediaIndex < Math.min(detail.segments, 8); mediaIndex += 1) {
              await evaluate(`document.querySelectorAll('.media-map-gallery-segment')[${mediaIndex}]?.click()`);
              await sleep(150);
              const mediaState = await evaluate(`(() => ({ counter: document.querySelector('.media-map-gallery-counter')?.textContent || '', video: Boolean(document.querySelector('.media-map-gallery video')) }))()`);
              counters.push(mediaState.counter.trim());
              if (mediaState.video) videoFound = true;
            }
            new Set(counters).size > 1
              ? report.pass('Galeria alterna entre múltiplas mídias', { pointIndex: index, counters }, 'media-kit')
              : report.fail('Segmentos da galeria não alteraram a mídia ativa', { pointIndex: index, counters }, 'media-kit');
            await evaluate(`document.querySelector('[aria-label="Fechar"]')?.click()`);
            break;
          }
          await evaluate(`document.querySelector('[aria-label="Fechar"]')?.click()`);
          await sleep(100);
        }
        galleryFound ? report.pass('Detalhe do ponto abre galeria de mídia', null, 'media-kit') : report.warn('Nenhum dos primeiros pontos possui galeria renderizada', null, 'media-kit');
        if (!multiMediaFound) report.warn('Não foi encontrado ponto com múltiplas mídias para validar segmentos', null, 'media-kit');
        if (multiMediaFound && videoFound) report.pass('Player de vídeo foi renderizado durante navegação da galeria', null, 'media-kit');
        else if (multiMediaFound) report.warn('Ponto multimídia testado não continha vídeo entre os itens percorridos', null, 'media-kit');
      }
    }
    await visit('Mapa compartilhado mobile', mediaMapUrl, mobile, { map: true, noProposalCta: true });
  } else report.skip('Mapa compartilhado no navegador', 'Defina QA_MEDIA_MAP_URL.', 'media-kit');
} finally {
  await chrome.close();
}
report.print();
const payload = await report.write('frontend-browser-safe.json');
if (!payload.summary.ok) process.exitCode = 1;
