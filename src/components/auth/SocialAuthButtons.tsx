import { buildOAuthStartUrl, type SocialProvider } from '../../lib/oauth';

type Props = {
  next?: string;
  className?: string;
  disabled?: boolean;
};

export function SocialAuthButtons({ next = '/app/', className, disabled }: Props) {
  const go = (provider: SocialProvider) => {
    const url = buildOAuthStartUrl(provider, { next });
    window.location.assign(url);
  };

  return (
    <div className={className ?? ''}>
      <button
        type="button"
        onClick={() => go('google')}
        disabled={disabled}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" role="img">
          <path
            fill="#EA4335"
            d="M23.5 12.3c0-.8-.1-1.6-.3-2.3H12v4.4h6.5c-.3 1.4-1 2.6-2.1 3.4v2.8h3.3c1.9-1.7 3-4.2 3-7.3z"
          />
          <path
            fill="#34A853"
            d="M12 24c2.7 0 5-.9 6.6-2.5l-3.3-2.8c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4H3.1v2.5C4.6 21.8 7.5 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M6.5 14.7c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V8.2H3.1C2.4 9.5 2 11 2 12.7s.4 3.2 1.1 4.5l3.4-2.5z"
          />
          <path
            fill="#4285F4"
            d="M12 7.5c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3.8 14.7 2.7 12 2.7 8.5 2.7 5.6 4.9 4.2 8.2l3.4 2.5c.8-2.3 2.9-3.9 5.4-3.9z"
          />
        </svg>
        Entrar com Google
      </button>

      <button
        type="button"
        onClick={() => go('outlook')}
        disabled={disabled}
        className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5 shrink-0" role="img">
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4" />
          <path
            fill="#ffffff"
            d="M13 14h10c4.4 0 7 2.4 7 6.5 0 4.4-2.9 7-7.5 7H16v6.5H13V14zm3 11h6.3c2.8 0 4.4-1.4 4.4-4s-1.5-4-4.3-4H16v8z"
          />
        </svg>
        Entrar com Outlook
      </button>
    </div>
  );
}
