import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigation } from '../App';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

function getErrorMessage(error: any): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return 'Não foi possível autenticar o acesso administrativo.';
}

export default function AdminLoginPage() {
  const navigate = useNavigation();
  const { authReady, isAuthenticated, loading, login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [authReady, isAuthenticated, navigate]);

  const isDisabled = useMemo(() => loading || !username.trim() || !password.trim(), [loading, username, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login({
        username: username.trim(),
        password,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8 lg:p-10">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-10 sm:h-12" />
            <div className="mt-8 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Área administrativa da Página Principal
              </span>
              <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
                Acesso separado para gestão segura das matérias.
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Nesta etapa, o fluxo secreto do <strong>/admin</strong> já está isolado do login comum da plataforma.
                As próximas etapas vão conectar listagem, criação, edição, publicação e uploads do módulo de notícias.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl sm:p-8">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold text-white">Entrar no admin</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use o usuário e a senha secretos configurados no backend.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Usuário</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="admin"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="••••••••"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isDisabled}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Acessar admin'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
