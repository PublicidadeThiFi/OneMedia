import React from 'react';
import { buildOAuthStartUrl } from '../../lib/oauth';

type Props = {
  /** internal path to go after auth (e.g. "/cadastro" or "/app/") */
  next?: string;
  disabled?: boolean;
  /** Set true only when Microsoft is configured/enabled */
  showOutlook?: boolean;
};

/**
 * Social auth buttons.
 *
 * Observação: por decisão do projeto, o botão do Outlook fica oculto por padrão
 * (o backend pode estar sem as variáveis MICROSOFT_* configuradas).
 */
export function SocialAuthButtons({ next, disabled, showOutlook = false }: Props) {
  const handle = (provider: 'google' | 'outlook') => {
    if (disabled) return;
    const url = buildOAuthStartUrl(provider, { next: next ?? '/app/' });
    window.location.assign(url);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => handle('google')}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.23l6.88-6.88C35.9 2.11 30.36 0 24 0 14.64 0 6.61 5.38 2.66 13.22l8.02 6.23C12.5 13.2 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.64-.14-2.83-.44-4.07H24v7.7h12.74c-.26 2.08-1.68 5.22-4.86 7.32l7.45 5.77c4.44-4.1 6.77-10.14 6.77-14.72z"/>
          <path fill="#FBBC05" d="M10.68 28.45A14.5 14.5 0 0 1 9.9 24c0-1.55.28-3.05.76-4.45l-8.02-6.23A23.94 23.94 0 0 0 0 24c0 3.86.92 7.51 2.55 10.78l8.13-6.33z"/>
          <path fill="#34A853" d="M24 48c6.36 0 11.7-2.09 15.6-5.68l-7.45-5.77c-2 1.4-4.7 2.38-8.15 2.38-6.2 0-11.5-3.7-13.33-8.95l-8.13 6.33C6.61 42.62 14.64 48 24 48z"/>
        </svg>
        Entrar com Google
      </button>

      {showOutlook ? (
        <button
          type="button"
          onClick={() => handle('outlook')}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Entrar com Outlook
        </button>
      ) : null}
    </div>
  );
}
