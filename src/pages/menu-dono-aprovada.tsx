import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, Lock, CheckCircle2, FileText, Wallet, RefreshCw, Sparkles, BadgeCheck, Layers3, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import '../components/menu/catalog/menuCatalogTheme.css';
import { classifyMenuRequestError, fetchMenuRequest, type MenuQuoteVersionRecord, type MenuRequestRecord } from '../lib/menuRequestApi';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatMoneyBr(v: number): string {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

function formatOperationalStatus(status?: string | null): string {
  const s = String(status || '').trim().toUpperCase();
  if (!s) return '—';
  if (s === 'APROVADA') return 'Aprovada';
  if (s === 'ENVIADA') return 'Enviada';
  if (s === 'RASCUNHO') return 'Rascunho';
  if (s === 'EM_INSTALACAO') return 'Em instalação';
  if (s === 'AGUARDANDO_MATERIAL') return 'Aguardando material';
  if (s === 'ATIVA') return 'Ativa';
  if (s === 'EM_VEICULACAO') return 'Em veiculação';
  if (s === 'FINALIZADA') return 'Finalizada';
  if (s === 'CANCELADA') return 'Cancelada';
  if (s === 'ABERTA') return 'Aberta';
  if (s === 'PAGA') return 'Paga';
  if (s === 'VENCIDA') return 'Vencida';
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

function openMenuHref(href?: string | null, opts?: { newTab?: boolean }) {
  const target = String(href || '').trim();
  if (!target || typeof window === 'undefined') return;
  if (opts?.newTab) {
    window.open(target, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.assign(target);
}

function getApprovedStatusMeta() {
  return {
    label: 'Proposta aprovada',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    panelClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
    description: 'A versão foi aprovada e o workspace passa a funcionar como painel de leitura do ciclo operacional e financeiro.',
  };
}

export default function MenuDonoAprovada() {
  const navigate = useNavigation();

  const { token, t, rid } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || '',
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
    };
  }, []);

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const [data, setData] = useState<MenuRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyMenuRequestError> | null>(null);

  const workspaceUrl = useMemo(() => `/menu/dono${buildQuery(authQuery)}`, [authQuery]);

  const currentQuote: MenuQuoteVersionRecord | null = useMemo(() => {
    const quotes = Array.isArray(data?.quotes) ? data!.quotes! : [];
    const v = data?.currentQuoteVersion;
    if (!v) return null;
    return quotes.find((q) => q.version === v) || null;
  }, [data]);

  const clientT = data?.links?.client?.token || '';
  const propostaUrl = useMemo(() => {
    if (clientT) return `/menu/proposta?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientT)}`;
    return `/menu/proposta${buildQuery(authQuery)}`;
  }, [clientT, rid, authQuery]);

  useEffect(() => {
    let alive = true;

    if (!String(rid || '').trim() || !String(t || '').trim()) {
      setData(null);
      setIsLoading(false);
      setLoadError({
        kind: 'MISSING_TOKEN',
        title: 'Acesso restrito',
        description: 'Esta página é exclusiva do responsável. Abra a partir do link enviado por e-mail.',
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
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
    if (!String(rid || '').trim() || !String(t || '').trim()) return;
    const timer = window.setInterval(() => {
      fetchMenuRequest({ requestId: rid, token, t, view: 'owner' })
        .then((res) => setData(res))
        .catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [rid, token, t]);

  const statusMeta = getApprovedStatusMeta();

  return (
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-flow-frame menu-owner-state-frame">
        <div className="menu-cart-topbar menu-flow-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <span>Workspace do dono</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Proposta aprovada</strong>
            <Badge className="menu-cart-pill">Fluxo do responsável</Badge>
          </div>
          <div className="menu-owner-workspace-topbar-actions">
            <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(workspaceUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao workspace
            </Button>
          </div>
        </div>

        <section className="menu-catalog-actions-card menu-flow-intro-card menu-owner-state-intro menu-owner-state-intro--approved">
          <Badge className="menu-owner-state-kicker menu-owner-state-kicker--approved">Área do responsável</Badge>
          <h1 className="menu-owner-state-title">Proposta aprovada e travada</h1>
          <p className="menu-owner-state-copy">Painel final no padrão do cardápio para consultar versão aprovada, estado operacional e cobranças geradas sem perder continuidade visual.</p>
        </section>

        <Card className="menu-catalog-actions-card menu-flow-shell-card menu-owner-state-shell">
          <CardContent className="menu-flow-shell-body menu-owner-state-shell-body">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : !data ? (
              <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{loadError?.title || 'Não encontramos essa solicitação.'}</div>
                <div className="text-sm text-slate-600">{loadError?.description || 'Verifique o link e tente novamente.'}</div>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => navigate('/menu')}>
                    Ir para o início
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={`rounded-[28px] border p-6 shadow-sm ${statusMeta.panelClass}`}>
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <Badge variant="secondary" className={`w-fit rounded-full border ${statusMeta.chipClass}`}>{statusMeta.label}</Badge>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Ciclo finalizado com sucesso</h2>
                        <p className="mt-1 max-w-2xl text-sm opacity-80">{statusMeta.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <Lock className="h-3.5 w-3.5" />
                          Sem novas versões após a aprovação
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <Sparkles className="h-3.5 w-3.5" />
                          Painel de leitura operacional
                        </div>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:max-w-2xl">
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          Versão final
                        </div>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{currentQuote ? `v${currentQuote.version}` : '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">{currentQuote ? formatDateTimeBr(currentQuote.createdAt) : '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <Wallet className="h-3.5 w-3.5" />
                          Total final
                        </div>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{formatMoneyBr(currentQuote?.totals.total || 0)}</div>
                        <div className="mt-1 text-xs text-slate-500">Valor consolidado da versão aprovada</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Status
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-950">{currentQuote?.status || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">Proposta aprovada pelo cliente</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sincronização
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-950">{formatDateTimeBr(data.operational?.syncedAt || data.updatedAt || data.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Último sincronismo operacional</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Request ID</div>
                  <div className="mt-2 font-mono text-sm text-slate-800 break-all">{data.id}</div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Versão final aprovada</div>
                        <div className="mt-1 text-xs text-slate-500">Consulta rápida da proposta fechada.</div>
                      </div>
                      <Button variant="outline" className="gap-2 border-slate-200" onClick={() => navigate(propostaUrl)}>
                        <FileText className="h-4 w-4" />
                        Ver proposta
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{formatMoneyBr(currentQuote?.totals.total || 0)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="text-xs text-slate-500">Status</div>
                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {currentQuote?.status || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Estado operacional</div>
                        <div className="mt-1 text-xs text-slate-500">Resumo do que já foi criado no sistema interno.</div>
                      </div>
                      {data.operational?.stage ? (
                        <Badge variant="secondary" className="w-fit rounded-full border border-slate-200 bg-white text-slate-700">
                          {data.operational.stage.label}
                        </Badge>
                      ) : null}
                    </div>

                    {data.operational?.stage?.description ? (
                      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 text-sm text-slate-700 shadow-sm">
                        {data.operational.stage.description}
                      </div>
                    ) : null}
                  </div>
                </div>

                {Array.isArray(data.operational?.warnings) && data.operational!.warnings!.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {data.operational!.warnings!.map((warning) => (
                      <div key={warning.code} className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 shadow-sm">
                        {warning.message}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Proposta interna</div>
                    <div className="mt-3 text-sm font-semibold text-slate-950">{formatOperationalStatus(data.operational?.proposal?.status || data.proposalStatus)}</div>
                    <div className="mt-1 text-xs text-slate-600 break-all">ID: {data.proposalId || '—'}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="border-slate-200" disabled={!data.operational?.links?.proposal} onClick={() => openMenuHref(data.operational?.links?.proposal)}>
                        Abrir propostas
                      </Button>
                      <Button variant="outline" size="sm" className="border-slate-200" disabled={!data.operational?.links?.publicProposal} onClick={() => openMenuHref(data.operational?.links?.publicProposal, { newTab: true })}>
                        Portal público
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Campanha gerada</div>
                    <div className="mt-3 text-sm font-semibold text-slate-950">{data.operational?.campaign?.name || '—'}</div>
                    <div className="mt-1 text-xs text-slate-600 break-all">ID: {data.operational?.campaign?.id || data.campaignId || '—'}</div>
                    <div className="mt-1 text-xs text-slate-600">Status: <span className="font-semibold">{formatOperationalStatus(data.operational?.campaign?.status)}</span></div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="border-slate-200" disabled={!data.operational?.links?.campaign} onClick={() => openMenuHref(data.operational?.links?.campaign)}>
                        Abrir campanhas
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Reservas</div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">{data.operational?.reservations?.total ?? 0}</div>
                    <div className="mt-1 text-xs text-slate-600">{formatStatusCounts(data.operational?.reservations?.byStatus)}</div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="border-slate-200" disabled={!data.operational?.links?.reservations} onClick={() => openMenuHref(data.operational?.links?.reservations)}>
                        Abrir reservas
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Cobranças</div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">{data.operational?.billing?.total ?? 0}</div>
                    <div className="mt-1 text-xs text-slate-600">{formatStatusCounts(data.operational?.billing?.byStatus)}</div>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="border-slate-200" disabled={!data.operational?.links?.billing} onClick={() => openMenuHref(data.operational?.links?.billing)}>
                        Abrir financeiro
                      </Button>
                    </div>
                  </div>
                </div>

                {Array.isArray(data.operational?.billing?.invoices) && data.operational!.billing!.invoices.length > 0 ? (
                  <>
                    <Separator className="my-6" />
                    <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Layers3 className="h-4 w-4" />
                        Cobranças geradas
                      </div>
                      <div className="mt-4 space-y-3">
                        {data.operational!.billing!.invoices.map((invoice) => (
                          <div key={invoice.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-slate-950">
                                  {invoice.type ? `${invoice.type}${invoice.sequence ? ` #${invoice.sequence}` : ''}` : 'Cobrança'}
                                </div>
                                <div className="mt-1 text-xs text-slate-600 break-all">ID: {invoice.id}</div>
                              </div>
                              <div className="text-right text-sm text-slate-700">
                                <div className="font-semibold text-slate-950">{formatMoneyBr(invoice.amount)}</div>
                                <div className="mt-1 text-xs">Vencimento: {formatDateTimeBr(invoice.dueDate)}</div>
                                <div className="mt-1 text-xs">Status: <span className="font-semibold">{formatOperationalStatus(invoice.status)}</span></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
