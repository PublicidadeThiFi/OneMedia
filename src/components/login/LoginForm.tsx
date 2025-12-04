import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useNavigation } from '../../App';
import { LoginCredentials } from '../../types/auth';

type LoginFormProps = {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const navigate = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit({ email, password, rememberMe });
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    alert('Funcionalidade de recuperação de senha em desenvolvimento.\n\nPor favor, entre em contato com o suporte.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-gray-900 mb-2">Bem-vindo de volta</h2>
        <p className="text-gray-600">
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>

      {/* Global Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">
          E-mail corporativo <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@empresa.com.br"
            className={`w-full pl-11 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Senha <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full pl-11 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-[#4F46E5] border-gray-300 rounded focus:ring-[#4F46E5]"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700">Lembrar de mim neste dispositivo</span>
        </label>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-[#4F46E5] hover:underline"
          disabled={isLoading}
        >
          Esqueci minha senha
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#4F46E5] text-white px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </button>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-600">
        Ainda não tem conta?{' '}
        <button
          type="button"
          onClick={() => navigate('/cadastro')}
          className="text-[#4F46E5] hover:underline"
          disabled={isLoading}
        >
          Começar teste grátis
        </button>
      </p>
    </form>
  );
}