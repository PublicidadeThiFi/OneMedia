import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useState } from 'react';
import { SignupUserStep } from '../../types/signup';
import {
  onlyDigits,
  formatPhoneDisplay,
  handlePhoneInput,
  validatePasswordRequirements,
} from '../../lib/validators';

type Step3UserProps = {
  data: SignupUserStep;
  onChange: (data: SignupUserStep) => void;
  onSubmit: () => void;
  onBack: () => void;
  errors: Record<string, string>;
  isLoading: boolean;
};

export function Step3User({ data, onChange, onSubmit, onBack, errors, isLoading }: Step3UserProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState(onlyDigits(data.phone));

  const handleChange = (field: keyof SignupUserStep, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  // Phone handling
  const handlePhoneChange = (value: string) => {
    const digits = handlePhoneInput(value);
    setPhoneDigits(digits);
    handleChange('phone', digits); // Store only digits
  };

  // Password requirements validation
  const passwordReqs = validatePasswordRequirements(data.password);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-gray-900 mb-2">Seus dados de acesso</h2>
        <p className="text-gray-600">
          Você será o administrador da conta. Depois poderá convidar outros usuários.
        </p>
      </div>

      <div className="space-y-5 mb-8">
        {/* Nome Completo */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Nome completo <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: João Silva"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            E-mail corporativo <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="seu.email@empresa.com.br"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Telefone / WhatsApp <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            value={formatPhoneDisplay(phoneDigits)}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            10 ou 11 dígitos (com DDD)
          </p>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Senha <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Crie uma senha forte"
              className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Password Requirements */}
          {data.password && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <p className="text-xs text-gray-600 mb-2">Sua senha deve conter:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.minLength ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.minLength ? 'text-green-700' : 'text-gray-600'}>
                    Mínimo de 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasUpperCase ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasUpperCase ? 'text-green-700' : 'text-gray-600'}>
                    Pelo menos 1 letra maiúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasNumber ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasNumber ? 'text-green-700' : 'text-gray-600'}>
                    Pelo menos 1 número (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasSpecialChar ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasSpecialChar ? 'text-green-700' : 'text-gray-600'}>
                    Pelo menos 1 caractere especial (!@#$%&*...)
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Confirmar Senha */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Confirmar senha <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Digite a senha novamente"
              className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Aceite de Termos */}
        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={data.acceptedTerms}
              onChange={(e) => handleChange('acceptedTerms', e.target.checked)}
              className="mt-1 w-4 h-4 text-[#4F46E5] border-gray-300 rounded focus:ring-[#4F46E5]"
            />
            <span className="text-sm text-gray-700">
              Li e aceito os{' '}
              <a href="/termos" target="_blank" className="text-[#4F46E5] hover:underline">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="/privacidade" target="_blank" className="text-[#4F46E5] hover:underline">
                Política de Privacidade
              </a>
              . <span className="text-red-600">*</span>
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="mt-1 text-sm text-red-600">{errors.acceptedTerms}</p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="bg-[#4F46E5] text-white px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Criando conta...
            </>
          ) : (
            'Concluir cadastro'
          )}
        </button>
      </div>
    </div>
  );
}
