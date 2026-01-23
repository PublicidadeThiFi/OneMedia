import { useEffect, useState } from 'react';
import { CheckCircle, Home, LogIn, Send } from 'lucide-react';
import { useNavigation } from '../../App';
import { publicApiClient } from '../../lib/apiClient';
import { getApiError } from '../../lib/getApiError';

type SuccessScreenProps = {
  companyName: string;
  userEmail: string;
};

type ResendVerificationResponse = {
  message?: string;
  retryAfterSeconds?: number;
};

export function SuccessScreen({ companyName, userEmail }: SuccessScreenProps) {
  const navigate = useNavigation();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!userEmail) return;
    try {
      setResendInfo(null);
      setResendLoading(true);
      const response = await publicApiClient.post<ResendVerificationResponse>('/auth/resend-verification', {
        email: userEmail,
      });

      const msg =
        typeof response.data?.message === 'string' && response.data.message.trim()
          ? response.data.message
          : 'Se a conta existir e o e-mail ainda não estiver verificado, enviamos uma nova confirmação.';

      setResendInfo(msg);

      const retry =
        typeof response.data?.retryAfterSeconds === 'number'
          ? response.data.retryAfterSeconds
          : 60;
      setResendCooldown(Math.max(1, Math.min(600, retry)));
    } catch (err) {
      const apiErr = getApiError(err, 'Não foi possível reenviar o e-mail. Tente novamente.');
      setResendInfo(apiErr.message);
      if (apiErr.retryAfterSeconds) {
        setResendCooldown(Math.max(1, Math.min(600, apiErr.retryAfterSeconds)));
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="text-center py-12">
      {/* Success Icon */}
      <div className="mb-8 flex justify-center">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
          <CheckCircle className="w-14 h-14 text-white" />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-4xl font-semibold text-gray-900 mb-6">Conta criada com sucesso!</h2>
      
      <div className="max-w-lg mx-auto space-y-4 mb-10">
        <p className="text-gray-600 text-lg">
          Parabéns! A conta da empresa <span className="font-semibold text-gray-900">{companyName}</span> foi criada 
          com sucesso e você já pode começar seu teste grátis de 30 dias.
        </p>
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
          <p className="text-sm text-blue-800">
            📧 Enviamos um e-mail de confirmação para <span className="font-semibold">{userEmail}</span> com 
            um link para ativar sua conta.
          </p>
        </div>

        <p className="text-gray-600">
          Para acessar a plataforma, confirme seu e-mail primeiro. Depois disso, volte aqui e faça login.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading || resendCooldown > 0}
            className="inline-flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {resendLoading
              ? 'Enviando...'
              : resendCooldown > 0
                ? `Reenviar em ${resendCooldown}s`
                : 'Reenviar e-mail de confirmação'}
          </button>

          {resendInfo ? (
            <p className="mt-3 text-sm text-gray-600">{resendInfo}</p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Não recebeu? Verifique a caixa de spam e promoções.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-medium"
        >
          <LogIn className="w-5 h-5" />
          Ir para Login
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-10 py-3.5 rounded-xl hover:bg-gray-50 transition-all font-medium"
        >
          <Home className="w-5 h-5" />
          Voltar para o site
        </button>
      </div>

      {/* Secondary Action */}
      <p className="text-sm text-gray-600">
        Precisa de ajuda?{' '}
        <button onClick={() => navigate('/contato')} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
          Fale com nosso time comercial
        </button>
      </p>
    </div>
  );
}
