import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Preciso ter conhecimento técnico para usar?',
      answer: 'Não! O OOH Manager foi desenvolvido para ser intuitivo e fácil de usar. Se você usa planilhas hoje, conseguirá usar a plataforma sem dificuldades. Além disso, oferecemos suporte completo via e-mail e WhatsApp.',
    },
    {
      question: 'O OOH Manager funciona para OOH e DOOH?',
      answer: 'Sim! A plataforma atende tanto veículos de mídia tradicional (outdoor, busdoor, relógios de rua) quanto mídia digital (painéis LED, telas programáticas). Você pode gerenciar ambos no mesmo sistema.',
    },
    {
      question: 'Consigo importar meu inventário atual?',
      answer: 'Sim. Você pode importar seus pontos via planilha Excel/CSV ou cadastrar manualmente. Nossa equipe também pode ajudar na migração dos dados durante o período de teste.',
    },
    {
      question: 'Como funciona o teste grátis de 30 dias?',
      answer: 'Você pode usar todos os recursos da plataforma por 30 dias sem custos e sem precisar cadastrar cartão de crédito. Ao final, basta escolher um plano para continuar usando ou cancelar sem nenhuma cobrança.',
    },
    {
      question: 'Tem fidelidade ou multa de cancelamento?',
      answer: 'Não há fidelidade nem multas. Os planos são mensais e você pode cancelar quando quiser. Acreditamos que nosso trabalho é fazer você querer ficar, não obrigar.',
    },
    {
      question: 'Posso usar a plataforma com minha equipe (multiusuário)?',
      answer: 'Sim! Todos os planos incluem acesso multiusuário. Você pode convidar sua equipe comercial, financeira e operacional, cada um com permissões adequadas ao seu papel.',
    },
    {
      question: 'Vocês emitem NF automaticamente?',
      answer: 'Atualmente estamos integrando com APIs de emissão de notas fiscais. Por enquanto, a plataforma registra e controla as cobranças, mas a emissão ainda precisa ser feita externamente.',
    },
    {
      question: 'Como funciona o suporte?',
      answer: 'Oferecemos suporte via e-mail e WhatsApp em horário comercial. Problemas críticos são priorizados. Para planos Enterprise (400+ pontos), há opções de suporte dedicado.',
    },
  ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">Perguntas frequentes</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900 pr-8">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4 pt-2">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
