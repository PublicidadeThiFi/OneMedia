import {
  appendInternalReturnUrl,
  currentInternalUrl,
  readInternalReturnUrl,
  safeInternalReturnUrl,
} from './internalReturnUrl';

export function safeMarketplaceReturnUrl(
  value: string | null | undefined,
  fallback = '/marketplace/solicitacoes',
) {
  return safeInternalReturnUrl(value, fallback);
}

export function readMarketplaceReturnUrl(fallback = '/marketplace/solicitacoes') {
  return readInternalReturnUrl(fallback);
}

export function currentMarketplaceReturnUrl(fallback = '/') {
  return currentInternalUrl(fallback);
}

export function buildMarketplaceLoginPath(returnUrl = currentMarketplaceReturnUrl('/')) {
  return appendInternalReturnUrl('/marketplace/entrar', returnUrl);
}

export function buildMarketplaceSignupPath(returnUrl = currentMarketplaceReturnUrl('/')) {
  return appendInternalReturnUrl('/marketplace/cadastro', returnUrl);
}
