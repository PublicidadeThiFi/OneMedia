import { ArrowLeft } from 'lucide-react';

export default function Termos() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OOH</span>
            </div>
            <span className="text-lg text-gray-900">OOH Manager</span>
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
        <h1 className="text-gray-900 mb-8">Termos de Uso</h1>
        
        <div className="bg-white rounded-xl p-8 border border-gray-200 space-y-6">
          <section>
            <h2 className="text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p className="text-gray-600">
              Ao acessar e usar o OOH Manager, você concorda em cumprir e estar vinculado a estes Termos de Uso.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">2. Descrição do Serviço</h2>
            <p className="text-gray-600">
              O OOH Manager é uma plataforma SaaS para gestão de mídia OOH/DOOH, incluindo inventário, propostas, campanhas e financeiro.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">3. Período de Teste</h2>
            <p className="text-gray-600">
              Oferecemos um período de teste gratuito de 30 dias. Durante este período, você terá acesso completo à plataforma sem necessidade de cadastrar cartão de crédito.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">4. Uso Aceitável</h2>
            <p className="text-gray-600">
              Você concorda em usar o serviço apenas para fins legais e de acordo com todas as leis aplicáveis. O uso para atividades ilegais ou não autorizadas é estritamente proibido.
            </p>
          </section>

          <section>
            <h2 className="text-gray-900 mb-3">5. Propriedade Intelectual</h2>
            <p className="text-gray-600">
              Todo o conteúdo, recursos e funcionalidades do OOH Manager são de propriedade exclusiva da empresa e protegidos por direitos autorais.
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
