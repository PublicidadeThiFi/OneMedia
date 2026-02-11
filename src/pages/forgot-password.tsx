import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../App';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type ForgotPasswordResponse = {
  message?: string;
  retryAfterSeconds?: number;
};

export default function ForgotPassword() {
  const navigate = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading || cooldown > 0) return;

    try {
      setIsLoading(true);
      setInfo(null);

      const response = await publicApiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
        email,
      });

      const msg =
        typeof response.data?.message === 'string' && response.data.message.trim()
          ? response.data.message
          : 'Se existir uma conta para este e-mail, enviaremos um link de redefinição.';

      setInfo(msg);
      toast.success(msg);

      const retry = typeof response.data?.retryAfterSeconds === 'number' ? response.data.retryAfterSeconds : 0;
      if (retry > 0) setCooldown(Math.max(1, Math.min(600, retry)));
    } catch (err) {
      const apiErr = getApiError(err, 'Não foi possível enviar o e-mail. Tente novamente.');
      setInfo(apiErr.message);
      toast.error(apiErr.message);
      if (apiErr.retryAfterSeconds) setCooldown(Math.max(1, Math.min(600, apiErr.retryAfterSeconds)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
          <h1 className="text-2xl font-semibold text-gray-900">Esqueceu sua senha?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Informe seu e-mail. Se existir uma conta, enviaremos um link para redefinir sua senha.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || cooldown > 0}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar link de redefinição'}
            </button>
          </form>

          {info ? <p className="mt-4 text-sm text-gray-700">{info}</p> : null}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium text-sm"
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
