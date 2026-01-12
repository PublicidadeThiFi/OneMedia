import { useState } from 'react';
import { useNavigation } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/login/LoginForm';
import { TwoFactorStep } from '../components/login/TwoFactorStep';
import { LoginCredentials, TwoFactorPayload } from '../types/auth';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

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