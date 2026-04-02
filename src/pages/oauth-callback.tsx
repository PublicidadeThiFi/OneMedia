import { useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { parseOAuthCallbackParams } from '../lib/oauth';

/**
 * OAuth Callback Page
 *
 * O backend redireciona para esta rota após autenticação via Google:
 *   /oauth-callback?access_token=XXX&refresh_token=YYY
 *
 * Em caso de erro:
 *   /oauth-callback?error=access_denied
 */
export default function OAuthCallback() {
  const navigate = useNavigation();
  const { completeOAuthLogin } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { accessToken, refreshToken, error, errorDescription, next } = parseOAuthCallbackParams();

      if (error) {
        const code = String(error);
        const friendly =
          code === 'OAUTH_ACCESS_DENIED'
            ? 'Você cancelou o login com o Google.'
            : code === 'OAUTH_SESSION_INVALID'
              ? 'Sessão expirada. Tente novamente.'
              : code === 'OAUTH_PROVIDER_DISABLED'
                ? 'Este método de login está desativado no momento.'
                : code === 'OAUTH_PROVIDER_CONFLICT'
                  ? 'Esta conta já está vinculada a outro login social.'
                  : 'Falha ao autenticar com o provedor.';

        const extra = errorDescription ? `\n${String(errorDescription)}` : '';
        setErrorMsg(`${friendly}${extra}`);
        return;
      }

      if (!accessToken || !refreshToken) {
        setErrorMsg('Tokens de autenticação não encontrados na resposta do servidor.');
        return;
      }

      try {
        const me = await completeOAuthLogin({ accessToken, refreshToken });
        if (cancelled) return;

        // Remove tokens/params da URL para evitar vazamentos em histórico.
        window.history.replaceState(null, '', '/oauth-callback');

        // If onboarding isn't completed, force the flow.
        if (me?.onboardingCompleted === false) {
          navigate('/cadastro');
          return;
        }

        // Normal path: honor 'next' param.
        navigate(next || '/app/');
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'Falha ao finalizar autenticação.';
        setErrorMsg(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Falha na autenticação</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Autenticando, aguarde…</p>
      </div>
    </div>
  );
}
