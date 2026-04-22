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
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { daysToDurationParts, formatDurationParts } from '../lib/menuCart';
import { classifyMenuRequestError, fetchMenuRequest, type MenuRequestRecord } from '../lib/menuRequestApi';
import { MenuRequestErrorCard } from '../components/menu/MenuRequestErrorCard';
import '../components/menu/catalog/menuCatalogTheme.css';

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
        chipClass: 'menu-track-chip-sky',
        panelClass: 'menu-track-panel menu-track-panel-sky',
        description: 'Seu pedido entrou no fluxo e já está disponível para o responsável analisar.',
      };
    case 'IN_REVIEW':
      return {
        label: 'Em análise',
        chipClass: 'menu-track-chip-violet',
        panelClass: 'menu-track-panel menu-track-panel-violet',
        description: 'Estamos avaliando disponibilidade, período e composição da proposta.',
      };
    case 'QUOTE_SENT':
      return {
        label: 'Proposta enviada',
        chipClass: 'menu-track-chip-blue',
        panelClass: 'menu-track-panel menu-track-panel-blue',
        description: 'A proposta está pronta para ser aberta, revisada e aprovada por você.',
      };
    case 'REVISION_REQUESTED':
      return {
        label: 'Revisão solicitada',
        chipClass: 'menu-track-chip-amber',
        panelClass: 'menu-track-panel menu-track-panel-amber',
        description: 'Seu pedido de ajuste foi registrado e voltou para o responsável revisar.',
      };
    case 'APPROVED':
      return {
        label: 'Aprovada',
        chipClass: 'menu-track-chip-emerald',
        panelClass: 'menu-track-panel menu-track-panel-emerald',
        description: 'A proposta foi aprovada e o fluxo operacional já pode seguir normalmente.',
      };
    default:
      return {
        label: normalized || '—',
        chipClass: 'menu-track-chip-neutral',
        panelClass: 'menu-track-panel menu-track-panel-neutral',
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
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-flow-frame menu-track-frame">
        <div className="menu-cart-topbar menu-flow-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <span>Pedido enviado</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Acompanhamento</strong>
            <Badge className="menu-cart-pill">Fluxo do cliente</Badge>
          </div>
          <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(backToSent)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {isLoading ? (
          <Card className="menu-catalog-actions-card menu-track-loading-card">
            <CardContent className="menu-track-loading-content">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando informações…
            </CardContent>
          </Card>
        ) : !data ? (
          <Card className="menu-catalog-actions-card menu-track-error-card">
            <CardContent className="menu-track-error-content">
              <MenuRequestErrorCard
                error={
                  loadError || {
                    kind: 'NOT_FOUND',
                    title: 'Solicitação não encontrada',
                    description: 'Verifique se o link está completo ou peça ao responsável para reenviar.',
                  }
                }
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
            <section className="menu-catalog-actions-card menu-flow-intro-card menu-track-hero-card">
              <div className="menu-track-hero-main">
                <div className="menu-cart-kicker">
                  <Clock3 className="h-3.5 w-3.5" />
                  Acompanhamento do pedido
                </div>
                <div className="menu-track-hero-meta-row">
                  <Badge className={`menu-track-status-chip ${statusMeta.chipClass}`}>{statusMeta.label}</Badge>
                  <Badge variant="secondary" className="menu-track-request-chip">Request ID {data.id}</Badge>
                </div>
                <h1 className="menu-track-hero-title">Acompanhe a evolução do seu pedido no mesmo fluxo visual do cardápio.</h1>
                <p className="menu-track-hero-copy">{statusMeta.description}</p>
                <div className="menu-track-hero-actions">
                  <Button className="menu-cart-primary-button gap-2" disabled={!hasQuote} onClick={() => navigate(propostaUrl)}>
                    <FileText className="h-4 w-4" />
                    {hasQuote ? 'Abrir proposta' : 'Proposta ainda não disponível'}
                  </Button>
                </div>
              </div>

              <div className="menu-track-hero-summary">
                <div className="menu-cart-stat-box">
                  <span className="menu-cart-stat-value menu-track-stat-value">{formatDateTimeBr(data.createdAt)}</span>
                  <span className="menu-cart-stat-label">Enviado em</span>
                </div>
                <div className="menu-cart-stat-box">
                  <span className="menu-cart-stat-value menu-track-stat-value">{formatDateTimeBr(latestTimelineAt)}</span>
                  <span className="menu-cart-stat-label">Última atualização</span>
                </div>
                <div className="menu-cart-stat-box">
                  <span className="menu-cart-stat-value menu-track-stat-number">{itemsCount}</span>
                  <span className="menu-cart-stat-label">Itens</span>
                </div>
                <div className="menu-cart-stat-box">
                  <span className="menu-cart-stat-value menu-track-stat-number">{pointsCount}</span>
                  <span className="menu-cart-stat-label">Pontos</span>
                </div>
              </div>
            </section>

            <section className="menu-track-highlight-grid">
              <div className="menu-cart-input-card menu-track-highlight-card">
                <div className="menu-track-highlight-title">
                  <Sparkles className="h-4 w-4" />
                  Status atual
                </div>
                <strong>{statusMeta.label}</strong>
                <p>{hasQuote ? 'Você já tem uma proposta pronta para revisar.' : 'Seguimos trabalhando para montar a proposta ideal.'}</p>
              </div>
              <div className="menu-cart-input-card menu-track-highlight-card">
                <div className="menu-track-highlight-title">
                  <CalendarDays className="h-4 w-4" />
                  Vigência
                </div>
                <strong>{data.reservationStartCutoffTime ? 'Com regra de check-in' : 'Sem regra específica'}</strong>
                <p>{data.reservationStartCutoffTime ? buildReservationCutoffNotice(data.reservationStartCutoffTime) : 'A data de início seguirá a disponibilidade e as regras aplicadas pelo responsável.'}</p>
              </div>
              <div className="menu-cart-input-card menu-track-highlight-card">
                <div className="menu-track-highlight-title">
                  <Megaphone className="h-4 w-4" />
                  Próximo passo
                </div>
                <strong>{hasQuote ? 'Revisar a proposta' : 'Aguardar retorno do responsável'}</strong>
                <p>{hasQuote ? 'Abra a proposta para aprovar ou pedir ajustes.' : 'Assim que a proposta for enviada, ela aparecerá aqui automaticamente.'}</p>
              </div>
            </section>

            <section className="menu-track-layout menu-flow-layout menu-flow-layout--split">
              <div className="menu-track-main-column menu-flow-main-column">
                {String(data.status || '').toUpperCase() === 'APPROVED' && (data.operational?.campaign || data.operational?.billing?.total || data.operational?.stage) ? (
                  <div className="menu-track-ops-card">
                    <div className="menu-track-ops-head">
                      <div>
                        <div className="menu-track-ops-title">
                          <CheckCircle2 className="h-4 w-4" />
                          Fluxo operacional iniciado
                        </div>
                        <div className="menu-track-ops-copy">
                          Sua aprovação já foi refletida no processo interno. Você pode acompanhar a preparação da campanha e das cobranças por aqui.
                        </div>
                      </div>
                      {data.operational?.stage ? <Badge variant="secondary" className="menu-track-ops-badge">{data.operational.stage.label}</Badge> : null}
                    </div>

                    {data.operational?.stage?.description ? <div className="menu-track-ops-note">{data.operational.stage.description}</div> : null}

                    <div className="menu-track-ops-grid">
                      <div className="menu-track-ops-box">
                        <div className="menu-track-mini-label">Campanha</div>
                        <div className="menu-track-ops-value">{data.operational?.campaign?.name || 'Em preparação'}</div>
                        <div className="menu-track-ops-sub">Status: {formatOperationalStatus(data.operational?.campaign?.status)}</div>
                      </div>
                      <div className="menu-track-ops-box">
                        <div className="menu-track-mini-label">Cobranças</div>
                        <div className="menu-track-ops-value">{data.operational?.billing?.total ?? 0}</div>
                        <div className="menu-track-ops-sub">{formatStatusCounts(data.operational?.billing?.byStatus)}</div>
                      </div>
                    </div>

                    <div className="menu-track-ops-footer">
                      Última sincronização: <span>{formatDateTimeBr(data.operational?.syncedAt || data.updatedAt || data.createdAt)}</span>
                    </div>
                  </div>
                ) : null}

                <Card className="menu-catalog-actions-card menu-flow-shell-card menu-track-content-card">
                  <CardContent className="menu-flow-shell-body menu-track-content-body">
                    <div className="menu-track-section-head">
                      <div>
                        <div className="menu-cart-section-title">
                          <Clock3 className="h-4 w-4" />
                          Linha do tempo
                        </div>
                        <p className="menu-cart-section-copy">Um resumo claro de cada etapa já concluída no seu pedido.</p>
                      </div>
                    </div>

                    <div className="menu-track-timeline-list">
                      {timeline.map((step, index) => {
                        const done = Boolean(step.at);
                        const isCurrent = done && timeline.slice(index + 1).every((next) => !next.at);
                        return (
                          <div
                            key={step.key}
                            className={`menu-track-timeline-item ${done ? (isCurrent ? 'is-current' : 'is-done') : 'is-pending'}`}
                          >
                            <div className="menu-track-timeline-icon">
                              <CircleDot className="h-4 w-4" />
                            </div>
                            <div className="menu-track-timeline-body">
                              <div className="menu-track-timeline-head">
                                <div>
                                  <div className="menu-track-timeline-title">{step.title}</div>
                                  <div className="menu-track-timeline-copy">{step.desc}</div>
                                </div>
                                <Badge variant="secondary" className="menu-track-timeline-badge">
                                  {done ? formatDateTimeBr(step.at) : 'Aguardando'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="menu-catalog-actions-card menu-flow-shell-card menu-track-content-card">
                  <CardContent className="menu-flow-shell-body menu-track-content-body">
                    <div className="menu-track-section-head">
                      <div>
                        <div className="menu-cart-section-title">
                          <FileText className="h-4 w-4" />
                          Itens solicitados
                        </div>
                        <p className="menu-cart-section-copy">Os pontos e faces escolhidos por você para compor a proposta.</p>
                      </div>
                    </div>

                    <div className="menu-track-item-grid">
                      {(data.items || []).map((item) => (
                        <div key={item.id} className="menu-track-item-card">
                          <div className="menu-track-item-title">
                            {item.snapshot?.pointName || 'Ponto'}
                            {item.snapshot?.unitLabel ? ` — ${item.snapshot.unitLabel}` : ''}
                          </div>
                          <div className="menu-track-item-address">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {item.snapshot?.city ? `${item.snapshot.city}` : ''}
                              {item.snapshot?.state ? `/${item.snapshot.state}` : ''}
                              {item.snapshot?.addressLine ? ` • ${item.snapshot.addressLine}` : ''}
                            </span>
                          </div>
                          <div className="menu-track-item-chip">
                            Duração: {formatDurationParts(item.duration || daysToDurationParts(item.durationDays))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="menu-track-sidebar menu-flow-sidebar">
                <Card className="menu-cart-summary-card menu-flow-shell-card menu-track-summary-card">
                  <CardContent className="menu-flow-shell-body menu-track-summary-content">
                    <div className="menu-cart-side-title-dark">
                      <Building2 className="h-4 w-4" />
                      Seus dados
                    </div>
                    <p className="menu-cart-summary-copy">Informações enviadas no checkout do cardápio.</p>

                    <div className="menu-track-side-stack">
                      <div className="menu-track-side-box">
                        <div className="menu-track-mini-label">Cliente</div>
                        <strong>{data.customerName}</strong>
                        {data.customerCompanyName ? <span>{data.customerCompanyName}</span> : null}
                      </div>
                      <div className="menu-track-side-box menu-track-contact-box">
                        <div><Phone className="h-4 w-4" />{data.customerPhone}</div>
                        <div><Mail className="h-4 w-4" />{data.customerEmail}</div>
                      </div>
                      {data.notes ? (
                        <div className="menu-track-side-box">
                          <div className="menu-track-mini-label">Observações</div>
                          <p className="menu-track-notes">{data.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <div className={statusMeta.panelClass}>
                  <div className="menu-track-panel-title">Próxima ação recomendada</div>
                  <div className="menu-track-panel-copy">
                    {hasQuote
                      ? 'Abra a proposta para revisar valores, itens e decidir entre aprovar ou pedir revisão.'
                      : 'Aguarde o envio da proposta. Assim que estiver pronta, o botão para abrir aparecerá aqui com atualização automática.'}
                  </div>
                  <div className="menu-track-panel-actions">
                    <Button className="menu-cart-primary-button-full gap-2" disabled={!hasQuote} onClick={() => navigate(propostaUrl)}>
                      <FileText className="h-4 w-4" />
                      Abrir proposta
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
