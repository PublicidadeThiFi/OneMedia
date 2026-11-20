import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DOOH_SECTION_PATHS } from '../lib/productNavigation';
import { parseDoohJourneySummary, type DoohJourneyStage, type DoohJourneySummary } from '../lib/doohOnboardingContract';

type JourneyResult = DoohJourneySummary | { state: 'error'; text: string; partial: false };
type JourneyState = Record<DoohJourneyStage, JourneyResult>;
const stages: { id: DoohJourneyStage; title: string; instruction: string; path: string; action: string }[] = [
  { id: 'screens', title: 'Conectar sua tela', instruction: 'Abra o Player Web público no dispositivo, obtenha o código e associe a tela ao local cadastrado.', path: DOOH_SECTION_PATHS.screens, action: 'Ir para Telas e dispositivos' },
  { id: 'library', title: 'Adicionar uma mídia', instruction: 'Envie PNG, JPEG ou MP4 e prepare o arquivo até aparecer como Pronta.', path: DOOH_SECTION_PATHS.library, action: 'Adicionar mídia' },
  { id: 'playlists', title: 'Criar uma lista de exibição', instruction: 'Escolha as mídias prontas, organize a ordem e publique uma versão.', path: DOOH_SECTION_PATHS.scheduling, action: 'Criar lista de exibição' },
  { id: 'schedules', title: 'Definir quando exibir', instruction: 'Escolha uma lista publicada, os horários e a tela de destino; depois publique a agenda.', path: `${DOOH_SECTION_PATHS.scheduling}?ux=agendas`, action: 'Programar exibição' },
];
const failed: JourneyResult = { state: 'error', text: 'Não foi possível consultar esta etapa.', partial: false };

/** UX01: honest, progressive navigation from read-only tenant summaries (no playback claims). */
export function DoohGettingStarted() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? null;
  const roles = user?.roles ?? [];
  const allowed = Boolean(companyId && snapshot?.companyId === companyId && snapshot.modules.DOOH.granted &&
    ['FULL', 'READ_ONLY'].includes(snapshot.modules.DOOH.accessMode) && roles.some(role => role === 'ADMINISTRATIVO' || role === 'TI'));
  const key = JSON.stringify([user?.id, companyId, snapshot?.companyId, snapshot?.modules.DOOH.granted,
    snapshot?.modules.DOOH.accessMode, [...roles].sort().join(',')]);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<{ key: string; results: JourneyState; checkedAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const requestKey = `${key}:${version}`;

  useEffect(() => {
    setData(null);
    if (!allowed || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const options = { signal: controller.signal };
    const tasks: Record<DoohJourneyStage, Promise<DoohJourneySummary | null>> = {
      screens: apiClient.get<unknown>('/dooh/players', { ...options, params: { page: 1, pageSize: 20 } })
        .then(({ data }) => parseDoohJourneySummary('screens', data, companyId)),
      library: Promise.all([apiClient.get<unknown>('/dooh/folders', options),
        apiClient.get<unknown>('/dooh/media', { ...options, params: { take: 100 } })])
        .then(([folders, media]) => parseDoohJourneySummary('library', media.data, companyId, folders.data)),
      playlists: apiClient.get<unknown>('/dooh/playlists', options)
        .then(({ data }) => parseDoohJourneySummary('playlists', data, companyId)),
      schedules: apiClient.get<unknown>('/dooh/schedules', options)
        .then(({ data }) => parseDoohJourneySummary('schedules', data, companyId)),
    };
    void Promise.all(stages.map(async stage => {
      try { return await tasks[stage.id] ?? failed; } catch { return failed; }
    })).then(values => {
      if (controller.signal.aborted) return;
      const results = Object.fromEntries(stages.map((stage, idx) => [stage.id, values[idx]])) as JourneyState;
      setData({ key: requestKey, results, checkedAt: new Date().toLocaleString('pt-BR') });
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestKey, allowed, companyId]);

  if (!allowed) return <section className="rounded-2xl border bg-white p-5 text-sm text-gray-600" aria-label="Configuração DOOH">
    Para acompanhar as telas digitais, entre com uma empresa autorizada e perfil ADMINISTRATIVO ou TI.
  </section>;
  const results = data?.key === requestKey ? data.results : null;
  const nextIndex = results ? stages.findIndex(stage => results[stage.id].state !== 'found') : 0;
  const next = nextIndex === -1 ? null : stages[nextIndex];
  const present = results ? stages.filter(stage => results[stage.id].state === 'found').length : 0;
  return <section aria-label="Começar com DOOH" className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-gray-900">Sua configuração, passo a passo</h2>
        <p className="mt-1 text-sm text-gray-600">Você não precisa configurar tudo de uma vez. Continue pela próxima etapa.</p></div>
      <button type="button" onClick={() => setVersion(n => n + 1)} disabled={loading}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 focus-visible:outline-indigo-600 disabled:opacity-50">Atualizar situação</button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando dados da sua empresa…</p>}
    {!loading && results && <p role="status" aria-live="polite" className="text-sm font-medium text-gray-700">
      Recursos encontrados em {present} de 4 etapas. Isso indica registros no sistema, não exibição comprovada.
    </p>}
    <div className="rounded-2xl bg-indigo-50 p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{next ? `Próximo passo · ${nextIndex + 1} de 5` : 'Último passo · 5 de 5'}</p>
      <h3 className="mt-2 text-lg font-bold text-gray-900">{next?.title ?? 'Preparar e sincronizar esta tela'}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">{next?.instruction ?? 'Após publicar a agenda, abra os detalhes da tela para revisar e preparar a atualização. No Player Web, sincronize a programação e confira o conteúdo na própria tela.'}</p>
      {next && results?.[next.id] && <p className="mt-2 text-sm text-gray-700" aria-live="polite">{results[next.id].text}</p>}
      <a className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        href={next?.path ?? DOOH_SECTION_PATHS.screens}>{next?.action ?? 'Ver detalhes da tela'}</a>
    </div>
    <button type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}
      className="text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-indigo-600">
      {showAll ? 'Ocultar outras etapas' : 'Ver todas as etapas'}
    </button>
    {showAll && <ol className="grid gap-3 md:grid-cols-2">
      {stages.map((stage, idx) => {
        const info = results?.[stage.id];
        return <li key={stage.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-indigo-700">Etapa {idx + 1} · {info?.state === 'found' ? 'Há registros' : info?.state === 'error' ? 'Precisa de atenção' : 'Não confirmada'}</p>
          <h4 className="mt-1 font-semibold text-gray-900">{stage.title}</h4>
          <p className="mt-2 text-sm text-gray-600">{info?.text ?? 'Aguardando consulta'}{info?.partial ? ' (resultados parciais)' : ''}</p>
          <a href={stage.path} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:underline">Abrir etapa</a>
        </li>;
      })}
      <li className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-indigo-700">Etapa 5 · Exige conferência</p>
        <h4 className="mt-1 font-semibold text-gray-900">Sincronizar e conferir</h4>
        <p className="mt-2 text-sm text-gray-600">Manifest preparado não significa mídia baixada ou conteúdo exibido. Confira no navegador do dispositivo.</p>
        <a href={DOOH_SECTION_PATHS.screens} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:underline">Abrir minhas telas</a>
      </li>
    </ol>}
    {results && <p className="text-xs text-gray-500">Consultado em {data?.checkedAt}. Catálogos de mídias, listas e agendas podem ser parciais; não há contagem de reprodução.</p>}
  </section>;
}
