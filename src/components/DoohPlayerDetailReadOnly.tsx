import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import {
  doohPlayerDetailSignals,
  parseDoohPlayerDetail,
  type DoohPlayerDetailView,
} from '../lib/doohPlayerDetailContract';
import { Button } from './ui/button';
import { doohPlayerReadFailure } from '../lib/doohPlayerReadFailure';

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
        setError('Contrato do detalhe DOOH incompatível. Nenhum dado foi apresentado.');
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
        <h4 className="font-semibold text-gray-900">Detalhes técnicos — somente leitura</h4>
        <p className="mt-1 text-xs text-gray-600">Consulta autenticada. Nenhum comando, pareamento ou ativação disponível.</p>
      </div>
      <Button type="button" variant="outline" onClick={onClose}>Fechar detalhes</Button>
    </div>
    {loading && <p role="status" className="text-sm text-gray-600">Carregando detalhes do player…</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
        <div><div className="text-xs text-gray-500">Player / plataforma</div><div className="font-medium">{data.name || 'Sem nome'} · {data.platform || 'Não informada'}</div></div>
        <div><div className="text-xs text-gray-500">Ciclo de vida</div><div className="font-medium">{data.lifecycleStatus}</div></div>
        <div><div className="text-xs text-gray-500">Conectividade técnica</div><div className="font-medium">{data.lifecycleStatus !== 'ACTIVE' ? 'Não operacional' : data.online ? 'Heartbeat recente' : 'Sem heartbeat recente'}</div></div>
        <div><div className="text-xs text-gray-500">Último heartbeat</div><div>{when(data.lastSeenAt)}</div></div>
        <div><div className="text-xs text-gray-500">Janela de heartbeat</div><div>{data.offlineAfterSeconds} segundos</div></div>
        <div><div className="text-xs text-gray-500">Versão do aplicativo</div><div>{data.appVersion || 'Não informada'}</div></div>
        <div><div className="text-xs text-gray-500">Tela associada</div><div>{data.screen ? `${data.screen.name}${data.screen.point ? ` · ${data.screen.point}` : ''}` : 'Não associada'}</div></div>
        <div><div className="text-xs text-gray-500">Manifest atual / desejado</div><div>v{data.currentManifestVersion} / v{data.desiredManifestVersion}</div></div>
        <div><div className="text-xs text-gray-500">Credencial técnica</div><div>{data.credentialActive ? 'Ativa' : 'Inativa'} · uso: {when(data.credentialLastUsedAt)}</div></div>
        <div><div className="text-xs text-gray-500">Grupos</div><div>{data.groups.length ? data.groups.join(', ') : 'Nenhum'}</div></div>
        <div><div className="text-xs text-gray-500">Manifests / comandos registrados</div><div>{data.manifestCount} / {data.commandCount}</div></div>
        <div><div className="text-xs text-gray-500">Eventos técnicos recebidos do player</div><div>{data.playbackEventCount}</div></div>
      </div>
      {signals.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="mb-2 text-sm font-medium text-amber-950">Pontos para conferência</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{signals.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>}
      <p className="text-xs text-gray-600">Heartbeat, manifests e eventos reportados não comprovam reprodução física, audiência nem impressões certificadas. A contagem de eventos é técnica, não comercial.</p>
    </>}
  </section>;
}
