import { ArrowLeft, Shield, Lock, Eye, FileText, Users, Mail } from 'lucide-react';
import { useNavigation } from '../App';
import { useWaitlist } from '../contexts/WaitlistContext';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export default function Privacidade() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-10 transition-transform group-hover:scale-105" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#4F46E5] transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-semibold text-gray-900 mb-4">
            Política de Privacidade
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sua privacidade é fundamental para nós. Conheça como protegemos e gerenciamos seus dados.
          </p>
        </div>
        
        {/* Content Cards */}
        <div className="space-y-6">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Informações que Coletamos</h2>
                <p className="text-gray-600 mb-4">
                  Coletamos informações que você nos fornece diretamente, incluindo:
                </p>
                <ul className="space-y-3 ml-4">
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Nome completo e informações de contato</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Dados da empresa (CNPJ, razão social, etc.)</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Informações de inventário de mídia</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Dados de campanhas e propostas</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Como Usamos suas Informações</h2>
                <p className="text-gray-600 mb-4">
                  Usamos as informações coletadas para:
                </p>
                <ul className="space-y-3 ml-4">
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Fornecer, manter e melhorar nossos serviços</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Processar transações e enviar notificações</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Responder a comentários e perguntas</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Enviar informações técnicas e atualizações</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Compartilhamento de Informações</h2>
                <p className="text-gray-700 leading-relaxed">
                  Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros sem seu consentimento, 
                  exceto quando necessário para fornecer o serviço ou quando exigido por lei.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Segurança dos Dados</h2>
                <p className="text-gray-700 leading-relaxed">
                  Implementamos medidas de segurança apropriadas para proteger suas informações contra acesso não autorizado, 
                  alteração, divulgação ou destruição.
                </p>
              </div>
            </div>
          </div>

          {/* Card 5 - LGPD */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 shadow-xl text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-3">5. LGPD - Lei Geral de Proteção de Dados</h2>
                <p className="leading-relaxed opacity-95">
                  Estamos em conformidade com a LGPD (Lei 13.709/2018). Você tem direito de acessar, corrigir, excluir 
                  ou solicitar a portabilidade de seus dados pessoais a qualquer momento.
                </p>
              </div>
            </div>
          </div>

          {/* Card 6 - Contato */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Contato</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Para questões sobre privacidade ou proteção de dados, entre em contato:
                </p>
                <a 
                  href="mailto:privacidade@onemedia.com" 
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  privacidade@onemedia.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-600">
              Última atualização: <span className="font-medium text-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => {
              openWaitlist('privacidade:cta:comecar-teste-gratis');
              // navigate('/cadastro');
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-full hover:shadow-xl hover:scale-105 transition-all text-lg font-medium"
          >
            Começar teste grátis
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </main>
    </div>
  );
}