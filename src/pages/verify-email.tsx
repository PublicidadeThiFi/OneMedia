import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../App';
import { publicApiClient } from '../lib/apiClient';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type Status = 'loading' | 'success' | 'error';

function extractApiMessage(err: any): string {
  const msg = err?.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return 'Não foi possível confirmar seu e-mail. Tente novamente.';
}

export default function VerifyEmail() {
  const navigate = useNavigation();
  const token = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('token');
  }, []);

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string>('Confirmando seu e-mail...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token de verificação não encontrado. Verifique se você abriu o link completo do e-mail.');
        return;
      }

      setStatus('loading');
      setMessage('Confirmando seu e-mail...');

      try {
        await publicApiClient.post('/auth/verify-email', { token });
        if (cancelled) return;
        setStatus('success');
        setMessage('E-mail confirmado com sucesso! Agora você já pode fazer login.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(extractApiMessage(err));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
          <div className="text-center">
            {status === 'loading' && (
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                <div className="h-7 w-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {status === 'success' && (
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {status === 'error' && (
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900">
              {status === 'loading' && 'Confirmando e-mail'}
              {status === 'success' && 'Tudo certo!'}
              {status === 'error' && 'Não foi possível confirmar'}
            </h1>

            <p className="mt-3 text-gray-600">
              {message}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Ir para Login
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Voltar ao site
              </button>
            </div>

            {status === 'error' && (
              <p className="mt-6 text-xs text-gray-500">
                Se o link expirou, você pode solicitar um novo e-mail de confirmação na tela de login.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
