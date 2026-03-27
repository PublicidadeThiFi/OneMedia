import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { daysToDurationParts, formatDurationParts } from '../lib/menuCart';
import { classifyMenuRequestError, fetchMenuRequest, type MenuRequestRecord } from '../lib/menuRequestApi';
import { MenuRequestErrorCard } from '../components/menu/MenuRequestErrorCard';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatOperationalStatus(status?: string | null): string {
  const s = String(status || '').trim().toUpperCase();
  if (!s) return '—';
  if (s === 'APROVADA') return 'Aprovada';
  if (s === 'ENVIADA') return 'Enviada';
  if (s === 'EM_INSTALACAO') return 'Em instalação';
  if (s === 'AGUARDANDO_MATERIAL') return 'Aguardando material';
  if (s === 'ATIVA') return 'Ativa';
  if (s === 'EM_VEICULACAO') return 'Em veiculação';
  if (s === 'FINALIZADA') return 'Finalizada';
  if (s === 'ABERTA') return 'Aberta';
  if (s === 'PAGA') return 'Paga';
  if (s === 'RESERVADA') return 'Reservada';
  if (s === 'CONFIRMADA') return 'Confirmada';
  return s;
}

function formatStatusCounts(map?: Record<string, number> | null): string {
  const entries = Object.entries(map || {}).filter(([, value]) => Number(value) > 0);
  if (!entries.length) return '—';
  return entries.map(([key, value]) => `${formatOperationalStatus(key)}: ${value}`).join(' • ');
}

function formatDateTimeBr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  }
}

function buildReservationCutoffNotice(cutoffTime?: string | null) {
  const normalized = String(cutoffTime || '').trim();
  if (!normalized) return '';
  return `Check-ins realizados até ${normalized} contam no mesmo dia. Após esse horário, a vigência começa no dia seguinte.`;
}

function getStatusMeta(status?: string | null) {
  const normalized = String(status || '').trim().toUpperCase();
  switch (normalized) {
    case 'SUBMITTED':
    case 'RECEBIDA':
      return {
        label: 'Solicitação recebida',
        chipClass: 'border-sky-200 bg-sky-50 text-sky-800',
        panelClass: 'border-sky-200 bg-sky-50/80 text-sky-950',
        description: 'Seu pedido entrou no fluxo e já está disponível para o responsável analisar.',
      };
    case 'IN_REVIEW':
      return {
        label: 'Em análise',
        chipClass: 'border-violet-200 bg-violet-50 text-violet-800',
        panelClass: 'border-violet-200 bg-violet-50/80 text-violet-950',
        description: 'Estamos avaliando disponibilidade, período e composição da proposta.',
      };
    case 'QUOTE_SENT':
      return {
        label: 'Proposta enviada',
        chipClass: 'border-blue-200 bg-blue-50 text-blue-800',
        panelClass: 'border-blue-200 bg-blue-50/80 text-blue-950',
        description: 'A proposta está pronta para ser aberta, revisada e aprovada por você.',
      };
    case 'REVISION_REQUESTED':
      return {
        label: 'Revisão solicitada',
        chipClass: 'border-amber-200 bg-amber-50 text-amber-800',
        panelClass: 'border-amber-200 bg-amber-50/80 text-amber-950',
        description: 'Seu pedido de ajuste foi registrado e voltou para o responsável revisar.',
      };
    case 'APPROVED':
      return {
        label: 'Aprovada',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        panelClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
        description: 'A proposta foi aprovada e o fluxo operacional já pode seguir normalmente.',
      };
    default:
      return {
        label: normalized || '—',
        chipClass: 'border-slate-200 bg-slate-50 text-slate-700',
        panelClass: 'border-slate-200 bg-slate-50/80 text-slate-900',
        description: 'Acompanhe por aqui a evolução do pedido e a disponibilidade da proposta.',
      };
  }
}

export default function MenuAcompanhar() {
  const navigate = useNavigation();

  const { token, t, rid } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || '',
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
    };
  }, []);

  const [data, setData] = useState<MenuRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyMenuRequestError> | null>(null);

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const backToSent = useMemo(() => {
    return `/menu/enviado${buildQuery(authQuery)}`;
  }, [authQuery]);

  const propostaUrl = useMemo(() => {
    return `/menu/proposta${buildQuery(authQuery)}`;
  }, [authQuery]);

  useEffect(() => {
    let alive = true;

    if (!String(rid || '').trim()) {
      setData(null);
      setIsLoading(false);
      setLoadError({
        kind: 'MISSING_TOKEN',
        title: 'Link inválido',
        description: 'Esse link parece incompleto. Abra pelo link que você recebeu.',
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'client' });
        if (!alive) return;
        setData(res);
      } catch (err: any) {
        if (!alive) return;
        setData(null);
        const classified = classifyMenuRequestError(err);
        setLoadError(classified);
        if (classified.kind === 'GENERIC') {
          toast.error(classified.title, { description: classified.description });
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [rid, token, t]);

  useEffect(() => {
    if (!String(rid || '').trim()) return;
    const timer = window.setInterval(() => {
      fetchMenuRequest({ requestId: rid, token, t, view: 'client' })
        .then((res) => setData(res))
        .catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [rid, token, t]);

  const timeline = useMemo(() => {
    const events = Array.isArray(data?.events) ? data!.events! : [];
    const getAt = (type: string) => events.find((event) => event.type === type)?.at || null;

    return [
      {
        key: 'REQUEST_SUBMITTED',
        title: 'Solicitação enviada',
        desc: 'Recebemos seu pedido e registramos no fluxo do cardápio.',
        at: getAt('REQUEST_SUBMITTED'),
      },
      {
        key: 'OWNER_OPENED',
        title: 'Em análise',
        desc: 'O responsável está validando disponibilidade, prazo e combinação dos itens.',
        at: getAt('OWNER_OPENED'),
      },
      {
        key: 'QUOTE_SENT',
        title: 'Proposta enviada',
        desc: 'A proposta já está pronta para você abrir e revisar.',
        at: getAt('QUOTE_SENT'),
      },
      {
        key: 'QUOTE_OPENED',
        title: 'Proposta visualizada',
        desc: 'Seu acesso à proposta foi registrado.',
        at: getAt('QUOTE_OPENED'),
      },
      {
        key: 'QUOTE_REJECTED',
        title: 'Revisão solicitada',
        desc: 'Seu pedido de ajuste foi enviado ao responsável.',
        at: getAt('QUOTE_REJECTED'),
      },
      {
        key: 'QUOTE_APPROVED',
        title: 'Aprovada',
        desc: 'A proposta foi aprovada e o contrato pode ficar disponível para download.',
        at: getAt('QUOTE_APPROVED'),
      },
    ];
  }, [data]);

  const hasQuote = Boolean(data?.currentQuoteVersion);
  const statusMeta = useMemo(() => getStatusMeta(data?.status), [data?.status]);
  const itemsCount = data?.items?.length ?? 0;
  const pointsCount = useMemo(() => new Set((data?.items || []).map((item) => item.pointId).filter(Boolean)).size, [data?.items]);
  const latestTimelineAt = useMemo(() => {
    const withDates = timeline.filter((step) => step.at);
    return withDates.length ? withDates[withDates.length - 1].at : data?.updatedAt || data?.createdAt || null;
  }, [timeline, data?.updatedAt, data?.createdAt]);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_38%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm">
                Acompanhamento
              </Badge>
              <div className="text-sm text-slate-500">Pedido e status do cliente</div>
            </div>

            <div className="sm:ml-auto">
              <Button variant="ghost" className="gap-2 rounded-full px-4 text-slate-700 hover:bg-slate-100" onClick={() => navigate(backToSent)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-3 px-6 py-8 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando informações…
              </CardContent>
            </Card>
          ) : !data ? (
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="px-6 py-6">
                <MenuRequestErrorCard
                  error={loadError || {
                    kind: 'NOT_FOUND',
                    title: 'Solicitação não encontrada',
                    description: 'Verifique se o link está completo ou peça ao responsável para reenviar.',
                  }}
                  primaryAction={{
                    label: 'Ir para o início',
                    variant: 'outline',
                    onClick: () => navigate('/menu'),
                  }}
                  secondaryAction={{
                    label: 'Voltar',
                    variant: 'ghost',
                    onClick: () => navigate(backToSent),
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <CardContent className="p-0">
                  <div className="border-b border-slate-200/70 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(30,41,59,0.96)_44%,_rgba(37,99,235,0.9)_100%)] px-6 py-7 text-white md:px-7 md:py-8">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.chipClass}`}>
                            {statusMeta.label}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/90">
                            Request ID {data.id}
                          </Badge>
                        </div>

                        <div>
                          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Acompanhe a evolução do seu pedido</h1>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 md:text-[15px]">
                            {statusMeta.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            className="gap-2 rounded-full border border-white/10 bg-white text-slate-950 hover:bg-slate-100"
                            disabled={!hasQuote}
                            onClick={() => navigate(propostaUrl)}
                          >
                            <FileText className="h-4 w-4" />
                            {hasQuote ? 'Abrir proposta' : 'Proposta ainda não disponível'}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Enviado em</div>
                            <div className="mt-2 text-sm font-semibold text-white">{formatDateTimeBr(data.createdAt)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Última atualização</div>
                            <div className="mt-2 text-sm font-semibold text-white">{formatDateTimeBr(latestTimelineAt)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Itens</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{itemsCount}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Pontos</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{pointsCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 border-b border-slate-200/70 bg-slate-50/70 px-6 py-5 md:grid-cols-3 md:px-7">
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Status atual
                      </div>
                      <div className="mt-3 text-base font-semibold text-slate-950">{statusMeta.label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{hasQuote ? 'Você já tem uma proposta pronta para revisar.' : 'Seguimos trabalhando para montar a proposta ideal.'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        Vigência
                      </div>
                      <div className="mt-3 text-base font-semibold text-slate-950">{data.reservationStartCutoffTime ? 'Com regra de check-in' : 'Sem regra específica'}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{data.reservationStartCutoffTime ? buildReservationCutoffNotice(data.reservationStartCutoffTime) : 'A data de início seguirá a disponibilidade e as regras aplicadas pelo responsável.'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <Megaphone className="h-4 w-4 text-blue-600" />
                        Próximo passo
                      </div>
                      <div className="mt-3 text-base font-semibold text-slate-950">{hasQuote ? 'Revisar a proposta' : 'Aguardar retorno do responsável'}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{hasQuote ? 'Abra a proposta para aprovar ou pedir ajustes.' : 'Assim que a proposta for enviada, ela aparecerá aqui automaticamente.'}</div>
                    </div>
                  </div>

                  <div className="grid gap-6 px-6 py-6 md:px-7 lg:grid-cols-[minmax(0,1.2fr)_360px]">
                    <div className="space-y-6">
                      {String(data.status || '').toUpperCase() === 'APPROVED' && (data.operational?.campaign || data.operational?.billing?.total || data.operational?.stage) ? (
                        <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.96)_0%,_rgba(240,253,244,0.86)_100%)] p-5 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                                <CheckCircle2 className="h-4 w-4" />
                                Fluxo operacional iniciado
                              </div>
                              <div className="mt-1 text-sm leading-6 text-emerald-900">
                                Sua aprovação já foi refletida no processo interno. Você pode acompanhar a preparação da campanha e das cobranças por aqui.
                              </div>
                            </div>
                            {data.operational?.stage ? (
                              <Badge variant="secondary" className="w-fit rounded-full border border-emerald-200 bg-white text-emerald-900">
                                {data.operational.stage.label}
                              </Badge>
                            ) : null}
                          </div>

                          {data.operational?.stage?.description ? (
                            <div className="mt-4 rounded-2xl border border-emerald-200/90 bg-white px-4 py-3 text-sm leading-6 text-emerald-900">
                              {data.operational.stage.description}
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-200/90 bg-white px-4 py-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Campanha</div>
                              <div className="mt-2 text-base font-semibold text-emerald-950">{data.operational?.campaign?.name || 'Em preparação'}</div>
                              <div className="mt-1 text-sm text-emerald-900">Status: {formatOperationalStatus(data.operational?.campaign?.status)}</div>
                            </div>
                            <div className="rounded-2xl border border-emerald-200/90 bg-white px-4 py-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Cobranças</div>
                              <div className="mt-2 text-base font-semibold text-emerald-950">{data.operational?.billing?.total ?? 0}</div>
                              <div className="mt-1 text-sm text-emerald-900">{formatStatusCounts(data.operational?.billing?.byStatus)}</div>
                            </div>
                          </div>

                          <div className="mt-4 text-xs text-emerald-900">
                            Última sincronização: <span className="font-semibold">{formatDateTimeBr(data.operational?.syncedAt || data.updatedAt || data.createdAt)}</span>
                          </div>
                        </div>
                      ) : null}

                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <Clock3 className="h-4 w-4 text-blue-600" />
                          Linha do tempo
                        </div>
                        <div className="mt-1 text-sm text-slate-600">Um resumo claro de cada etapa já concluída no seu pedido.</div>

                        <div className="mt-5 space-y-3">
                          {timeline.map((step, index) => {
                            const done = Boolean(step.at);
                            const isCurrent = done && timeline.slice(index + 1).every((next) => !next.at);
                            return (
                              <div
                                key={step.key}
                                className={`rounded-2xl border px-4 py-4 transition-colors ${
                                  done
                                    ? isCurrent
                                      ? 'border-blue-200 bg-blue-50/70'
                                      : 'border-emerald-200 bg-emerald-50/60'
                                    : 'border-slate-200 bg-slate-50/80'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full border ${done ? (isCurrent ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-emerald-200 bg-emerald-100 text-emerald-700') : 'border-slate-200 bg-white text-slate-400'}`}>
                                    <CircleDot className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                      <div>
                                        <div className="text-sm font-semibold text-slate-950">{step.title}</div>
                                        <div className="mt-1 text-sm leading-6 text-slate-600">{step.desc}</div>
                                      </div>
                                      <Badge
                                        variant="secondary"
                                        className={`w-fit rounded-full border text-xs ${done ? (isCurrent ? 'border-blue-200 bg-white text-blue-700' : 'border-emerald-200 bg-white text-emerald-700') : 'border-slate-200 bg-white text-slate-500'}`}
                                      >
                                        {done ? formatDateTimeBr(step.at) : 'Aguardando'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Itens solicitados
                        </div>
                        <div className="mt-1 text-sm text-slate-600">Os pontos e faces escolhidos por você para compor a proposta.</div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {(data.items || []).map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-sm font-semibold text-slate-950">
                                {item.snapshot?.pointName || 'Ponto'}
                                {item.snapshot?.unitLabel ? ` — ${item.snapshot.unitLabel}` : ''}
                              </div>
                              <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>
                                  {item.snapshot?.city ? `${item.snapshot.city}` : ''}
                                  {item.snapshot?.state ? `/${item.snapshot.state}` : ''}
                                  {item.snapshot?.addressLine ? ` • ${item.snapshot.addressLine}` : ''}
                                </span>
                              </div>
                              <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                                Duração: {formatDurationParts(item.duration || daysToDurationParts(item.durationDays))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="space-y-6">
                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="text-sm font-semibold text-slate-950">Seus dados</div>
                        <div className="mt-1 text-sm text-slate-600">Informações enviadas no checkout do cardápio.</div>

                        <div className="mt-5 space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              Cliente
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-950">{data.customerName}</div>
                            {data.customerCompanyName ? <div className="mt-1 text-sm text-slate-600">{data.customerCompanyName}</div> : null}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{data.customerPhone}</div>
                            <div className="mt-2 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{data.customerEmail}</div>
                          </div>
                        </div>
                      </section>

                      {data.notes ? (
                        <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                          <div className="text-sm font-semibold text-slate-950">Observações</div>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                            {data.notes}
                          </div>
                        </section>
                      ) : null}

                      <section className={`rounded-[28px] border p-5 shadow-sm ${statusMeta.panelClass}`}>
                        <div className="text-sm font-semibold">Próxima ação recomendada</div>
                        <div className="mt-2 text-sm leading-6 opacity-90">
                          {hasQuote
                            ? 'Abra a proposta para revisar valores, itens e decidir entre aprovar ou pedir revisão.'
                            : 'Aguarde o envio da proposta. Assim que estiver pronta, o botão para abrir aparecerá aqui com atualização automática.'}
                        </div>
                        <div className="mt-4">
                          <Button
                            className="gap-2 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                            disabled={!hasQuote}
                            onClick={() => navigate(propostaUrl)}
                          >
                            <FileText className="h-4 w-4" />
                            Abrir proposta
                          </Button>
                        </div>
                      </section>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
