#!/usr/bin/env node
const baseUrl = String(process.env.MARKETPLACE_WEB_BASE_URL || 'http://localhost:4173').replace(/\/$/, '');
const routes = [
  '/',
  '/home',
  '/buscar?type=OOH',
  '/pontos/ponto-teste',
  '/marketplace/entrar',
  '/marketplace/cadastro',
  '/marketplace/solicitacoes',
  '/marketplace/mensagens',
  '/marketplace/perfil',
  '/mk',
  '/menu',
  '/p/hash-de-teste',
];

let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
    const body = await response.text();
    const ok = response.status >= 200 && response.status < 400 && body.includes('<div id="root">');
    console.log(`${ok ? 'OK' : 'FALHA'} ${response.status} ${route}`);
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.error(`FALHA ${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failed) process.exitCode = 1;
