import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/login/LoginForm';
import { TwoFactorStep } from '../components/login/TwoFactorStep';
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

  // Safety: some users can arrive here with a stale persisted "blocked" state.
  useEffect(() => {
    clearAccessState();
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

  const buildOAuthUrl = (provider: 'google' | 'outlook') => {
    const base = (publicApiClient.defaults.baseURL as string | undefined) || '/api';
    const normalized = base === '__MISSING_API_BASE_URL__' ? '/api' : base;
    const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/oauth-callback`;
    return `${normalized.replace(/\/$/, '')}/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleSocialLogin = (provider: 'google' | 'outlook') => {
    const url = buildOAuthUrl(provider);
    window.location.href = url;
  };

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
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" role="img">
                  <path fill="#EA4335" d="M23.5 12.3c0-.8-.1-1.6-.3-2.3H12v4.4h6.5c-.3 1.4-1 2.6-2.1 3.4v2.8h3.3c1.9-1.7 3-4.2 3-7.3z" />
                  <path fill="#34A853" d="M12 24c2.7 0 5-.9 6.6-2.5l-3.3-2.8c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4H3.1v2.5C4.6 21.8 7.5 24 12 24z" />
                  <path fill="#FBBC05" d="M6.5 14.7c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V8.2H3.1C2.4 9.5 2 11 2 12.7s.4 3.2 1.1 4.5l3.4-2.5z" />
                  <path fill="#4285F4" d="M12 7.5c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3.8 14.7 2.7 12 2.7 8.5 2.7 5.6 4.9 4.2 8.2l3.4 2.5c.8-2.3 2.9-3.9 5.4-3.9z" />
                </svg>
                Entrar com Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('outlook')}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
              >
                <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5 shrink-0" role="img">
                  <rect x="6" y="6" width="36" height="36" rx="4" fill="#0078D4" />
                  <path fill="#ffffff" d="M13 14h10c4.4 0 7 2.4 7 6.5 0 4.4-2.9 7-7.5 7H16v6.5H13V14zm3 11h6.3c2.8 0 4.4-1.4 4.4-4s-1.5-4-4.3-4H16v8z" />
                </svg>
                Entrar com Outlook
              </button>
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
