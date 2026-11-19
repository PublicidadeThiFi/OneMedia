import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { DOOH_SECTION_PATHS } from '../lib/productNavigation';
import { parseDoohJourneySummary, type DoohJourneyStage, type DoohJourneySummary } from '../lib/doohOnboardingContract';

type JourneyResult = DoohJourneySummary | { state: 'error'; text: string; partial: false };
type JourneyState = Record<DoohJourneyStage, JourneyResult>;
const stages: { id: DoohJourneyStage; title: string; instruction: string; path: string; action: string }[] = [
  { id: 'screens', title: 'Conectar sua tela', instruction: 'Instale o player no dispositivo, gere o código e faça o pareamento; depois selecione uma tela SCREEN no inventário.', path: DOOH_SECTION_PATHS.screens, action: 'Abrir Telas e Players' },
  { id: 'library', title: 'Enviar uma imagem ou vídeo', instruction: 'Em Biblioteca, envie PNG, JPEG ou MP4. Aguarde o estado Pronta antes de montar a playlist.', path: DOOH_SECTION_PATHS.library, action: 'Abrir Biblioteca' },
  { id: 'playlists', title: 'Criar e publicar a playlist', instruction: 'Crie a playlist, adicione mídias prontas, revise a ordem e publique a versão, quando a operação estiver liberada.', path: DOOH_SECTION_PATHS.scheduling, action: 'Abrir Programação' },
  { id: 'schedules', title: 'Programar a tela', instruction: 'Crie uma agenda com período, fuso e destino, publique e depois materialize o manifest para o player autorizado.', path: DOOH_SECTION_PATHS.scheduling, action: 'Abrir Agendas' },
];
const failed: JourneyResult = { state: 'error', text: 'Não foi possível consultar esta etapa.', partial: false };

/** Operational counts are read from the tenant API. These are not proof of display. */
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

  if (!allowed) return <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600" aria-label="Começar com DOOH">
    Para acompanhar a configuração DOOH, entre com uma empresa autorizada e perfil ADMINISTRATIVO ou TI.
  </section>;
  const results = data?.key === requestKey ? data.results : null;
  return <section aria-label="Começar com DOOH" className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-xl font-semibold text-gray-900">Começar com DOOH</h3>
        <p className="mt-1 text-sm text-gray-600">Siga as etapas na ordem. Os números abaixo vêm da sua empresa e não representam exibição comprovada.</p></div>
      <button type="button" onClick={() => setVersion(n => n + 1)} disabled={loading}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Atualizar situação</button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Consultando situação das etapas...</p>}
    <ol className="grid gap-3 md:grid-cols-2">
      {stages.map((stage, idx) => {
        const info = results?.[stage.id];
        return <li key={stage.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-900">{idx + 1}. {stage.title}</h4>
          <p className="mt-2 text-sm leading-6 text-gray-600">{stage.instruction}</p>
          <p className="mt-2 text-xs font-medium text-gray-700" aria-live="polite">{info ? info.text : 'Aguardando consulta do servidor.'}{info?.partial ? ' Lista parcial; consulte o módulo para outros registros.' : ''}</p>
          <a href={stage.path} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline">{stage.action}</a>
        </li>;
      })}
    </ol>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">5. Conferir a exibição no dispositivo</p>
      <p className="mt-1">Depois de publicar a agenda, o manifest deve ser disponibilizado e sincronizado no player. Confira o status em Telas e Players e a reprodução no próprio dispositivo. Mídia Pronta, agenda Publicada e versões iguais não provam reprodução.</p>
      <p className="mt-2">O link público de um <strong>ponto do Marketplace</strong> é diferente do link do player. Para compartilhá-lo, abra OOH → Gestão Marketplace, selecione um ponto publicado e use “Copiar link”. O Player Web público ainda não está disponível nesta etapa.</p>
    </div>
    {results && <p className="text-xs text-gray-500">Consultado em: {data?.checkedAt}. Os catálogos de mídia, playlists e agendas podem ser limitados aos 100 registros mais recentes.</p>}
  </section>;
}
