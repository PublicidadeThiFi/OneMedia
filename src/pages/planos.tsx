import { useNavigation } from '../App';
import { useWaitlist } from '../contexts/WaitlistContext';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import imgOnemediaLogo from '../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';
import { Pricing } from '../components/landing/Pricing';

export default function Planos() {
  const navigate = useNavigation();
  const { openWaitlist } = useWaitlist();
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={imgOnemediaLogo} alt="OneMedia" className="h-12" />
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-medium text-gray-900 mb-6">
              Escolha o plano ideal
              <br />
              para o seu negócio
            </h1>
            <p className="text-2xl font-extralight text-gray-700 max-w-3xl mx-auto">
              Todas as funcionalidades essenciais para revolucionar sua gestão de mídia OOH/DOOH
            </p>
          </div>

          <div className="mb-16">
            <Pricing />
          </div>

          {/* Trial Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-semibold mb-4">
              Experimente grátis por 30 dias
            </h2>
            <p className="text-xl mb-8 opacity-95">
              Teste todas as funcionalidades sem compromisso. Não é necessário cartão de crédito.
            </p>
            <button
              onClick={() => {
                openWaitlist('planos:cta:comecar-teste-gratis');
                // navigate('/cadastro');
              }}
              className="flex items-center gap-3 px-12 py-5 bg-white text-blue-700 text-2xl rounded-full hover:shadow-2xl transition-all mx-auto font-semibold"
            >
              Começar teste grátis
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <h2 className="text-4xl font-semibold text-gray-900 text-center mb-12">
              Perguntas Frequentes
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Posso mudar de plano depois?
                </h3>
                <p className="text-gray-700">
                  Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, sem burocracia.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Como funciona o período de teste?
                </h3>
                <p className="text-gray-700">
                  Você tem acesso completo a todas as funcionalidades por 30 dias. Não pedimos cartão de crédito.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Qual a forma de pagamento?
                </h3>
                <p className="text-gray-700">
                  Aceitamos cartão de crédito, boleto bancário e transferência bancária para planos anuais.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Tem desconto para pagamento anual?
                </h3>
                <p className="text-gray-700">
                  Sim! Oferecemos 20% de desconto para pagamentos anuais antecipados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo and Info */}
            <div>
              <img src={imgOnemediaLogo} alt="OneMedia" className="h-10 mb-6" />
              <div className="space-y-2 text-gray-600">
                <p onClick={() => navigate('/planos')} className="cursor-pointer hover:text-blue-600 transition-colors">Preços</p>
                <p onClick={() => setShowContactModal(true)} className="cursor-pointer hover:text-blue-600 transition-colors">Entre em contato conosco</p>
              </div>
            </div>

            {/* Produtos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Produtos</h4>
              <div className="space-y-2 text-gray-600">
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Inventário</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Propostas</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Campanhas</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Financeiro</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Mídia Kit</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Dashboard</p>
              </div>
            </div>

            {/* Soluções */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Soluções</h4>
              <div className="space-y-2 text-gray-600">
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Para Agências</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Para Veículos</p>
                <p onClick={() => { navigate('/'); setTimeout(() => { window.location.hash = 'solucoes'; }, 100); }} className="cursor-pointer hover:text-blue-600 transition-colors">Para Proprietários</p>
              </div>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Recursos</h4>
              <div className="space-y-2 text-gray-600">
                <p onClick={() => navigate('/')} className="cursor-pointer hover:text-blue-600 transition-colors">Blog</p>
                <p onClick={() => navigate('/')} className="cursor-pointer hover:text-blue-600 transition-colors">Documentação</p>
                <p onClick={() => navigate('/')} className="cursor-pointer hover:text-blue-600 transition-colors">Suporte</p>
                <p onClick={() => navigate('/contato')} className="cursor-pointer hover:text-blue-600 transition-colors">Contato</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600">© 2026 OneMedia. Todos os direitos reservados.</p>
            <div className="flex gap-6 text-gray-600">
              <button type="button" onClick={() => navigate('/privacidade')} className="hover:text-blue-600 transition-colors">Privacidade</button>
              <button type="button" onClick={() => navigate('/termos')} className="hover:text-blue-600 transition-colors">Termos</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Entre em contato</h3>
            <p className="text-gray-600 mb-6">Escolha como prefere falar conosco:</p>
            
            <div className="space-y-4">
              {/* WhatsApp */}
              <a
                href="https://wa.me/5561982541672?text=Olá!%20Gostaria%20de%20conhecer%20mais%20sobre%20a%20plataforma%20OneMedia%20para%20gestão%20de%20mídia%20OOH/DOOH.%20Poderia%20me%20ajudar?"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all group"
              >
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <svg className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-600">Resposta rápida</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:thifi.contato.oficial@gmail.com?subject=Interesse%20na%20plataforma%20OneMedia&body=Olá!%0A%0AGostaria%20de%20conhecer%20mais%20sobre%20a%20plataforma%20OneMedia%20para%20gestão%20de%20mídia%20OOH/DOOH.%0A%0APoderia%20me%20enviar%20mais%20informações?%0A%0AObrigado!"
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:shadow-lg transition-all group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">E-mail</p>
                  <p className="text-sm text-gray-600">thifi.contato.oficial@gmail.com</p>
                </div>
              </a>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}