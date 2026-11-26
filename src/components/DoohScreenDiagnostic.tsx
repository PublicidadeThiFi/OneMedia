import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import type { OperationalScreen } from '../lib/doohOperationalScreenContract';
import { parseScreenDiagnostic, diagnosticScheduleText, type ScreenDiagnostic } from '../lib/doohScreenDiagnosticContract';
import { Button } from './ui/button';
const when = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR') : 'Não informado';
const events = { PLAYED: 'Reprodução reportada', FAILED: 'Falha reportada', INTERRUPTED: 'Interrupção reportada', OTHER: 'Outro evento técnico' };
const licenseReasons: Record<string, string> = { ACTIVE_SUBSCRIPTION: 'Assinatura vigente', TRIAL_ACTIVE: 'Período de teste vigente', TRIAL_EXEMPT: 'Isenção comercial', GRACE_PERIOD: 'Período de tolerância', CANCELED_ACCESS_UNTIL_END: 'Cancelada, com acesso até o fim contratado', TRIAL_EXPIRED: 'Período de teste encerrado', PAST_DUE: 'Pagamento pendente', CANCELED: 'Assinatura cancelada', NO_SUBSCRIPTION: 'Sem assinatura', MODULE_NOT_GRANTED: 'Módulo não concedido', ENTITLEMENT_CONFLICT: 'Conflito de assinaturas', LEGACY_COMPATIBILITY: 'Compatibilidade de cadastro anterior' };
const versions = (value: string) => value === '0' ? 'Nenhuma' : `v${value}`;
export function DoohScreenDiagnostic({ companyId, screen }: { companyId: string; screen: OperationalScreen }) {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<ScreenDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    void apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/diagnostic`, { signal: controller.signal })
      .then(({data: raw}) => {
        if (controller.signal.aborted) return;
        const parsed = parseScreenDiagnostic(raw, companyId, screen);
        if (parsed) setData(parsed); else setError('Não foi possível confirmar o vínculo ou os dados desta tela. Atualize a lista.');
      }).catch(() => { if (!controller.signal.aborted) setError('Diagnóstico indisponível. Verifique a conexão e tente novamente.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, screen, reload]);
  const p = data?.player;
  return <section className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm" aria-label="Diagnóstico avançado">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">Diagnóstico avançado</h4><Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => setReload(v=>v+1)}>Consultar novamente</Button></div>
    {loading && <p role="status">Consultando registros…</p>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {data && <p className="text-xs text-gray-600">Consulta em {when(data.observedAt)}. Não envia comandos ao aparelho.</p>}
    {data && !p && <p>Nenhum aparelho vinculado.</p>}
    {p && <>
      <p className="font-medium">{p.lifecycleStatus !== 'ACTIVE' || !p.credentialActive ? 'Autorização do aparelho indisponível. Verifique o cadastro.' : 'Dispositivo ativo e credencial cadastrada; isso não confirma autorização de reprodução.'}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-gray-600">Última comunicação</dt><dd>{when(p.lastSeenAt)}</dd></div>
        <div><dt className="text-xs text-gray-600">Versão desejada / reportada</dt><dd>{versions(p.desiredManifestVersion)} / {versions(p.currentManifestVersion)}</dd></div>
        <div><dt className="text-xs text-gray-600">Manifesto reportado publicado em</dt><dd>{when(p.manifestPublishedAt)}</dd></div>
        <div><dt className="text-xs text-gray-600">Integridade do manifesto no servidor</dt><dd>{p.integrity === 'VERIFIED_SERVER_PAYLOAD' ? 'Verificada' : p.integrity === 'INVALID' ? 'Inconsistente' : 'Não disponível'}</dd></div>
      </dl>
      {p.license ? <div className="space-y-1 border-t pt-2">
        <p className="font-medium">Licenciamento do módulo DOOH</p>
        <p>{!p.license.granted || p.license.accessMode === 'NONE' ? 'Acesso comercial indisponível.' : p.license.accessMode === 'READ_ONLY' ? 'Somente leitura; nova programação não autorizada.' : 'Acesso comercial completo na consulta; sujeito às demais verificações do aparelho.'}</p>
        <p className="text-xs text-gray-600">Motivo: {licenseReasons[p.license.reason]}.</p>
        <p className="text-xs text-gray-600">Prazo comercial para autorização offline: {p.license.commercialDeadline === 'EXEMPT' ? 'Isenção comercial (não isenta limites offline)' : p.license.commercialDeadline === 'DATED' ? when(p.license.commercialValidUntil) : 'Não confirmado'}.</p>
        <p className="text-xs text-gray-600">Política offline: teto de 24 horas. {p.license.offlineConfiguredSeconds === null ? 'Configuração específica não confirmada.' : `Limite configurado: ${p.license.offlineConfiguredSeconds >= 3600 ? `${Number((p.license.offlineConfiguredSeconds / 3600).toFixed(2)).toLocaleString('pt-BR')} h` : `${p.license.offlineConfiguredSeconds} s`}.`} Autorização instalada no aparelho: não verificável nesta consulta.</p>
      </div> : <p>Licenciamento comercial não verificado nesta consulta.</p>}
      <p>{diagnosticScheduleText(p)}</p>
      {p.window && <p className="text-xs text-gray-600">Janela registrada: {when(p.window.from)} — {when(p.window.to)}</p>}
      <p>{p.lastEvent ? `${events[p.lastEvent.result]} em ${when(p.lastEvent.startedAt)} (recebido em ${when(p.lastEvent.receivedAt)}).` : 'Nenhum evento de reprodução registrado.'}</p>
      <p className="text-xs text-gray-600">Evento histórico não confirma a reprodução atual. A continuidade offline, os arquivos no aparelho e a audiência não são verificáveis por esta consulta.</p>
    </>}
  </section>;
}
