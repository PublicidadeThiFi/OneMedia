import { useEffect, useState } from 'react';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DoohMarketplaceCampaignSelection } from './campaigns/DoohMarketplaceCampaignSelection';
import { DoohGettingStarted } from './DoohGettingStarted';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohPlayerInventoryReadOnly } from './DoohPlayerInventoryReadOnly';
import { DoohOperationalScreensPanel } from './DoohOperationalScreensPanel';
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
type ProgrammingTask = 'screens' | 'playlists' | 'schedules' | 'marketplace';
const screenTasks = [
  { id: 'my-screens', label: 'Minhas telas', description: 'Crie uma tela pelo nome, conecte um aparelho e veja o que falta para exibir conteúdo.' },
  { id: 'connect', label: 'Conectar uma tela', description: 'Escolha ou crie uma tela e conecte um aparelho pelo código.' },
  { id: 'manage', label: 'Gerenciar dispositivos', description: 'Altere nomes e organize grupos quando tiver permissão.' },
  { id: 'technical', label: 'Detalhes técnicos', description: 'Histórico, grupos, comandos e diagnósticos para suporte autorizado.' },
] as const;
const programmingTasks = [
  { id: 'screens', label: 'Por tela', description: 'Escolha uma tela e gerencie o conteúdo e os horários em um só lugar.' },
  { id: 'playlists', label: 'Listas avançadas', description: 'Escolha as mídias prontas, defina a ordem e publique a lista quando autorizado.' },
  { id: 'schedules', label: 'Agendas avançadas', description: 'Escolha a lista publicada, os horários e as telas que vão receber o conteúdo.' },
  { id: 'marketplace', label: 'Campanhas do Marketplace', description: 'Vincule campanhas aprovadas somente conforme as regras atuais da plataforma.' },
] as const;
const explanations: Record<DoohFoundationSection, string> = {
  home: 'Conecte suas telas, escolha o conteúdo e acompanhe a programação.',
  screens: 'Crie suas telas e conecte os aparelhos. Inventário comercial é opcional.',
  library: 'Envie imagens e vídeos e escolha onde exibir.',
  scheduling: 'Escolha o conteúdo e os horários de cada tela.',
  reports: 'Relatórios de exibição ainda não estão disponíveis neste módulo.',
};

export function DoohFoundationPage({ section }: { section: DoohFoundationSection }) {
  const { snapshot } = useProductAccess();
  const [screenTask, setScreenTask] = useState<ScreensTask>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ux') === 'connect'
      ? 'connect' : 'my-screens');
  const [programmingTask, setProgrammingTask] = useState<ProgrammingTask>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ux') === 'agendas'
      ? 'schedules' : typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ux') === 'listas' ? 'playlists' : 'screens');
  useEffect(() => {
    if (section === 'screens') setScreenTask(new URLSearchParams(window.location.search).get('ux') === 'connect' ? 'connect' : 'my-screens');
    if (section === 'scheduling') {const view=new URLSearchParams(window.location.search).get('ux');setProgrammingTask(view==='agendas'?'schedules':view==='listas'?'playlists':'screens');}
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
    {section === 'home' && <DoohOperationalScreensPanel
      disabledFallback={<DoohGettingStarted />}
    />}
    {section === 'screens' && <>
      <DoohWorkspaceTabs tabs={screenTasks} selected={screenTask} onSelect={setScreenTask} label="Tarefas de telas e dispositivos" />
      {screenTask === 'my-screens' && <DoohOperationalScreensPanel disabledFallback={<DoohPlayerInventoryReadOnly />} initialMediaId={new URLSearchParams(window.location.search).get('media') ?? undefined} />}
      {screenTask === 'connect' && <DoohOperationalScreensPanel disabledFallback={<DoohPlayerPairingAndAssignment />} />}
      {screenTask === 'manage' && <div className="space-y-4"><DoohPlayerInventoryReadOnly /><DoohPlayerOperations /><details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-medium">Associação comercial opcional</summary><DoohPlayerPairingAndAssignment /></details></div>}
      {screenTask === 'technical' && <div className="space-y-4">
        <DoohPlayerAuditReadOnly /><DoohGroupMembersSafeEditor /><DoohPlayerRestartQa />
      </div>}
    </>}
    {section === 'library' && <DoohMediaLibraryReadOnly />}
    {section === 'scheduling' && <>
      <DoohWorkspaceTabs tabs={programmingTasks} selected={programmingTask} onSelect={setProgrammingTask} label="Áreas de programação" />
      {programmingTask === 'screens' && <DoohOperationalScreensPanel contentOnly disabledFallback={<DoohPlaylistCatalogReadOnly />} />}
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
