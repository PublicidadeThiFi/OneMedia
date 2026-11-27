import { useEffect, useState } from 'react';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DoohMarketplaceCampaignSelection } from './campaigns/DoohMarketplaceCampaignSelection';
import { DoohGettingStarted } from './DoohGettingStarted';
import { DoohOverview } from './DoohOverview';
import { useAuth } from '../contexts/AuthContext';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohPlayerInventoryReadOnly } from './DoohPlayerInventoryReadOnly';
import { DoohOperationalScreensPanel } from './DoohOperationalScreensPanel';
import { DoohReportsPanel } from './DoohReportsPanel';
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
type ProgrammingTask = 'screens' | 'advanced' | 'marketplace';
const screenTasks = [
  { id: 'my-screens', label: 'Minhas telas', description: 'Crie uma tela pelo nome, conecte um aparelho e veja o que falta para exibir conteúdo.' },
  { id: 'connect', label: 'Conectar uma tela', description: 'Escolha ou crie uma tela e conecte um aparelho pelo código.' },
  { id: 'manage', label: 'Gerenciar dispositivos', description: 'Altere nomes e organize grupos quando tiver permissão.' },
] as const;
// F11d: support-only tools stay reachable for TI, out of everyone else's way.
const technicalTask = { id: 'technical', label: 'Suporte técnico', description: 'Histórico de comandos e grupos, para a equipe de TI.' } as const;
const programmingTasks = [
  { id: 'screens', label: 'Por tela', description: 'Escolha uma tela e defina o conteúdo e os horários em um só lugar.' },
  { id: 'marketplace', label: 'Campanhas do Marketplace', description: 'Vincule campanhas aprovadas conforme as regras da plataforma.' },
  { id: 'advanced', label: 'Modo avançado', description: 'Listas e agendas compartilhadas entre várias telas.' },
] as const;
type AdvancedView = 'playlists' | 'schedules';
const explanations: Record<DoohFoundationSection, string> = {
  home: 'Veja o que está passando em cada tela e o que precisa da sua atenção.',
  screens: 'Crie suas telas e conecte os aparelhos. Inventário comercial é opcional.',
  library: 'Envie imagens e vídeos e escolha onde exibir.',
  scheduling: 'Escolha o conteúdo e os horários de cada tela.',
  reports: 'Veja quantas vezes cada mídia foi exibida em cada tela.',
};

export function DoohFoundationPage({ section }: { section: DoohFoundationSection }) {
  const { snapshot } = useProductAccess();
  const { user } = useAuth();
  const isTechnical = (user?.roles ?? []).some(role => role === 'TI');
  const screenTabs = isTechnical ? [...screenTasks, technicalTask] : screenTasks;
  const urlView = () => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ux') : null;
  const [advancedView, setAdvancedView] = useState<AdvancedView>(() => urlView() === 'agendas' ? 'schedules' : 'playlists');
  const [screenTask, setScreenTask] = useState<ScreensTask>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ux') === 'connect'
      ? 'connect' : 'my-screens');
  const [programmingTask, setProgrammingTask] = useState<ProgrammingTask>(() =>
    urlView() === 'agendas' || urlView() === 'listas' ? 'advanced' : 'screens');
  useEffect(() => {
    if (section === 'screens') setScreenTask(new URLSearchParams(window.location.search).get('ux') === 'connect' ? 'connect' : 'my-screens');
    if (section === 'scheduling') {const view=urlView();setProgrammingTask(view==='agendas'||view==='listas'?'advanced':'screens');if(view==='agendas')setAdvancedView('schedules');else if(view==='listas')setAdvancedView('playlists');}
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
    {section === 'home' && <>
      <DoohOverview />
      <DoohOperationalScreensPanel disabledFallback={<DoohGettingStarted />} />
    </>}
    {section === 'screens' && <>
      <DoohWorkspaceTabs tabs={screenTabs} selected={screenTask} onSelect={setScreenTask} label="Tarefas de telas e dispositivos" />
      {screenTask === 'my-screens' && <DoohOperationalScreensPanel disabledFallback={<DoohPlayerInventoryReadOnly />} initialMediaId={new URLSearchParams(window.location.search).get('media') ?? undefined} />}
      {screenTask === 'connect' && <DoohOperationalScreensPanel disabledFallback={<DoohPlayerPairingAndAssignment />} />}
      {screenTask === 'manage' && <div className="space-y-4"><DoohPlayerInventoryReadOnly /><DoohPlayerOperations /><details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-medium">Associação comercial opcional</summary><DoohPlayerPairingAndAssignment /></details></div>}
      {screenTask === 'technical' && isTechnical && <div className="space-y-4">
        <DoohPlayerAuditReadOnly /><DoohGroupMembersSafeEditor /><DoohPlayerRestartQa />
      </div>}
    </>}
    {section === 'library' && <DoohMediaLibraryReadOnly />}
    {section === 'scheduling' && <>
      <DoohWorkspaceTabs tabs={programmingTasks} selected={programmingTask} onSelect={setProgrammingTask} label="Áreas de programação" />
      {programmingTask === 'screens' && <DoohOperationalScreensPanel contentOnly disabledFallback={<DoohPlaylistCatalogReadOnly />} />}
      {programmingTask === 'advanced' && <div className="space-y-4">
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">Para a maioria dos casos, use “Por tela”. O modo avançado serve para reaproveitar a mesma lista ou agenda em várias telas.</p>
        <DoohWorkspaceTabs tabs={[
          { id: 'playlists', label: 'Listas', description: 'Escolha as mídias prontas, defina a ordem e publique a lista.' },
          { id: 'schedules', label: 'Agendas', description: 'Escolha a lista publicada, os horários e as telas.' },
        ]} selected={advancedView} onSelect={setAdvancedView} label="Modo avançado" />
        {advancedView === 'playlists' ? <DoohPlaylistCatalogReadOnly /> : <DoohScheduleCatalogReadOnly />}
      </div>}
      {programmingTask === 'marketplace' && <DoohMarketplaceCampaignSelection />}
    </>}
    {section === 'reports' && <DoohReportsPanel />}
  </main>;
}
