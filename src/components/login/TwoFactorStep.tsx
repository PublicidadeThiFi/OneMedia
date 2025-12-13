import { useState, useRef, useEffect } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { TwoFactorPayload } from '../../types/auth';

type TwoFactorStepProps = {
  email: string;
  onSubmit: (payload: TwoFactorPayload) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
};

export function TwoFactorStep({ email, onSubmit, onBack, isLoading, error }: TwoFactorStepProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last digit
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const codeString = code.join('');

    if (codeString.length !== 6) {
      return;
    }

    await onSubmit({ email, code: codeString });
  };

  const isComplete = code.every(digit => digit !== '');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6 md:mb-8">
        <div className="mb-4 md:mb-6 flex justify-center">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-[#4F46E5]/10 rounded-full flex items-center justify-center">
            <Shield className="w-7 h-7 md:w-8 md:h-8 text-[#4F46E5]" />
          </div>
        </div>

        <h2 className="text-gray-900 mb-2">Confirme sua identidade</h2>
        <p className="text-gray-600 text-sm md:text-base px-2">
          Digite o código de 6 dígitos enviado para seu método de autenticação configurado
        </p>
        <p className="text-sm text-gray-500 mt-2 break-all px-2">
          {email}
        </p>
      </div>

      {/* Global Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Code Input - 6 digits */}
      <div>
        <label className="block text-sm text-gray-700 mb-3 text-center">
          Código de verificação
        </label>
        <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el: HTMLInputElement | null) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-all"
              disabled={isLoading}
            />
          ))}

        </div>
        <p className="text-xs text-gray-500 text-center mt-3 px-2">
          💡 Dica para teste: use o código <span className="font-mono font-semibold">123456</span>
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading || !isComplete}
          className="w-full bg-[#4F46E5] text-white px-6 md:px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verificando...
            </>
          ) : (
            'Confirmar código'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full px-6 md:px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
      </div>
    </form>
  );
}