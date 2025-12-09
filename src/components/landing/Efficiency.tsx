import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function Efficiency() {
  const manualTasks = [
    { task: 'Atualizar planilhas de inventário', hours: '15 h/mês' },
    { task: 'Montar propostas e recalcular valores', hours: '20 h/mês' },
    { task: 'Conferir faturas e recebimentos', hours: '12 h/mês' },
    { task: 'Retrabalho por erros de comunicação', hours: '18 h/mês' },
  ];

  const withOOH = [
    'Inventário centralizado e sempre atualizado',
    'Propostas em poucos cliques, com templates',
    'Cobranças ligadas às campanhas, com alertas',
    'Mídia kit e mapa integrados para vender mais',
  ];

  const scrollToPlans = () => {
    const element = document.querySelector('#planos');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="economia" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">
            Quanto tempo sua equipe perde em planilhas hoje?
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Manual Management */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-gray-900">Gestão manual</h3>
            </div>

            <div className="space-y-4">
              {manualTasks.map((item) => (
                <div
                  key={item.task}
                  className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center justify-between"
                >
                  <span className="text-gray-700">{item.task}</span>
                  <span className="text-red-700 font-medium">{item.hours}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-600 rounded">
              <p className="text-red-900">
                <span className="font-bold">Total: ~65 horas/mês</span> desperdiçadas em tarefas repetitivas
              </p>
            </div>
          </div>

          {/* With OneMedia */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <h3 className="text-gray-900">Com OneMedia</h3>
            </div>

            <div className="space-y-4">
              {withOOH.map((item, index) => (
                <div
                  key={index}
                  className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-100 border-l-4 border-green-600 rounded">
              <p className="text-green-900 mb-4">
                <span className="font-bold">Economize até 80% desse tempo</span> e foque no que importa: vender mais
              </p>
              <button
                onClick={scrollToPlans}
                className="text-green-700 hover:text-green-800 underline transition-colors"
              >
                Simular meu ganho →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
