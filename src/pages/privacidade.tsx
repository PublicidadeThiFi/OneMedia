import { ArrowLeft } from 'lucide-react';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-lg text-gray-900">OneMedia</span>
          </a>
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            Voltar ao site
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-gray-900 mb-8">Política de Privacidade</h1>
        
        <div className="bg-white rounded-xl p-8 border border-gray-200 space-y-6">
          <section>
            <h2 className="text-gray-900 mb-3">1. Informações que Coletamos</h2>
            <p className="text-gray-600 mb-3">
              Coletamos informações que você nos fornece diretamente, incluindo:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Nome completo e informações de contato</li>
              <li>Dados da empresa (CNPJ, razão social, etc.)</li>
              <li>Informações de inventário de mídia</li>
              <li>Dados de campanhas e propostas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">2. Como Usamos suas Informações</h2>
            <p className="text-gray-600 mb-3">
              Usamos as informações coletadas para:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar transações e enviar notificações</li>
              <li>Responder a comentários e perguntas</li>
              <li>Enviar informações técnicas e atualizações</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">3. Compartilhamento de Informações</h2>
            <p className="text-gray-600">
              Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros sem seu consentimento, 
              exceto quando necessário para fornecer o serviço ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">4. Segurança dos Dados</h2>
            <p className="text-gray-600">
              Implementamos medidas de segurança apropriadas para proteger suas informações contra acesso não autorizado, 
              alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">5. LGPD - Lei Geral de Proteção de Dados</h2>
            <p className="text-gray-600">
              Estamos em conformidade com a LGPD (Lei 13.709/2018). Você tem direito de acessar, corrigir, excluir 
              ou solicitar a portabilidade de seus dados pessoais a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">6. Contato</h2>
            <p className="text-gray-600">
              Para questões sobre privacidade ou proteção de dados, entre em contato: privacidade@oohmanager.com
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/cadastro"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#4F46E5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o cadastro
          </a>
        </div>
      </main>
    </div>
  );
}