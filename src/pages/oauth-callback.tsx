import { useEffect, useState } from 'react';
import { useNavigation } from '../App';

/**
 * OAuth Callback Page
 *
 * O backend redireciona para esta rota após autenticação via Google/Outlook:
 *   /oauth-callback?access_token=XXX&refresh_token=YYY
 *
 * Em caso de erro:
 *   /oauth-callback?error=access_denied
 */
export default function OAuthCallback() {
  const navigate = useNavigation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Suporta tokens no query string ou no hash (ex.: #access_token=XXX&refresh_token=YYY)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const accessToken =
      params.get('access_token') ??
      params.get('token') ??
      hashParams.get('access_token') ??
      hashParams.get('token');

    const refreshToken =
      params.get('refresh_token') ?? hashParams.get('refresh_token');

    const error = params.get('error') ?? hashParams.get('error');

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    if (!accessToken) {
      setErrorMsg('Token de acesso não encontrado na resposta do servidor.');
      return;
    }

    // Salva tokens — AuthContext os lê no mount via localStorage
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

    // Limpa a URL e manda para o app
    window.history.replaceState(null, '', '/oauth-callback');
    navigate('/app');
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
