import { doohMediaDisplayName } from '../lib/doohMediaDisplayName';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseOperationalScreenPage } from '../lib/doohOperationalScreenContract';
import { parseDoohVersions } from '../lib/doohMediaVersionsContract';
import {
  doohReportDayLabel, doohReportErrorText, doohReportParams, doohReportResultLabel, parseDoohReportSummary,
  type DoohReportGroup, type DoohReportPeriod, type DoohReportSummary,
} from '../lib/doohReportsContract';

const periods: { id: DoohReportPeriod; label: string }[] = [{ id: 'today', label: 'Hoje' }, { id: '7d', label: 'Últimos 7 dias' }];
const groupings: { id: DoohReportGroup; label: string }[] = [
  { id: 'PLAYER', label: 'Por tela' }, { id: 'MEDIA_VERSION', label: 'Por mídia' }, { id: 'DAY_UTC', label: 'Por dia' },
];
const errorCode = (e: unknown) => (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
const MAX_MEDIA_FOR_NAMES = 40;

/** F11b — exibições relatadas pelos aparelhos (proof of play). Só leitura; nada é simulado. */
export function DoohReportsPanel() {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const companyId = user?.companyId ?? '';
  const allowed = !!companyId && snapshot?.companyId === companyId && !!snapshot?.modules.DOOH.granted;
  const [period, setPeriod] = useState<DoohReportPeriod>('today');
  const [groupBy, setGroupBy] = useState<DoohReportGroup>('PLAYER');
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<DoohReportSummary | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setSummary(null);
    void apiClient.get<unknown>('/dooh/reports/summary', { params: doohReportParams(period, groupBy), signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseDoohReportSummary(data, companyId, groupBy);
        if (!parsed) throw Error('Unexpected report contract');
        setSummary(parsed);
      })
      .catch(e => { if (!controller.signal.aborted) setError(doohReportErrorText(errorCode(e))); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, companyId, period, groupBy, refresh]);

  // Friendly names: screen name for a device, media name for a media version. Ids are never shown.
  useEffect(() => {
    if (!allowed || !summary || summary.groupBy === 'DAY_UTC' || summary.groups.length === 0) return;
    const controller = new AbortController();
    const load = async () => {
      const next: Record<string, string> = {};
      if (summary.groupBy === 'PLAYER') {
        const { data } = await apiClient.get<unknown>('/dooh/operational-screens', { params: { page: 1, pageSize: 100 }, signal: controller.signal });
        for (const screen of parseOperationalScreenPage(data)?.items ?? []) if (screen.player) next[screen.player.id.toLowerCase()] = screen.name;
      } else {
        const { data } = await apiClient.get<unknown>('/dooh/media', { params: { take: 100 }, signal: controller.signal });
        const media = (Array.isArray(data) ? data : []).filter((m): m is { id: string; name: string } =>
          !!m && typeof m.id === 'string' && typeof m.name === 'string').slice(0, MAX_MEDIA_FOR_NAMES);
        const wanted = new Set(summary.groups.map(g => g.groupKey));
        await Promise.all(media.map(async m => {
          const res = await apiClient.get<unknown>(`/dooh/media/${encodeURIComponent(m.id)}/versions`, { signal: controller.signal }).catch(() => null);
          for (const v of parseDoohVersions(res?.data, m.id)?.versions ?? []) {
            if (wanted.has(v.id.toLowerCase())) next[v.id.toLowerCase()] = v.version > 1 ? `${doohMediaDisplayName(m.name)} (versão ${v.version})` : doohMediaDisplayName(m.name);
          }
        }));
      }
      if (!controller.signal.aborted) setNames(next);
    };
    void load().catch(() => undefined);
    return () => controller.abort();
  }, [allowed, summary]);

  const label = useMemo(() => (key: string) => {
    if (groupBy === 'DAY_UTC') return doohReportDayLabel(key);
    if (key === 'UNASSIGNED') return 'Sem identificação';
    return names[key.toLowerCase()] ?? (groupBy === 'PLAYER' ? 'Aparelho desvinculado' : 'Mídia removida ou de outra pasta');
  }, [groupBy, names]);

  if (!allowed) return null;
  const max = Math.max(1, ...(summary?.groups.map(g => g.total) ?? [1]));
  return <section aria-label="Relatórios de exibição" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Exibições</h2>
        <p className="text-sm text-gray-600">Cada exibição é registrada pelo próprio aparelho e enviada quando ele tem internet. É o relato do aparelho, não uma verificação física da tela.</p>
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Atualizar</Button>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
      {periods.map(p => <Button key={p.id} type="button" size="sm" variant={period === p.id ? 'default' : 'outline'} aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Button>)}
      <span className="mx-2 w-px bg-gray-200" aria-hidden />
      {groupings.map(g => <Button key={g.id} type="button" size="sm" variant={groupBy === g.id ? 'default' : 'outline'} aria-pressed={groupBy === g.id} onClick={() => { setNames({}); setGroupBy(g.id); }}>{g.label}</Button>)}
    </div>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && !summary && <p className="text-sm text-gray-600">Carregando…</p>}
    {summary && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-indigo-50 p-4"><p className="text-xs text-gray-600">Exibições registradas</p><p className="text-2xl font-semibold text-gray-900">{summary.total.toLocaleString('pt-BR')}</p></div>
        <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-gray-600">{doohReportResultLabel.PLAYED}</p><p className="text-2xl font-semibold text-gray-900">{summary.byResult.PLAYED.toLocaleString('pt-BR')}</p></div>
        <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-gray-600">{doohReportResultLabel.INTERRUPTED}</p><p className="text-2xl font-semibold text-gray-900">{summary.byResult.INTERRUPTED.toLocaleString('pt-BR')}</p></div>
      </div>
      {summary.total === 0
        ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-600">Nenhuma exibição registrada neste período. Os aparelhos com o Player atualizado começam a enviar assim que exibirem conteúdo.</p>
        : <ol className="space-y-2">{summary.groups.map(g => <li key={g.groupKey} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium text-gray-900">{label(g.groupKey)}</span><span className="tabular-nums text-gray-700">{g.total.toLocaleString('pt-BR')}</span></div>
            <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(2, Math.round((g.total / max) * 100))}%` }} /></div>
            {g.byResult.INTERRUPTED + g.byResult.FAILED > 0 && <p className="text-xs text-gray-500">{g.byResult.INTERRUPTED} interrompidas{g.byResult.FAILED ? ` · ${g.byResult.FAILED} com falha` : ''}</p>}
          </li>)}</ol>}
      <p className="text-xs text-gray-500">Período: {new Date(summary.from).toLocaleString('pt-BR')} até {new Date(summary.to).toLocaleString('pt-BR')}.{groupBy === 'DAY_UTC' ? ' Dias contados em UTC (3 horas à frente de Brasília).' : ''} Atualizado em {new Date(summary.generatedAt).toLocaleTimeString('pt-BR')}.</p>
    </>}
  </section>;
}
