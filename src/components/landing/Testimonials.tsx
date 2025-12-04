import { Quote } from 'lucide-react';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Carlos Mendes',
      role: 'Diretor Comercial',
      company: 'OutdoorBR',
      avatar: 'CM',
      text: 'Reduziu em 70% o tempo que gastávamos montando propostas. Agora conseguimos responder clientes no mesmo dia e a taxa de conversão aumentou.',
    },
    {
      name: 'Ana Paula Silva',
      role: 'Gerente de Operações',
      company: 'Digital Mídia OOH',
      avatar: 'AS',
      text: 'Finalmente temos visão real da ocupação dos nossos painéis digitais. Acabou o problema de overbooking e os clientes confiam mais no nosso trabalho.',
    },
    {
      name: 'Roberto Farias',
      role: 'Proprietário',
      company: 'Farias Publicidade',
      avatar: 'RF',
      text: 'A organização das cobranças mudou nosso fluxo de caixa. Sabemos exatamente o que está em aberto, vencido ou pago. Imprescindível para quem quer crescer.',
    },
  ];

  return (
    <section id="depoimentos" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">
            Quem já está simplificando a operação com o OOH Manager
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-[#4F46E5]/20" />
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#4F46E5] text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span>{testimonial.avatar}</span>
                </div>
                <div>
                  <div className="text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-gray-500">{testimonial.company}</div>
                </div>
              </div>

              <p className="text-gray-700 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
