import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`[phase5] Ausente: ${label}`);
  }
}

const [apiClient, marketplaceApi, enterpriseReset, marketplaceReset, marketplaceHeader, pointCard, pointPage, pricing] = await Promise.all([
  read('src/lib/apiClient.ts'),
  read('src/lib/marketplaceAccountApi.ts'),
  read('src/pages/reset-password.tsx'),
  read('src/pages/marketplace-reset-password.tsx'),
  read('src/components/marketplace/MarketplaceHeader.tsx'),
  read('src/components/marketplace/MarketplacePointCard.tsx'),
  read('src/pages/marketplace-point.tsx'),
  read('src/components/landing/Pricing.tsx'),
]);

assertContains(apiClient, 'isRefreshRequest', 'proteção contra recursão do refresh');
assertContains(apiClient, 'Resposta de renovação de sessão incompleta.', 'validação dos tokens empresariais rotacionados');
assertContains(marketplaceApi, 'Resposta de renovação da sessão do marketplace incompleta.', 'validação dos tokens marketplace rotacionados');
assertContains(enterpriseReset, '/auth/reset-password/validate', 'validação prévia do link empresarial');
assertContains(enterpriseReset, 'Mostrar confirmação de senha', 'controle de visibilidade empresarial');
assertContains(marketplaceReset, 'validateMarketplacePasswordResetToken', 'validação prévia do link marketplace');
assertContains(marketplaceReset, 'Mostrar confirmação de senha', 'controle de visibilidade marketplace');
assertContains(marketplaceHeader, 'marketplace-header__account-menu', 'menu compacto da conta');
assertContains(pointCard, 'Adicionado aos favoritos.', 'feedback de favorito nos cards');
assertContains(pointPage, 'Removido dos favoritos.', 'feedback de favorito no detalhe');
assertContains(pricing, 'Planos com 1 mês gratuito', 'acentuação dos planos');

console.log('[phase5] Verificação estática concluída com sucesso.');
