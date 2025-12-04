import { useState } from 'react';
import { useNavigation } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/login/LoginForm';
import { TwoFactorStep } from '../components/login/TwoFactorStep';
import { LoginCredentials, TwoFactorPayload } from '../types/auth';

export default function Login() {
  const navigate = useNavigation();
  const { login, verifyTwoFactor, requiresTwoFactor, pendingEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      await login(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (payload: TwoFactorPayload) => {
    try {
      setError(null);
      setIsLoading(true);
      await verifyTwoFactor(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFrom2FA = () => {
    // Reset to login form
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-base sm:text-lg text-gray-900">OOH Manager</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            Voltar ao site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
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
            />
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center px-2">
          <p className="text-sm text-gray-600">
            Problemas para acessar?{' '}
            <button
              onClick={() => navigate('/contato')}
              className="text-[#4F46E5] hover:underline"
            >
              Entre em contato com o suporte
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}