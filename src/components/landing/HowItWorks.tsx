import { Upload, FileEdit, TrendingUp } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      title: 'Cadastre ou importe seu inventário',
      description: 'Pontos, faces, valores e proprietários em poucos minutos.',
    },
    {
      number: '02',
      icon: FileEdit,
      title: 'Monte propostas e campanhas em minutos',
      description: 'Selecione pontos, gere PDF/link e acompanhe aprovação.',
    },
    {
      number: '03',
      icon: TrendingUp,
      title: 'Controle veiculação e financeiro em tempo real',
      description: 'Veja ocupação, cobranças e recebimentos por campanha ou cliente.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">Como funciona na prática</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection Line - Desktop only */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4F46E5] via-[#4F46E5] to-[#4F46E5] opacity-20" 
               style={{ width: 'calc(100% - 12rem)', left: '6rem' }}>
          </div>

          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200 hover:border-[#4F46E5] transition-all hover:shadow-lg">
                {/* Number Badge */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#4F46E5] text-white rounded-full flex items-center justify-center shadow-lg z-10">
                  <span>{step.number}</span>
                </div>

                {/* Icon */}
                <div className="mb-6 mt-4">
                  <div className="w-16 h-16 bg-[#4F46E5]/10 rounded-xl flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-[#4F46E5]" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
