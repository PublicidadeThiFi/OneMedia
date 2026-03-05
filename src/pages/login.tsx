import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/login/LoginForm';
import { TwoFactorStep } from '../components/login/TwoFactorStep';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';
import { LoginCredentials, TwoFactorPayload } from '../types/auth';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import { clearAccessState } from '../lib/accessControl';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type ResendVerificationResponse = {
  message?: string;
  retryAfterSeconds?: number;
};

export default function Login() {
  const navigate = useNavigation();
  const { login, verifyTwoFactor, requiresTwoFactor, pendingEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEmailAttempt, setLastEmailAttempt] = useState<string>('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // OAuth errors can be redirected back to /login (depending on the /oauth-callback behavior).
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const code = p.get('oauth_error') || p.get('error');
      const desc = p.get('oauth_error_description') || p.get('error_description');
      if (!code) return;

      const c = String(code);
      const friendly =
        c === 'OAUTH_ACCESS_DENIED'
          ? 'Você cancelou o login social.'
          : c === 'OAUTH_PROVIDER_CONFLICT'
            ? 'Essa conta do provedor já está vinculada a outra conta. Use o mesmo Google/Outlook utilizado anteriormente.'
            : c === 'OAUTH_EMAIL_ALREADY_IN_USE'
              ? 'Este e-mail já está em uso por outra conta.'
              : c === 'OAUTH_ID_TOKEN_INVALID'
                ? 'Não foi possível validar o login social. Tente novamente.'
                : c === 'OAUTH_SESSION_INVALID'
                  ? 'Sessão do login social expirou. Tente novamente.'
                  : 'Não foi possível autenticar com Google/Outlook.';

      setError((prev) => prev || (desc ? `${friendly}\n${desc}` : friendly));
    } catch {
      // ignore
    }
  }, []);

  // Captcha (Turnstile Managed)
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string>(() => {
    return ((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';
  });

  // Safety: some users can arrive here with a stale persisted "blocked" state.
  useEffect(() => {
    clearAccessState();
  }, []);

  // Prefer getting siteKey from the public config endpoint (same approach used in checkout).
  // Fallback: VITE_TURNSTILE_SITE_KEY.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await publicApiClient.get('/public/menu/config');
        const data = resp?.data as any;
        const key =
          data?.captcha?.siteKey ||
          data?.turnstile?.siteKey ||
          data?.siteKey ||
          data?.captchaSiteKey;

        if (!cancelled && typeof key === 'string' && key.trim()) {
          setCaptchaSiteKey(key.trim());
        }
      } catch {
        // Ignore: env fallback may be used.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Rescue when ACCOUNT_BLOCKED might be stale
  useEffect(() => {
    if (error !== 'ACCOUNT_BLOCKED') return;
    const key = '__one_media_cache_rescue_login__';
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');

    (async () => {
      try {
        clearAccessState();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // ignore
      } finally {
        window.location.replace('/login');
      }
    })();
  }, [error]);

  const currentEmail = useMemo(() => {
    return lastEmailAttempt || pendingEmail || '';
  }, [lastEmailAttempt, pendingEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!currentEmail) return;
    try {
      setResendInfo(null);
      setResendLoading(true);
      const response = await publicApiClient.post<ResendVerificationResponse>('/auth/resend-verification', {
        email: currentEmail,
      });

      const msg =
        typeof response.data?.message === 'string' && response.data.message.trim()
          ? response.data.message
          : 'Se a conta existir e o e-mail ainda não estiver verificado, enviamos uma nova confirmação.';

      setResendInfo(msg);

      const retry =
        typeof response.data?.retryAfterSeconds === 'number'
          ? response.data.retryAfterSeconds
          : 60;
      setResendCooldown(Math.max(1, Math.min(600, retry)));
    } catch (err) {
      const apiErr = getApiError(err, 'Não foi possível reenviar o e-mail. Tente novamente.');
      setResendInfo(apiErr.message);
      if (apiErr.retryAfterSeconds) {
        setResendCooldown(Math.max(1, Math.min(600, apiErr.retryAfterSeconds)));
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setResendInfo(null);
      setLastEmailAttempt(credentials.email);
      setEmailNotVerified(false);
      setIsLoading(true);
      await login(credentials);
    } catch (err) {
      const apiErr = getApiError(err, 'Erro ao fazer login');
      setError(apiErr.message);
      setEmailNotVerified(apiErr.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (payload: TwoFactorPayload) => {
    try {
      setError(null);
      setResendInfo(null);
      setEmailNotVerified(false);
      setIsLoading(true);
      await verifyTwoFactor(payload);
    } catch (err) {
      const apiErr = getApiError(err, 'Erro ao verificar código');
      setError(apiErr.message);
      setEmailNotVerified(apiErr.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFrom2FA = () => {
    setError(null);
  };

  // Optional: allow /login?next=/somewhere to drive post-login routing for SSO.
  // Email/senha login still navigates to /app/ inside AuthContext for compatibility.
  const next = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const n = p.get('next');
      if (!n) return '/app/';
      if (!n.startsWith('/') || n.startsWith('//')) return '/app/';
      return n;
    } catch {
      return '/app/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-9 sm:h-12" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm sm:text-base text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-8 sm:py-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-10">
          {requiresTwoFactor && pendingEmail ? (
            <TwoFactorStep
              email={pendingEmail}
              onSubmit={handleVerifyTwoFactor}
              onBack={handleBackFrom2FA}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <LoginForm
              onSubmit={handleLogin}
              isLoading={isLoading}
              error={error}
              captchaSiteKey={captchaSiteKey}
              errorAction={
                emailNotVerified && currentEmail ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading || resendCooldown > 0}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {resendLoading
                        ? 'Enviando...'
                        : resendCooldown > 0
                          ? `Reenviar em ${resendCooldown}s`
                          : 'Reenviar e-mail de confirmação'}
                    </button>
                    <p className="text-xs text-red-700/80">
                      Confirme o e-mail para liberar o acesso. Verifique também a caixa de spam.
                    </p>
                    {resendInfo ? (
                      <p className="text-xs text-gray-600">{resendInfo}</p>
                    ) : null}
                  </div>
                ) : null
              }
            />
          )}

          {!requiresTwoFactor && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex-1 h-px bg-gray-200" />
                <span>ou</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
              <SocialAuthButtons next={next} disabled={isLoading} />
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center px-2">
          <p className="text-sm text-gray-600">
            Problemas para acessar?{' '}
            <button
              onClick={() => navigate('/contato')}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Entre em contato com o suporte
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
