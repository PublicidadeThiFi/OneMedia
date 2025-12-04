import { CheckCircle, Home, LogIn } from 'lucide-react';
import { useNavigation } from '../../App';

type SuccessScreenProps = {
  companyName: string;
  userEmail: string;
};

export function SuccessScreen({ companyName, userEmail }: SuccessScreenProps) {
  const navigate = useNavigation();

  return (
    <div className="text-center py-12">
      {/* Success Icon */}
      <div className="mb-8 flex justify-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-gray-900 mb-4">Conta criada com sucesso!</h2>
      
      <div className="max-w-lg mx-auto space-y-4 mb-8">
        <p className="text-gray-600">
          Parabéns! A conta da empresa <span className="font-semibold">{companyName}</span> foi criada 
          com sucesso e você já pode começar seu teste grátis de 30 dias.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📧 Enviamos um e-mail de confirmação para <span className="font-semibold">{userEmail}</span> com 
            as instruções de acesso e próximos passos.
          </p>
        </div>

        <p className="text-gray-600">
          Você pode ir direto para a tela de login e começar a usar a plataforma agora, 
          ou voltar para o site para conhecer melhor as funcionalidades.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-8 py-3 rounded-lg hover:bg-[#4338CA] transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Ir para Login
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Home className="w-5 h-5" />
          Voltar para o site
        </button>
      </div>

      {/* Secondary Action */}
      <p className="text-sm text-gray-500">
        Precisa de ajuda?{' '}
        <button onClick={() => navigate('/contato')} className="text-[#4F46E5] hover:underline">
          Fale com nosso time comercial
        </button>
      </p>
    </div>
  );
}