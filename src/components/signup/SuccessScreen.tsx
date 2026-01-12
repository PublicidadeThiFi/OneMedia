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
            as instruções de acesso e próximos passos.
          </p>
        </div>

        <p className="text-gray-600">
          Você pode ir direto para a tela de login e começar a usar a plataforma agora, 
          ou voltar para o site para conhecer melhor as funcionalidades.
        </p>
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
