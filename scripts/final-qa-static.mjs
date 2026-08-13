#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { QaReport } from './final-qa-lib.mjs';

const report = new QaReport('OneMedia Frontend — Final QA Static');
const root = process.cwd();
const read = (file) => fs.readFile(path.join(root, file), 'utf8');
const exists = async (file) => { try { await fs.access(path.join(root, file)); return true; } catch { return false; } };

const pkg = JSON.parse(await read('package.json'));
const reactMajor = Number(String(pkg.dependencies?.react || '').match(/(\d+)/)?.[1] || 0);
const reactTypesMajor = Number(String(pkg.devDependencies?.['@types/react'] || '').match(/(\d+)/)?.[1] || 0);
if (reactMajor && reactTypesMajor && reactMajor !== reactTypesMajor) report.warn('React e @types/react usam majors diferentes', { react: pkg.dependencies.react, types: pkg.devDependencies['@types/react'] }, 'dependencies');
else report.pass('React e @types/react estão alinhados por major', null, 'dependencies');

const app = await read('src/App.tsx');
const expectedRoutes = [
  "case '/':", "case '/home':", "case '/buscar':", "case '/marketplace/entrar':", "case '/marketplace/cadastro':",
  "case '/marketplace/solicitacoes':", "case '/marketplace/mensagens':", "case '/marketplace/perfil':", "case '/termos':",
  "case '/privacidade':", "case '/planos':", "case '/landing-mobile':", "case '/cadastro':",
];
for (const route of expectedRoutes) app.includes(route) ? report.pass(`Rota SPA presente: ${route.replace("case '", '').replace("':", '')}`, null, 'routing') : report.fail(`Rota SPA ausente: ${route}`, null, 'routing');
app.includes('<ReplaceLocationTo path="/home" />') ? report.pass('/landing-mobile é somente redirect para /home', null, 'regression') : report.fail('/landing-mobile não está explicitamente redirecionando para /home', null, 'regression');
app.includes('isEnterpriseSignupEnabled()') && app.includes('ENTERPRISE_SIGNUP_WAITLIST_ORIGIN') ? report.pass('Cadastro empresarial fechado usa fluxo centralizado de waitlist', null, 'regression') : report.fail('Fluxo de cadastro empresarial/waitlist não encontrado', null, 'regression');

const criticalFiles = [
  'src/lib/internalReturnUrl.ts', 'src/lib/marketplaceSignupDraft.ts', 'src/features/media-kit-sharing/MediaKitShareManager.tsx',
  'src/pages/media-map-share.tsx', 'src/pages/media-map-share.css', 'src/components/assistant/AssistantLauncher.tsx',
];
for (const file of criticalFiles) (await exists(file)) ? report.pass(`Arquivo crítico presente: ${file}`, null, 'coverage') : report.fail(`Arquivo crítico ausente: ${file}`, null, 'coverage');

const draft = await read('src/lib/marketplaceSignupDraft.ts').catch(() => '');
if (/password|senha/i.test(draft)) report.fail('Draft do cadastro contém referência a senha', 'O sessionStorage não deve persistir senha/confirmar senha.', 'security');
else report.pass('Draft do cadastro não persiste senha', null, 'security');

const returnUrl = await read('src/lib/internalReturnUrl.ts');
/(origin|window\.location\.origin)/.test(returnUrl) && /startsWith|URL/.test(returnUrl)
  ? report.pass('returnUrl possui validação de destino interno', null, 'security')
  : report.warn('Revisar validação de returnUrl interno', null, 'security');

const mapShare = await read('src/pages/media-map-share.tsx');
mapShare.includes('<video') ? report.pass('Mapa compartilhado renderiza vídeos', null, 'media-kit') : report.fail('Mapa compartilhado não possui player de vídeo', null, 'media-kit');
/Anterior|ChevronLeft|prev/i.test(mapShare) && /Próxim|ChevronRight|next/i.test(mapShare) ? report.pass('Galeria possui navegação anterior/próxima', null, 'media-kit') : report.fail('Galeria não possui navegação completa', null, 'media-kit');
mapShare.includes('Solicitar proposta') ? report.fail('CTA legado "Solicitar proposta" reapareceu no mapa compartilhado', null, 'media-kit') : report.pass('CTA legado "Solicitar proposta" não aparece no mapa compartilhado', null, 'media-kit');
mapShare.includes('resolvePublicMediaAssetUrl') ? report.pass('Mapa compartilhado possui resolução explícita de assets da API', null, 'media-kit') : report.warn('Não foi possível confirmar resolução cross-origin de assets do mapa', null, 'media-kit');

const manager = await read('src/features/media-kit-sharing/MediaKitShareManager.tsx');
for (const token of ['L.map(', 'L.marker(', 'Ver política', 'Regiões específicas']) {
  manager.includes(token) ? report.pass(`MediaKit Share Manager contém: ${token}`, null, 'media-kit') : report.fail(`MediaKit Share Manager não contém: ${token}`, null, 'media-kit');
}
manager.includes('navigator.clipboard') && /copy|copi/i.test(manager) ? report.pass('Compartilhamento trata cópia para clipboard separadamente', null, 'ux') : report.warn('Revisar tratamento do clipboard na criação/regeneração', null, 'ux');

const sourceFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(rel);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) sourceFiles.push(rel);
  }
}
await walk('src');
const todos = [];
const runtimeMocks = [];
for (const file of sourceFiles) {
  const source = await read(file);
  if (/\b(?:TODO|FIXME|HACK)\b/.test(source) && !file.includes('/docs/') && !file.includes('mockData')) todos.push(file);
  if (/from ['"][^'"]*mockData/.test(source) && !file.includes('/lib/mock')) runtimeMocks.push(file);
}
if (todos.length) report.warn('TODO/FIXME/HACK em código de runtime', todos, 'maintainability');
else report.pass('Sem TODO/FIXME/HACK relevante em runtime', null, 'maintainability');
if (runtimeMocks.length) report.warn('Módulos de runtime importam mockData (confirmar se apenas constantes)', runtimeMocks, 'maintainability');
else report.pass('Runtime não depende de mockData', null, 'maintainability');

const apiClient = await read('src/lib/apiClient.ts');
apiClient.includes("if (isDev) return 'http://localhost:3333/api'") ? report.pass('Fallback localhost da API é restrito a desenvolvimento', null, 'config') : report.warn('Revisar fallback de API para localhost', null, 'config');

report.print();
const payload = await report.write('frontend-static.json');
if (!payload.summary.ok) process.exitCode = 1;
