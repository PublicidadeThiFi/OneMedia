import { ArrowLeft, FileCheck, Shield, Clock, AlertCircle, Copyright, Scale } from 'lucide-react';
import { useNavigation } from '../App';
import { useWaitlist } from '../contexts/WaitlistContext';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

export default function Termos() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-7 sm:h-10 transition-transform group-hover:scale-105" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#4F46E5] transition-colors px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl shadow-xl mb-5">
            <FileCheck className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Termos de Uso
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Conheça as regras e diretrizes para o uso da plataforma OneMedia.
          </p>
        </div>
        
        {/* Content Cards */}
        <div className="space-y-4 sm:space-y-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">1. Aceitação dos Termos</h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  Ao acessar e usar o OneMedia, você concorda em cumprir e estar vinculado a estes Termos de Uso.
                  Se você não concordar com qualquer parte destes termos, não deverá usar nossa plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">2. Descrição do Serviço</h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  O OneMedia é uma plataforma SaaS completa para gestão de mídia OOH/DOOH, incluindo módulos de inventário,
                  propostas comerciais, campanhas, gestão financeira, mídia kit e muito mais. Oferecemos ferramentas
                  especializadas para agências, veículos e proprietários de mídia exterior.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 - Teste Grátis */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl text-white">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold mb-2 sm:mb-3">3. Período de Teste Gratuito</h2>
                <p className="text-sm sm:text-base leading-relaxed opacity-95 mb-3">
                  Oferecemos um período de teste gratuito de 30 dias com acesso completo à plataforma. Durante este período:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm sm:text-base">
                    <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="opacity-95">Acesso completo a todos os recursos</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base">
                    <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="opacity-95">Sem necessidade de cartão de crédito</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base">
                    <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="opacity-95">Cancelamento a qualquer momento</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">4. Uso Aceitável</h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                  Você concorda em usar o serviço apenas para fins legais e de acordo com todas as leis aplicáveis.
                  É estritamente proibido:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Utilizar a plataforma para atividades ilegais ou fraudulentas</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Tentar acessar áreas restritas ou dados de outros usuários</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Fazer engenharia reversa ou copiar funcionalidades da plataforma</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Sobrecarregar nossos servidores com uso abusivo</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Copyright className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">5. Propriedade Intelectual</h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  Todo o conteúdo, recursos, funcionalidades e design do OneMedia são de propriedade exclusiva
                  da empresa e protegidos por direitos autorais, marcas registradas e outras leis de propriedade
                  intelectual. Os dados inseridos por você permanecem de sua propriedade.
                </p>
              </div>
            </div>
          </div>

          {/* Card 6 - Responsabilidades */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">6. Limitação de Responsabilidade</h2>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                  O OneMedia é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros.
                  Em nenhuma circunstância seremos responsáveis por:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Perda de dados ou lucros cessantes</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Danos indiretos ou consequenciais</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm sm:text-base text-gray-700">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Uso indevido da plataforma por terceiros</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 7 - Modificações */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md sm:shadow-xl text-white">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-semibold mb-2 sm:mb-3">7. Modificações dos Termos</h2>
                <p className="text-sm sm:text-base leading-relaxed opacity-95">
                  Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas
                  serão notificadas por email ou através da plataforma. O uso continuado após as modificações
                  constitui aceitação dos novos termos.
                </p>
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
              openWaitlist('termos:cta:comecar-teste-gratis');
              // navigate('/cadastro');
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-8 py-4 rounded-full hover:shadow-xl hover:scale-105 transition-all text-lg font-medium"
          >
            Começar teste grátis
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </main>
    </div>
  );
}