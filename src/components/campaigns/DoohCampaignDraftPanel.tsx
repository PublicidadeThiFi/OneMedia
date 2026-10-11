import { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { Button } from '../ui/button';

type Screen = { mediaUnitId: string; label: string; startsAt: string; endsAt: string };
type PlaylistVersion = { id: string; version: number; playlistId: string; playlistName: string };
type Draft = { id: string; status: string; updatedAt: string; playlistVersionId: string; mediaUnitId: string | null };
type DeliverySchedule = {
  scheduleId: string; mediaUnitId: string; playlistVersionId: string; status: string;
  publishedAt: string | null; reportedEventCount: number; reportedPlayedCount: number;
  eventResults: Array<{ result: string | null; count: number }>;
};
type Delivery = {
  campaignId: string; evidenceType: 'PLAYER_REPORTED'; noAudienceOrImpressionClaim: true;
  manifestPublicationNotInferred: true; schedules: DeliverySchedule[];
};
type Plan = {
  campaignId: string;
  campaignName: string;
  screens: Screen[];
  playlistVersions: PlaylistVersion[];
  drafts: Draft[];
  publicationAutomatic: false;
};

/** D12 manual bridge; never publishes schedules or triggers billing/booking. */
export function DoohCampaignDraftPanel({ campaignId }: { campaignId: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [unitId, setUnitId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Plan>(`/dooh/marketplace/campaigns/${campaignId}/plan`);
      setPlan(response.data);
      setUnitId((prev) => response.data.screens.some((screen) => screen.mediaUnitId === prev)
        ? prev : response.data.screens[0]?.mediaUnitId ?? '');
      setVersionId((prev) => response.data.playlistVersions.some((version) => version.id === prev)
        ? prev : response.data.playlistVersions[0]?.id ?? '');
    } catch {
      setPlan(null);
      setError('Não foi possível consultar as condições DOOH desta campanha. Verifique se a proposta foi aprovada e originada no Marketplace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDelivery(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const createDraft = async () => {
    if (!unitId || !versionId || !timezone.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiClient.post<{ scheduleId: string; status: string; created: boolean }>(
        `/dooh/marketplace/campaigns/${campaignId}/drafts`,
        { mediaUnitId: unitId, playlistVersionId: versionId, timezone: timezone.trim() },
      );
      setNotice(response.data.created
        ? `Agenda ${response.data.scheduleId.slice(0, 8)}… criada em DRAFT. Revise a janela e publique separadamente quando autorizada.`
        : `Agenda ${response.data.scheduleId.slice(0, 8)}… já vinculada. Nenhuma nova agenda foi criada.`);
      setDelivery(null);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Não foi possível criar o rascunho. Verifique permissões, tela e playlist.');
    } finally {
      setSaving(false);
    }
  };

  const fetchDelivery = async () => {
    setDeliveryLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Delivery>(`/dooh/marketplace/campaigns/${campaignId}/delivery`);
      setDelivery(response.data);
    } catch {
      setError('Não foi possível carregar os eventos de exibição relatados pelos players.');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const publishDraft = async (draft: Draft) => {
    if (draft.status !== 'DRAFT' || !draft.updatedAt || publishing) return;
    const approved = window.confirm(
      'Confirmar publicação manual da agenda DOOH? Esta ação publica a agenda, mas não envia automaticamente um manifest ao player. A programação e a autorização comercial serão revalidadas.',
    );
    if (!approved) return;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      await apiClient.post(`/dooh/schedules/${draft.id}/publish`, { expectedUpdatedAt: draft.updatedAt });
      setNotice('Agenda publicada manualmente. A sincronização efetiva do player depende do pipeline de manifest DOOH.');
      setDelivery(null);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'A publicação foi recusada. Verifique aprovação, player ativo, conflitos de programação e versão da playlist.');
    } finally {
      setPublishing(false);
    }
  };

  const selected = plan?.screens.find((screen) => screen.mediaUnitId === unitId);
  const existing = plan?.drafts.find((draft) => draft.mediaUnitId === unitId);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Programação DOOH — aprovação manual</p>
        <p className="mt-1">Este vínculo cria apenas uma agenda em rascunho, com a tela aprovada na proposta. Não publica conteúdo, não reserva espaço e não efetua cobrança.</p>
      </div>
      {loading && <p className="text-sm text-gray-500">Carregando telas e playlists...</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-900">{notice}</p>}
      {plan && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-700 space-y-2 block">
              <span className="block font-medium">Tela DOOH da campanha</span>
              <select className="w-full rounded-md border border-gray-300 bg-white p-2" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {plan.screens.map((screen) => <option key={screen.mediaUnitId} value={screen.mediaUnitId}>{screen.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-700 space-y-2 block">
              <span className="block font-medium">Versão publicada da playlist</span>
              <select className="w-full rounded-md border border-gray-300 bg-white p-2" value={versionId} onChange={(e) => setVersionId(e.target.value)}>
                {plan.playlistVersions.map((version) => <option key={version.id} value={version.id}>{version.playlistName} · v{version.version}</option>)}
              </select>
            </label>
          </div>
          <label className="text-sm text-gray-700 space-y-2 block max-w-sm">
            <span className="block font-medium">Timezone IANA</span>
            <input className="w-full rounded-md border border-gray-300 p-2" value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={64} />
          </label>
          {selected && <p className="text-sm text-gray-600">Janela inicial conforme campanha: {new Date(selected.startsAt).toISOString().slice(0, 16).replace('T', ' ')} UTC até {new Date(selected.endsAt).toISOString().slice(0, 16).replace('T', ' ')} UTC. Revise a programação antes de publicá-la.</p>}
          {existing && <p className="text-sm text-amber-800">Esta tela já tem uma agenda vinculada ({existing.status}). Uma nova seleção de playlist não substitui silenciosamente esse vínculo.</p>}
          {existing?.status === 'DRAFT' && <div className="space-y-2 rounded-md border border-amber-200 p-3 text-sm">
            <p>Publicação manual da agenda {existing.id.slice(0, 8)}…: o backend validará novamente proposta, campanha, player ativo e conflitos.</p>
            <Button type="button" variant="outline" disabled={publishing || loading || !existing.updatedAt} onClick={() => void publishDraft(existing)}>
              {publishing ? 'Publicando...' : 'Publicar agenda manualmente'}
            </Button>
            <p className="text-xs text-gray-600">Publicar a agenda não equivale a publicar manifest nem a comprovar exibição.</p>
          </div>}
          {(!plan.screens.length || !plan.playlistVersions.length) && <p className="text-sm text-amber-800">É necessário ter uma tela SCREEN aprovada e uma playlist com versão publicada para criar a agenda.</p>}
          <div className="flex items-center gap-3">
            <Button type="button" disabled={saving || loading || !unitId || !versionId || !!existing} onClick={() => void createDraft()}>
              {saving ? 'Criando rascunho...' : 'Criar agenda DRAFT'}
            </Button>
            <Button type="button" variant="outline" disabled={loading || saving} onClick={() => void load()}>Atualizar</Button>
            <Button type="button" variant="outline" disabled={deliveryLoading || loading} onClick={() => void fetchDelivery()}>
              {deliveryLoading ? 'Consultando...' : 'Consultar eventos de exibição'}
            </Button>
          </div>
          {delivery && <section aria-label="Evidências técnicas DOOH" className="space-y-3 rounded-md border border-gray-200 p-4">
            <h3 className="font-semibold text-sm">Programações e relatos de exibição</h3>
            <p className="text-xs text-gray-600">Os números abaixo são eventos técnicos informados pelos players. Não representam audiência, pessoas impactadas, impressões publicitárias verificadas nem garantia de exibição física.</p>
            {delivery.schedules.length === 0 && <p className="text-sm text-gray-600">Nenhuma programação vinculada a esta campanha.</p>}
            {delivery.schedules.map((schedule) => <div key={schedule.scheduleId} className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
              <p><strong>Agenda:</strong> {schedule.scheduleId.slice(0, 8)}… · {schedule.status}</p>
              <p><strong>Publicada em:</strong> {schedule.publishedAt ? new Date(schedule.publishedAt).toLocaleString('pt-BR') : 'Ainda não publicada'}</p>
              <p><strong>Eventos recebidos:</strong> {schedule.reportedEventCount} · <strong>Relatados como PLAYED:</strong> {schedule.reportedPlayedCount}</p>
              {schedule.eventResults.length > 0 && <p className="text-xs text-gray-600">Resultados: {schedule.eventResults.map((result) => `${result.result ?? 'SEM_RESULTADO'}: ${result.count}`).join(' · ')}</p>}
              {schedule.reportedEventCount === 0 && <p className="text-xs text-gray-500">Sem eventos recebidos; isso não comprova ausência de exibição.</p>}
            </div>)}
          </section>}
        </div>
      )}
    </div>
  );
}
