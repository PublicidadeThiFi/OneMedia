import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../App';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import imgOnemediaLogo from 'figma:asset/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

type ResetPasswordResponse = {
  message?: string;
};

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
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!token) {
      toast.error('Token inválido. Abra o link do e-mail novamente.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
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

      const msg = response.data?.message?.trim() || 'Senha atualizada. Você já pode fazer login.';
      toast.success(msg);
      navigate('/login');
    } catch (err) {
      const apiErr = getApiError(err, 'Não foi possível redefinir a senha.');
      toast.error(apiErr.message);
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
          <h1 className="text-2xl font-semibold text-gray-900">Redefinir senha</h1>
          <p className="mt-2 text-sm text-gray-600">
            Digite sua nova senha abaixo.
          </p>

          {!token ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Token inválido. Abra o link do e-mail novamente.
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo de 8 caracteres.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Atualizar senha'}
            </button>
          </form>

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
