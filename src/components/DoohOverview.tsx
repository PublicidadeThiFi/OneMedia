import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DOOH_SECTION_PATHS } from '../lib/productNavigation';
import { parseOperationalScreenPage } from '../lib/doohOperationalScreenContract';
import { doohReportParams, parseDoohReportSummary } from '../lib/doohReportsContract';
import { doohOverviewHeadline, summarizeDoohScreens, type DoohScreensOverview } from '../lib/doohScreenDiagnosticContract';

type Numbers = { screens: DoohScreensOverview | null; plays: number | null; checkedAt: string };

/** F11d — home summary: how many screens are showing, which need attention, plays today. Read-only. */
export function DoohOverview() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? '';
  const roles = user?.roles ?? [];
  const allowed = !!companyId && snapshot?.companyId === companyId && !!snapshot?.modules.DOOH.granted &&
    snapshot.modules.DOOH.accessMode !== 'NONE' && roles.some(r => r === 'ADMINISTRATIVO' || r === 'TI');
  const writable = allowed && snapshot?.modules.DOOH.accessMode === 'FULL';
  const [data, setData] = useState<Numbers | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const timer = window.setInterval(() => { if (!document.hidden) setTick(v => v + 1); }, 30000);
    return () => window.clearInterval(timer);
  }, [allowed]);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void Promise.allSettled([
      apiClient.get<unknown>('/dooh/operational-screens', { params: { page: 1, pageSize: 100 }, signal: controller.signal }),
      apiClient.get<unknown>('/dooh/reports/summary', { params: doohReportParams('today', 'PLAYER'), signal: controller.signal }),
    ]).then(([screens, report]) => {
      if (controller.signal.aborted) return;
      const page = screens.status === 'fulfilled' ? parseOperationalScreenPage(screens.value.data) : null;
      const summary = report.status === 'fulfilled' ? parseDoohReportSummary(report.value.data, companyId, 'PLAYER') : null;
      setData({ screens: page ? summarizeDoohScreens(page.items) : null, plays: summary ? summary.total : null,
        checkedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
    });
    return () => controller.abort();
  }, [allowed, companyId, tick]);
  if (!allowed) return null;
  const s = data?.screens;
  const tiles = [
    { label: 'Em exibição agora', value: s ? `${s.playing} de ${s.total}` : '—', tone: 'bg-emerald-50 text-emerald-900' },
    { label: 'Precisam de atenção', value: s ? String(s.attention) : '—', tone: s && s.attention > 0 ? 'bg-amber-50 text-amber-900' : 'bg-gray-50 text-gray-900' },
    { label: 'Exibições hoje', value: data?.plays === null || data?.plays === undefined ? '—' : data.plays.toLocaleString('pt-BR'), tone: 'bg-indigo-50 text-indigo-900' },
  ];
  const actions = [
    { label: 'Conectar uma tela', href: `${DOOH_SECTION_PATHS.screens}?ux=connect` },
    { label: 'Enviar mídia', href: DOOH_SECTION_PATHS.library },
    { label: 'Programar conteúdo', href: DOOH_SECTION_PATHS.scheduling },
    { label: 'Ver relatórios', href: DOOH_SECTION_PATHS.reports },
  ];
  return <section aria-label="Resumo das telas" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-bold text-gray-900">{s ? doohOverviewHeadline(s) : 'Consultando suas telas…'}</h2>
      {data && <p className="text-xs text-gray-500">Atualizado às {data.checkedAt}</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map(t => <div key={t.label} className={`rounded-xl p-4 ${t.tone}`}>
        <p className="text-sm">{t.label}</p><p className="mt-1 text-2xl font-bold">{t.value}</p>
      </div>)}
    </div>
    {writable && <nav aria-label="Atalhos" className="flex flex-wrap gap-2">
      {actions.map(a => <a key={a.label} href={a.href} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{a.label}</a>)}
    </nav>}
  </section>;
}
