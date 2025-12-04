import { AlertCircle, Clock, TrendingDown, FileText } from 'lucide-react';

export function PainPoints() {
  const pains = [
    {
      icon: FileText,
      title: 'Planilhas sempre desatualizadas',
      description: 'Ninguém sabe ao certo o que está livre ou vendido. Risco de overbooking todo mês.',
    },
    {
      icon: Clock,
      title: 'Propostas que demoram horas',
      description: 'Cálculos manuais, copia e cola de fotos, PDFs difíceis de atualizar.',
    },
    {
      icon: TrendingDown,
      title: 'Campanhas difíceis de acompanhar',
      description: 'Datas, pontos e prazos espalhados entre e-mails, planilhas e mensagens.',
    },
    {
      icon: AlertCircle,
      title: 'Cobrança manual e desorganizada',
      description: 'Boletos, PIX e notas fiscais em lugares diferentes, sem visão clara de recebimentos.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 mb-4">
            Reconhece algum desses problemas?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            O OOH Manager foi criado para resolver essas dores do dia a dia na gestão de mídia exterior.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className="bg-red-50 border border-red-100 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <pain.icon className="w-8 h-8 text-red-600 mb-4" />
              <h3 className="text-gray-900 mb-2">{pain.title}</h3>
              <p className="text-gray-600">{pain.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
