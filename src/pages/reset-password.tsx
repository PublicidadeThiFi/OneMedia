import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import { getPasswordErrorMessage, PASSWORD_MAX_LENGTH } from '../lib/validators';
import { stripTokenParam } from '../lib/urlSecurity';
import { appendRetryAfter } from '../lib/retryAfter';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type ResetPasswordResponse = {
  message?: string;
};

type TokenState = 'checking' | 'valid' | 'invalid' | 'error';

export default function ResetPassword() {
  const navigate = useNavigation();

  const token = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('token') ?? '';
    } catch {
      return '';
    }
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>(token ? 'checking' : 'invalid');
  const [tokenMessage, setTokenMessage] = useState(
    token ? '' : 'Link de redefinição inválido, expirado ou já utilizado.',
  );
  const [validationAttempt, setValidationAttempt] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      stripTokenParam('/reset-password');
    }

    if (!token) return;
    let cancelled = false;

    void publicApiClient
      .post<{ valid: true }>('/auth/reset-password/validate', { token })
      .then(() => {
        if (!cancelled) setTokenState('valid');
      })
      .catch((error) => {
        if (cancelled) return;
        const apiError = getApiError(
          error,
          'Não foi possível verificar o link agora.',
        );
        setTokenMessage(apiError.message);
        setTokenState(
          apiError.code === 'RESET_TOKEN_INVALID' || apiError.status === 400
            ? 'invalid'
            : 'error',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, validationAttempt]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoading || tokenState !== 'valid') return;

    const passwordError = getPasswordErrorMessage(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await publicApiClient.post<ResetPasswordResponse>('/auth/reset-password', {
        token,
        newPassword,
      });

      const message =
        response.data?.message?.trim() || 'Senha atualizada. Você já pode fazer login.';
      toast.success(message);
      navigate('/login');
    } catch (error) {
      const apiError = getApiError(error, 'Não foi possível redefinir a senha.');
      if (apiError.code === 'RESET_TOKEN_INVALID') {
        setTokenMessage(apiError.message);
        setTokenState('invalid');
      }
      toast.error(appendRetryAfter(apiError.message, apiError.retryAfterSeconds));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center gap-3"
            aria-label="Ir para a página inicial institucional da OneMedia"
          >
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-9 sm:h-12" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm sm:text-base text-gray-700 hover:text-blue-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 sm:py-20">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-10">
          <h1 className="text-2xl font-semibold text-gray-900">Redefinir senha</h1>

          {tokenState === 'checking' ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800" role="status">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              Verificando a validade do link…
            </div>
          ) : null}

          {tokenState === 'error' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
                {tokenMessage}
              </div>
              <button
                type="button"
                onClick={() => {
                  setTokenState('checking');
                  setValidationAttempt((value) => value + 1);
                }}
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Tentar verificar novamente
              </button>
            </div>
          ) : null}

          {tokenState === 'invalid' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                {tokenMessage}
              </div>
              <p className="text-sm text-gray-600">
                Solicite um novo e-mail de recuperação para continuar.
              </p>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Solicitar novo link
              </button>
            </div>
          ) : null}

          {tokenState === 'valid' ? (
            <>
              <p className="mt-2 text-sm text-gray-600">Digite sua nova senha abaixo.</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="enterprise-new-password" className="block text-sm font-medium text-gray-700">
                    Nova senha
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="enterprise-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      maxLength={PASSWORD_MAX_LENGTH}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center text-gray-500 hover:text-blue-600"
                      aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo de 8 caracteres, com maiúscula, número e símbolo.
                  </p>
                </div>

                <div>
                  <label htmlFor="enterprise-confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirmar nova senha
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="enterprise-confirm-password"
                      type={showConfirmation ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      maxLength={PASSWORD_MAX_LENGTH}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmation((value) => !value)}
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center text-gray-500 hover:text-blue-600"
                      aria-label={showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                    >
                      {showConfirmation ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Salvando...' : 'Atualizar senha'}
                </button>
              </form>
            </>
          ) : null}

          <div className="mt-6 text-center">
            <button
              type="button"
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
