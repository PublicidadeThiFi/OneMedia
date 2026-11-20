import { useEffect, useState } from 'react';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DoohMarketplaceCampaignSelection } from './campaigns/DoohMarketplaceCampaignSelection';
import { DoohGettingStarted } from './DoohGettingStarted';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohPlayerInventoryReadOnly } from './DoohPlayerInventoryReadOnly';
import { DoohPlayerOperations } from './DoohPlayerOperations';
import { DoohPlayerPairingAndAssignment } from './DoohPlayerPairingAndAssignment';
import { DoohPlayerAuditReadOnly } from './DoohPlayerAuditReadOnly';
import { DoohGroupMembersSafeEditor } from './DoohGroupMembersSafeEditor';
import { DoohPlayerRestartQa } from './DoohPlayerRestartQa';
import { DoohMediaLibraryReadOnly } from './DoohMediaLibraryReadOnly';
import { DoohPlaylistCatalogReadOnly } from './DoohPlaylistCatalogReadOnly';
import { DoohScheduleCatalogReadOnly } from './DoohScheduleCatalogReadOnly';
import { DOOH_SECTION_LABELS, type DoohFoundationSection } from '../lib/productNavigation';

type ScreensTask = 'my-screens' | 'connect' | 'manage' | 'technical';
type ProgrammingTask = 'playlists' | 'schedules' | 'marketplace';
const screenTasks = [
  { id: 'my-screens', label: 'Minhas telas', description: 'Veja suas telas, o último contato e o que falta para receber uma programação.' },
  { id: 'connect', label: 'Conectar uma tela', description: 'Gere um código no navegador da tela, confirme o vínculo e escolha o local de instalação.' },
  { id: 'manage', label: 'Gerenciar dispositivos', description: 'Altere nomes e organize grupos quando tiver permissão.' },
  { id: 'technical', label: 'Detalhes técnicos', description: 'Histórico, grupos, comandos e diagnósticos para suporte autorizado.' },
] as const;
const programmingTasks = [
  { id: 'playlists', label: 'Listas de exibição', description: 'Escolha as mídias prontas, defina a ordem e publique a lista quando autorizado.' },
  { id: 'schedules', label: 'Agendas', description: 'Escolha a lista publicada, os horários e as telas que vão receber o conteúdo.' },
  { id: 'marketplace', label: 'Campanhas do Marketplace', description: 'Vincule campanhas aprovadas somente conforme as regras atuais da plataforma.' },
] as const;
const explanations: Record<DoohFoundationSection, string> = {
  home: 'Siga a próxima etapa para colocar sua tela em funcionamento.',
  screens: 'Conecte um dispositivo e escolha onde ele ficará instalado.',
  library: 'Envie imagens e vídeos e prepare-os para usar na programação.',
  scheduling: 'Monte listas de exibição e defina quando e onde cada uma aparece.',
  reports: 'Relatórios de exibição ainda não estão disponíveis neste módulo.',
};

export function DoohFoundationPage({ section }: { section: DoohFoundationSection }) {
  const { snapshot } = useProductAccess();
  const [screenTask, setScreenTask] = useState<ScreensTask>('my-screens');
  const [programmingTask, setProgrammingTask] = useState<ProgrammingTask>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ux') === 'agendas'
      ? 'schedules' : 'playlists');
  useEffect(() => {
    if (section === 'scheduling' && new URLSearchParams(window.location.search).get('ux') === 'agendas') setProgrammingTask('schedules');
  }, [section]);
  const mode = snapshot?.modules.DOOH.accessMode;
  return <main className="mx-auto max-w-[1440px] space-y-5 p-4 pb-12 md:p-7">
    <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">OneMedia · Telas digitais</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{section === 'home' ? 'Vamos colocar sua tela para funcionar' : DOOH_SECTION_LABELS[section]}</h1>
          <p className="text-sm leading-6 text-gray-600">{explanations[section]}</p>
        </div>
        <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700" aria-label="Permissão do módulo">
          {mode === 'FULL' ? 'Acesso: visualizar e editar' : mode === 'READ_ONLY' ? 'Acesso: somente consulta' : 'Acesso não concedido'}
        </p>
      </div>
    </header>
    {section === 'home' && <DoohGettingStarted />}
    {section === 'screens' && <>
      <DoohWorkspaceTabs tabs={screenTasks} selected={screenTask} onSelect={setScreenTask} label="Tarefas de telas e dispositivos" />
      {screenTask === 'my-screens' && <DoohPlayerInventoryReadOnly />}
      {screenTask === 'connect' && <DoohPlayerPairingAndAssignment />}
      {screenTask === 'manage' && <DoohPlayerOperations />}
      {screenTask === 'technical' && <div className="space-y-4">
        <DoohPlayerAuditReadOnly /><DoohGroupMembersSafeEditor /><DoohPlayerRestartQa />
      </div>}
    </>}
    {section === 'library' && <DoohMediaLibraryReadOnly />}
    {section === 'scheduling' && <>
      <DoohWorkspaceTabs tabs={programmingTasks} selected={programmingTask} onSelect={setProgrammingTask} label="Áreas de programação" />
      {programmingTask === 'playlists' && <DoohPlaylistCatalogReadOnly />}
      {programmingTask === 'schedules' && <DoohScheduleCatalogReadOnly />}
      {programmingTask === 'marketplace' && <DoohMarketplaceCampaignSelection />}
    </>}
    {section === 'reports' && <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <h2 className="font-semibold text-gray-900">Relatórios de exibição em preparação</h2>
      <p className="mt-2 text-sm text-gray-600">O cadastro de tela, o processamento de mídia e a programação não comprovam exibição. Nenhum relatório será simulado.</p>
    </section>}
  </main>;
}
