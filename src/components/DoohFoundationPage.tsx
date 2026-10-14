import {
  BarChart3,
  CalendarClock,
  FolderOpen,
  MonitorPlay,
  RadioTower,
} from 'lucide-react';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DoohMarketplaceCampaignSelection } from './campaigns/DoohMarketplaceCampaignSelection';
import { DoohPlayerInventoryReadOnly } from './DoohPlayerInventoryReadOnly';
import { DoohPlayerOperations } from './DoohPlayerOperations';
import { DoohPlayerPairingAndAssignment } from './DoohPlayerPairingAndAssignment';
import { DoohPlayerAuditReadOnly } from './DoohPlayerAuditReadOnly';
import { DoohGroupMembersSafeEditor } from './DoohGroupMembersSafeEditor';
import { DoohPlayerRestartQa } from './DoohPlayerRestartQa';
import {
  DOOH_SECTION_LABELS,
  type DoohFoundationSection,
} from '../lib/productNavigation';

interface DoohFoundationPageProps {
  section: DoohFoundationSection;
}

const sectionDescriptions: Record<DoohFoundationSection, string> = {
  home:
    'O módulo DOOH possui consulta de players, operações administrativas e formulário de pareamento/associação com proteção do backend. Consulta de histórico de comandos disponível; restart protegido por gate exclusivo de QA, enquanto distribuição de mídia e homologação física continuam pendentes.',
  screens:
    'Consulta de players, gestão de nomes/grupos, pareamento e associação. Edição individual de membros exige o novo endpoint atômico e grupos sem programação; restart disponível apenas em compilação/empresa de QA explicitamente autorizadas.',
  library:
    'A rota da Biblioteca DOOH já está reservada. Upload, processamento, versões e distribuição de mídia serão implementados nas próximas fases.',
  scheduling:
    'A infraestrutura de playlists e agendas já existe no backend. O vínculo manual com campanhas aprovadas do Marketplace está disponível no detalhe da campanha; a interface completa de programação DOOH será entregue progressivamente.',
  reports:
    'A rota de Relatórios já está reservada. Proof-of-play, agregações e exportações serão adicionados após o runtime e a sincronização.',
};

const roadmapCards = [
  {
    title: 'Telas e Players',
    description: 'Pareamento, credenciais, heartbeat, status e comandos.',
    icon: MonitorPlay,
  },
  {
    title: 'Biblioteca',
    description: 'Uploads, processamento, versões e distribuição de assets.',
    icon: FolderOpen,
  },
  {
    title: 'Programação',
    description: 'Playlists, agenda, prioridade, publicação e manifests.',
    icon: CalendarClock,
  },
  {
    title: 'Proof-of-play',
    description: 'Eventos de exibição, consolidação e rastreabilidade.',
    icon: RadioTower,
  },
  {
    title: 'Relatórios',
    description: 'Consultas, filtros, exportações e histórico de exibição.',
    icon: BarChart3,
  },
] as const;

export function DoohFoundationPage({ section }: DoohFoundationPageProps) {
  const { snapshot } = useProductAccess();
  const access = snapshot?.modules.DOOH;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              OneMedia DOOH
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {DOOH_SECTION_LABELS[section]}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {sectionDescriptions[section]}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">Acesso ao módulo</p>
            <p className="mt-1 text-gray-600">
              {access?.accessMode === 'FULL'
                ? 'Leitura e escrita'
                : access?.accessMode === 'READ_ONLY'
                  ? 'Somente leitura'
                  : 'Não concedido'}
            </p>
          </div>
        </div>
      </div>

      {section === 'home' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmapCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {card.description}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {card.title === 'Telas e Players' ? 'Inventário, nomes, grupos e operações de pareamento/associação disponíveis; histórico de comandos disponível; restart condicionado ao gate de QA' : 'Estrutura reservada — ainda não operacional'}
                </p>
              </div>
            );
          })}
        </div>
      ) : section === 'scheduling' ? (
        <DoohMarketplaceCampaignSelection />
      ) : section === 'screens' ? (
        <DoohPlayerInventoryReadOnly />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-800">
            Esta rota já participa do gate DOOH, mas a funcionalidade será criada na fase correspondente.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Nenhuma operação de player, mídia, programação ou relatório foi simulada nesta etapa.
          </p>
        </div>
      )}
      {section === 'screens' && <DoohPlayerOperations />}
      {section === 'screens' && <DoohPlayerPairingAndAssignment />}
      {section === 'screens' && <DoohPlayerAuditReadOnly />}
      {section === 'screens' && <DoohGroupMembersSafeEditor />}
      {section === 'screens' && <DoohPlayerRestartQa />}
    </div>
  );
}
