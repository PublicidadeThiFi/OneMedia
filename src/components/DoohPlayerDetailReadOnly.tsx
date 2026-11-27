import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import {
  doohPlayerDetailSignals,
  parseDoohPlayerDetail,
  type DoohPlayerDetailView,
} from '../lib/doohPlayerDetailContract';
import { Button } from './ui/button';
import { doohPlayerReadFailure } from '../lib/doohPlayerReadFailure';
import { DoohManifestInventoryReadOnly } from './DoohManifestInventoryReadOnly';
import { DoohManifestPublishQa } from './DoohManifestPublishQa';
import { DoohManifestSyncDiagnosticReadOnly } from './DoohManifestSyncDiagnosticReadOnly';

function when(value: string | null): string {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : 'Indisponível';
}

/** Consulta exclusiva a GET de detalhe, isolada pelo parent por empresa/player/filtros. */
export function DoohPlayerDetailReadOnly({ companyId, playerId, onClose }: {
  companyId: string;
  playerId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<DoohPlayerDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'status' | 'update' | 'advanced'>('status');

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    setLoading(true);
    void apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(playerId)}`, {
      signal: controller.signal,
    }).then(({ data: result }) => {
      if (controller.signal.aborted) return;
      const parsed = parseDoohPlayerDetail(result, playerId);
      if (!parsed) {
        setError('Não foi possível carregar o aparelho. Tente de novo em instantes.');
        return;
      }
      setData(parsed);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(doohPlayerReadFailure(error, 'detail'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [companyId, playerId]);

  const signals = data ? doohPlayerDetailSignals(data) : [];

  return <section aria-label="Detalhes técnicos do player" className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="font-semibold text-gray-900">Situação desta tela</h4>
        <p className="mt-1 text-xs text-gray-600">Confira a licença, a conexão e a versão da programação. A reprodução deve ser verificada no dispositivo.</p>
      </div>
      <Button type="button" variant="outline" onClick={onClose}>Fechar detalhes</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Carregando detalhes do player…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
        <div><div className="text-xs text-gray-500">Player / plataforma</div><div className="font-medium">{data.name || 'Sem nome'} · {data.platform || 'Não informada'}</div></div>
        <div><div className="text-xs text-gray-500">Licença do dispositivo</div><div className="font-medium">{data.lifecycleStatus === 'ACTIVE' ? 'Ativa' : data.lifecycleStatus === 'INACTIVE' ? 'Inativa' : 'Encerrada'}</div></div>
        <div><div className="text-xs text-gray-500">Conexão</div><div className="font-medium">{data.lifecycleStatus !== 'ACTIVE' ? 'Sem operação autorizada' : data.online ? 'Contato recente' : 'Sem contato recente'}</div></div>
        <div><div className="text-xs text-gray-500">Última comunicação</div><div>{when(data.lastSeenAt)}</div></div>
        <div><div className="text-xs text-gray-500">Intervalo de comunicação</div><div>{data.offlineAfterSeconds} segundos</div></div>
        <div><div className="text-xs text-gray-500">Versão do aplicativo</div><div>{data.appVersion || 'Não informada'}</div></div>
        <div><div className="text-xs text-gray-500">Tela associada</div><div>{data.screen ? `${data.screen.name}${data.screen.point ? ` · ${data.screen.point}` : ''}` : 'Não associada'}</div></div>
        <div><div className="text-xs text-gray-500">Atualização da programação</div>
          <div>{data.currentManifestVersion === data.desiredManifestVersion ? `Versão ${data.currentManifestVersion} registrada no dispositivo` : `Versão ${data.desiredManifestVersion} preparada; dispositivo informa versão ${data.currentManifestVersion}`}</div>
        </div>
        <div><div className="text-xs text-gray-500">Credencial técnica</div><div>{data.credentialActive ? 'Ativa' : 'Inativa'} · uso: {when(data.credentialLastUsedAt)}</div></div>
        <div><div className="text-xs text-gray-500">Grupos</div><div>{data.groups.length ? data.groups.join(', ') : 'Nenhum'}</div></div>
        <div><div className="text-xs text-gray-500">Manifests / comandos registrados</div><div>{data.manifestCount} / {data.commandCount}</div></div>
        <div><div className="text-xs text-gray-500">Eventos técnicos recebidos do player</div><div>{data.playbackEventCount}</div></div>
      </div>
      {signals.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="mb-2 text-sm font-medium text-amber-950">Pontos para conferência</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{signals.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>}
      <div role="group" aria-label="Ações da tela" className="flex flex-wrap gap-2">
        <Button type="button" variant={panel === 'status' ? 'default' : 'outline'} onClick={() => setPanel('status')}>Situação</Button>
        <Button type="button" variant={panel === 'update' ? 'default' : 'outline'} onClick={() => setPanel('update')}>Preparar atualização</Button>
        <Button type="button" variant={panel === 'advanced' ? 'default' : 'outline'} onClick={() => setPanel('advanced')}>Diagnóstico técnico</Button>
      </div>
      {panel === 'status' && <p className="rounded-lg bg-white p-3 text-sm text-gray-700">
        {data.currentManifestVersion === data.desiredManifestVersion ? 'As versões registradas são iguais; confirme a exibição diretamente na tela.' :
          'Há uma atualização disponível para sincronização. Abra o Player Web no dispositivo e solicite a atualização.'}
      </p>}
      {panel === 'update' && <div className="space-y-3">
        <p className="text-sm text-gray-700">Revise a programação antes de preparar a atualização. A geração exige autorização, confirmação e pré-validação.</p>
        <DoohManifestPublishQa companyId={companyId} player={data} />
        <p className="text-xs text-gray-600">Depois de preparar, abra o Player Web e use a ação de sincronização. Não há comando remoto automático nesta página.</p>
      </div>}
      {panel === 'advanced' && <div className="space-y-3">
        <DoohManifestInventoryReadOnly companyId={companyId} player={data} />
        <DoohManifestSyncDiagnosticReadOnly companyId={companyId} player={data} />
      </div>}
      <p className="text-xs text-gray-600">Heartbeat, manifests e eventos reportados não comprovam reprodução física, audiência nem impressões certificadas. A contagem de eventos é técnica, não comercial.</p>
    </>}
  </section>;
}
