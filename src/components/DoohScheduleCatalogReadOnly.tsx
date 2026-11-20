import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohWorkspaceTabs } from './DoohWorkspaceTabs';
import { DoohScheduleTargetsCasEditor } from './DoohScheduleTargetsCasEditor';
import { DoohScheduleDetailsCasEditor } from './DoohScheduleDetailsCasEditor';
import { DoohScheduleTemporalPreview } from './DoohScheduleTemporalPreview';
import { DoohSchedulePublicationAudit } from './DoohSchedulePublicationAudit';
import { DoohSchedulePublishQa } from './DoohSchedulePublishQa';
import { canReadDoohSchedules, doohScheduleReadError, parseDoohSchedule,
  parseDoohScheduleCatalog, parseDoohScheduleTargets, type DoohScheduleSummary,
  type DoohScheduleTargetInventory,
} from '../lib/doohScheduleCatalogContract';

const statusText = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', PAUSED: 'Pausada', ARCHIVED: 'Arquivada' } as const;
const priorityText = { TAKEOVER: 'Prioritária', STANDARD: 'Padrão', FALLBACK: 'Reserva' } as const;
const targetText = { PLAYER: 'Player', GROUP: 'Grupo', MEDIA_UNIT: 'Tela', MEDIA_POINT: 'Ponto' } as const;
const dayText = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const stamp = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Sem limite definido';
const minute = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const shortId = (value: string) => `${value.slice(0, 8)}…`;

/** D15D-01: inventário operacional GET; não altera agendas, destinos ou players. */
export function DoohScheduleCatalogReadOnly() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const roles = user?.roles ?? [];
  const companyId = user?.companyId ?? null;
  const access = snapshot?.modules.DOOH;
  const allowed = canReadDoohSchedules(companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, roles);
  const contextKey = JSON.stringify([user?.id, companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...roles].sort()]);
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'details' | 'edit' | 'targets' | 'publish' | 'advanced'>('details');
  const [listing, setListing] = useState<{ key: string; items: DoohScheduleSummary[] } | null>(null);
  const [detail, setDetail] = useState<{ key: string; item: DoohScheduleSummary } | null>(null);
  const [targets, setTargets] = useState<{ key: string; items: DoohScheduleTargetInventory } | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [targetsError, setTargetsError] = useState('');
  const listKey = JSON.stringify([contextKey, refresh]);
  const detailKey = JSON.stringify([listKey, selectedId]);
  const latestDetailKey = useRef(detailKey);
  latestDetailKey.current = detailKey;

  useEffect(() => { setSelectedId(''); setShowCreate(false); setShowPreview(false); setSelectedAction('details'); setListing(null); setDetail(null); setTargets(null); setError(''); }, [contextKey]);
  useEffect(() => {
    setListing(null); setDetail(null); setTargets(null); setError('');
    if (!allowed || !companyId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void apiClient.get<unknown>('/dooh/schedules', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const result = parseDoohScheduleCatalog(data, companyId);
        if (!result) { setError('Resposta do catálogo de agendas incompatível com a API.'); return; }
        setListing({ key: listKey, items: result });
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(doohScheduleReadError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, companyId, listKey]);

  const entries = listing?.key === listKey ? listing.items : null;
  const selectedSummary = entries?.find((s) => s.id === selectedId) ?? null;
  useEffect(() => {
    setDetail(null); setTargets(null); setDetailError(''); setTargetsError('');
    if (!allowed || !companyId || !selectedSummary) { setDetailLoading(false); return; }
    const controller = new AbortController();
    setDetailLoading(true);
    void apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || latestDetailKey.current !== detailKey) return;
        const result = parseDoohSchedule(data, companyId);
        if (!result || result.id !== selectedId || JSON.stringify(result) !== JSON.stringify(selectedSummary)) {
          setDetailError('Agenda modificada ou incompatível com o catálogo. Atualize a lista.'); return;
        }
        setDetail({ key: detailKey, item: result });
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && latestDetailKey.current === detailKey) setDetailError(doohScheduleReadError(err));
      }).finally(() => {
        if (!controller.signal.aborted && latestDetailKey.current === detailKey) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [allowed, companyId, selectedId, selectedSummary, detailKey]);

  const current = detail?.key === detailKey ? detail.item : null;
  const targetsKey = JSON.stringify([detailKey, current?.updatedAt, current?.id]);
  const latestTargetsKey = useRef(targetsKey);
  latestTargetsKey.current = targetsKey;
  useEffect(() => {
    setTargets(null); setTargetsError('');
    if (!allowed || !companyId || !current) { setTargetsLoading(false); return; }
    const controller = new AbortController();
    setTargetsLoading(true);
    void apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(current.id)}/targets`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || latestTargetsKey.current !== targetsKey) return;
        const result = parseDoohScheduleTargets(data, companyId, current);
        if (!result) { setTargetsError('Destinos alterados ou resposta incompatível. Atualize o catálogo.'); return; }
        setTargets({ key: targetsKey, items: result });
      }).catch((err: unknown) => {
        if (!controller.signal.aborted && latestTargetsKey.current === targetsKey) setTargetsError(doohScheduleReadError(err));
      }).finally(() => {
        if (!controller.signal.aborted && latestTargetsKey.current === targetsKey) setTargetsLoading(false);
      });
    return () => controller.abort();
  }, [allowed, companyId, current, targetsKey]);

  if (!allowed) return <section aria-label="Agendas DOOH D15D-01" className="rounded-xl border bg-gray-50 p-5 text-sm text-gray-600">
    Consulta de agendas requer empresa autorizada, grant DOOH e função ADMINISTRATIVO ou TI. Nenhum dado foi consultado.
  </section>;
  const targetInventory = targets?.key === targetsKey ? targets.items : null;
  return <section aria-label="Minhas agendas DOOH" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">Minhas agendas</h3>
        <p className="text-sm text-gray-600">Escolha quando e onde cada lista publicada será exibida.</p>
        
      </div>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => { setShowCreate(value => !value); setSelectedId(''); }}>{showCreate ? 'Ver agendas' : 'Criar agenda'}</Button><Button type="button" variant="outline" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>Atualizar</Button></div>
    </div>
    <p className="text-xs text-gray-600">Mostrando até 100 agendas recentes; este resultado pode ser parcial.</p>
    <details className="text-xs text-gray-600"><summary className="cursor-pointer">Sobre a publicação e a exibição</summary>
      <p className="mt-1">Agenda publicada não comprova distribuição, manifest atualizado, reprodução ou audiência. Preparar e sincronizar são passos posteriores.</p>
    </details>
    {showCreate && companyId && entries && <DoohScheduleDetailsCasEditor companyId={companyId} mode="create"
      existingIds={entries.map(s => s.id)} onChanged={() => setRefresh(n => n + 1)} />}
    {loading && <p role="status" className="text-sm text-gray-600">Carregando agendas…</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {entries && <>
      {!showCreate && <p className="text-xs text-gray-600">{entries.length} agenda(s) encontradas.</p>}
      {showCreate ? null : entries.length === 0 ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">Nenhuma agenda cadastrada. Crie uma para definir quando e onde exibir.</p> :
      <><ul className="grid gap-3 md:hidden">{entries.map(item => <li key={item.id} className="rounded-xl border bg-gray-50 p-4 text-sm">
        <p className="font-semibold text-gray-900">{item.name}</p><p className="mt-1">{statusText[item.status]} · {priorityText[item.priority]} · {item.targetCount} destino(s)</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedId(item.id); setSelectedAction('details'); setShowCreate(false); }}>Ver agenda</Button>
      </li>)}</ul><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b bg-gray-50"><tr><th className="p-2">Agenda</th><th className="p-2">Estado</th><th className="p-2">Prioridade</th><th className="p-2">Destinos</th><th className="p-2">Atualização</th><th className="p-2">Detalhes</th></tr></thead>
        <tbody>{entries.map((s) => <tr key={s.id} className="border-b text-gray-700">
          <td className="p-2 font-medium break-words">{s.name}</td><td className="p-2">{statusText[s.status]}</td>
          <td className="p-2">{priorityText[s.priority]}</td><td className="p-2">{s.targetCount}</td>
          <td className="p-2">{stamp(s.updatedAt)}</td><td className="p-2"><Button type="button" size="sm" variant="outline"
            onClick={() => { setSelectedId(s.id); setSelectedAction('details'); setShowCreate(false); }} aria-label={`Consultar agenda ${s.name}`}>Ver agenda</Button></td>
        </tr>)}</tbody>
      </table></div></>}
    </>}
    {entries && companyId && <section className="rounded-xl border bg-gray-50 p-4 text-sm">
      <button type="button" aria-expanded={showPreview} onClick={() => setShowPreview(value => !value)}
        className="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-indigo-600">
        {showPreview ? 'Ocultar prévia de horários' : 'Mais opções · prévia de horários e prioridades'}
      </button>
      {showPreview && <div className="mt-4"><DoohScheduleTemporalPreview companyId={companyId} schedules={entries} catalogRevision={listKey} /></div>}
    </section>}
    {selectedSummary && <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex justify-between gap-3"><h4 className="font-semibold text-gray-900">{selectedSummary.name}</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId('')}>Fechar</Button></div>
      {detailLoading && <p role="status" className="text-sm text-gray-600">Consultando agenda…</p>}
      {detailError && <p role="alert" className="text-sm text-red-800">{detailError}</p>}
      {current && <>
        <DoohWorkspaceTabs label="Ações da agenda" selected={selectedAction} onSelect={setSelectedAction} tabs={[
          { id: 'details', label: 'Resumo', description: 'Confira o que foi salvo e a situação da agenda.' },
          { id: 'edit', label: 'Horários', description: 'Ajuste datas, horários e a lista enquanto a agenda estiver em edição.' },
          { id: 'targets', label: 'Onde exibir', description: 'Escolha as telas de destino antes de publicar.' },
          { id: 'publish', label: 'Publicar agenda', description: 'Revise tudo antes de confirmar a publicação.' },
          { id: 'advanced', label: 'Detalhes técnicos', description: 'Histórico, IDs e evidências de alterações.' },
        ]} />
        {selectedAction === 'details' && <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
          <p><strong>Nome:</strong> {current.name}</p><p><strong>Estado:</strong> {statusText[current.status]}</p>
          <p><strong>Prioridade:</strong> {priorityText[current.priority]}</p><p><strong>Fuso:</strong> {current.timezone}</p>
          <p><strong>Lista escolhida:</strong> Versão publicada (identificador nos detalhes técnicos)</p>
          <p><strong>Publicação:</strong> {current.publishedAt ? stamp(current.publishedAt) : 'Não registrada'}</p>
          <p><strong>Início:</strong> {stamp(current.startsAt)}</p><p><strong>Fim:</strong> {stamp(current.endsAt)}</p>
          <p><strong>Dias:</strong> {current.weekdays.length ? current.weekdays.map((d) => dayText[d - 1]).join(', ') : 'Sem restrição de dia configurada'}</p>
          <p><strong>Faixa diária:</strong> {current.dailyStartMinute === null || current.dailyEndMinute === null ? 'Sem faixa configurada' : `${minute(current.dailyStartMinute)} – ${minute(current.dailyEndMinute)}`}</p>
        </div>}
        {selectedAction === 'edit' && current.status === 'DRAFT' && companyId && <DoohScheduleDetailsCasEditor
          companyId={companyId} mode="edit" summary={current} existingIds={entries?.map(s => s.id) ?? []}
          onChanged={() => setRefresh(n => n + 1)} />}
        {(selectedAction === 'targets' || selectedAction === 'publish') && <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-medium text-gray-800">Telas de destino ({current.targetCount})</p>
          {targetsLoading && <p role="status" className="text-xs text-gray-600">Consultando destinos…</p>}
          {targetsError && <p role="alert" className="text-xs text-red-800">{targetsError}</p>}
          {targetInventory && <>
            {targetInventory.capped && <p className="text-xs text-amber-800">Limite de 100 destinos da API atingido. Não presumir lista completa.</p>}
            {targetInventory.targets.length === 0 ? <p className="text-xs text-gray-600">Nenhum destino associado.</p> :
              <ul className="mt-2 space-y-1 text-xs text-gray-700">{targetInventory.targets.map((t) => <li key={t.id}>
                {targetText[t.targetType]} · {shortId(t.targetId)} · associado em {stamp(t.createdAt)}
              </li>)}</ul>}
          </>}
          {selectedAction === 'publish' && targetInventory && current.status === 'DRAFT' && companyId &&
            <DoohSchedulePublishQa companyId={companyId} summary={current} inventory={targetInventory}
              onChanged={() => setRefresh((value) => value + 1)} />}
          {selectedAction === 'targets' && targetInventory && current.status === 'DRAFT' && companyId &&
            <DoohScheduleTargetsCasEditor companyId={companyId} summary={current} inventory={targetInventory}
              onChanged={() => setRefresh((value) => value + 1)} />}
        </div>}
        {selectedAction === 'advanced' && companyId && <DoohSchedulePublicationAudit companyId={companyId} summary={current} />}
        {selectedAction === 'advanced' && <p className="text-xs text-gray-600">Identificador da versão da lista: {current.playlistVersionId}. Os destinos são vínculos registrados, não prova de exibição.</p>}
        {selectedAction === 'details' && current.status === 'PUBLISHED' && <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
          <p className="font-semibold">Agenda publicada. Próximo passo: preparar a atualização da tela.</p>
          <a href="/app/dooh/screens" className="mt-2 inline-flex font-semibold underline">Abrir minhas telas</a>
          <p className="mt-2 text-xs">Publicar uma agenda não sincroniza o dispositivo automaticamente.</p>
        </div>}
      </>}
    </div>}
  </section>;
}
