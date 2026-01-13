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
      {/* API / Global Error */}
      {errors.api && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium whitespace-pre-line">{errors.api}</p>
        </div>
      )}

      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">Seus dados de acesso</h2>
        <p className="text-gray-600">
          Você será o administrador da conta. Depois poderá convidar outros usuários.
        </p>
      </div>

      <div className="space-y-5 mb-8">
        {/* Nome Completo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome completo <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: João Silva"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
              errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-mail corporativo <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="seu.email@empresa.com.br"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
              errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone / WhatsApp <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            value={formatPhoneDisplay(phoneDigits)}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
              errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          />
          {errors.phone && (
            <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            10 ou 11 dígitos (com DDD)
          </p>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Crie uma senha forte"
              className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Password Requirements */}
          {data.password && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <p className="text-xs font-medium text-gray-700 mb-2">Sua senha deve conter:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.minLength ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.minLength ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    Mínimo de 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasUpperCase ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasUpperCase ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    Pelo menos 1 letra maiúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasNumber ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasNumber ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    Pelo menos 1 número (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordReqs.hasSpecialChar ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={passwordReqs.hasSpecialChar ? 'text-green-700 font-medium' : 'text-gray-600'}>
                    Pelo menos 1 caractere especial (!@#$%&*...)
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Confirmar Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar senha <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Digite a senha novamente"
              className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Aceite de Termos */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.acceptedTerms}
              onChange={(e) => handleChange('acceptedTerms', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
            />
            <span className="text-sm text-gray-700">
              Li e aceito os{' '}
              <a href="/termos" target="_blank" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="/privacidade" target="_blank" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                Política de Privacidade
              </a>
              . <span className="text-red-600">*</span>
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="mt-2 text-sm text-red-600">{errors.acceptedTerms}</p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-10 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 font-medium"
        >
          Voltar
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30 font-medium"
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
