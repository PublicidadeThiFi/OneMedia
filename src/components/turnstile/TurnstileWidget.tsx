import { useEffect, useRef, useState } from 'react';

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string) => void;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile && typeof window.turnstile.render === 'function') return Promise.resolve();

  const existing = document.querySelector('script[data-turnstile="1"]') as HTMLScriptElement | null;
  if (existing) {
    // If the script is already in the page, wait a bit for it to initialize
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        if (window.turnstile && typeof window.turnstile.render === 'function') return resolve();
        if (Date.now() - startedAt > 8000) return resolve();
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o captcha.'));
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({ siteKey, onToken, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [error, setError] = useState<string | null>(null);

  // Avoid re-mounting the widget when the parent re-renders (e.g. typing in inputs).
  // Using a ref keeps the latest callback without re-triggering the render effect.
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      setError(null);
      try {
        await ensureTurnstileScript();
        if (cancelled) return;

        const turnstile = window.turnstile;
        if (!turnstile || typeof turnstile.render !== 'function') {
          setError('Captcha indisponível.');
          return;
        }

        const el = containerRef.current;
        if (!el) return;

        // Clear previous widget (only when we are explicitly re-mounting, i.e. siteKey change).
        if (widgetIdRef.current && typeof turnstile.remove === 'function') {
          try {
            turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }

        // Some Turnstile implementations may leave DOM nodes behind; clear container once.
        // This prevents stacking multiple widgets when navigating back/forward.
        el.innerHTML = '';

        const id = turnstile.render(el, {
          sitekey: siteKey,
          theme: 'light',
          callback: (token: string) => {
            onTokenRef.current(String(token || ''));
          },
          'expired-callback': () => {
            onTokenRef.current('');
          },
          'error-callback': () => {
            onTokenRef.current('');
            setError('Não foi possível validar o captcha. Tente novamente.');
          },
        });

        widgetIdRef.current = id;
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar o captcha.');
      }
    };

    if (siteKey) mount();

    return () => {
      cancelled = true;
      const turnstile = window.turnstile;
      if (turnstile && widgetIdRef.current && typeof turnstile.remove === 'function') {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
