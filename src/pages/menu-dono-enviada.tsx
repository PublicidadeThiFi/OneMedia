import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, Copy, ExternalLink, FileText, RefreshCw, RotateCw, Sparkles, Clock3, Link2, BadgeCheck, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import '../components/menu/catalog/menuCatalogTheme.css';
import {
  classifyMenuRequestError,
  fetchMenuRequest,
  regenerateMenuLink,
  type MenuQuoteVersionRecord,
  type MenuRequestRecord,
} from '../lib/menuRequestApi';

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
  if (s === 'LEAD') return 'Lead';
  if (s === 'PROSPECT') return 'Prospect';
  if (s === 'CLIENTE') return 'Cliente';
  if (s === 'INATIVO') return 'Inativo';
  if (s === 'RASCUNHO') return 'Rascunho';
  if (s === 'ENVIADA') return 'Enviada';
  if (s === 'APROVADA') return 'Aprovada';
  if (s === 'REPROVADA') return 'Reprovada';
  if (s === 'EXPIRADA') return 'Expirada';
  return s;
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

function getSentStatusMeta() {
  return {
    label: 'Proposta enviada',
    chipClass: 'border-blue-200 bg-blue-50 text-blue-800',
    panelClass: 'border-blue-200 bg-blue-50/80 text-blue-950',
    description: 'A proposta já está com o cliente. Use este painel para acompanhar abertura, links ativos e o estado operacional do pedido.',
  };
}

export default function MenuDonoEnviada() {
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
  const [isRegenerating, setIsRegenerating] = useState(false);

  const workspaceUrl = useMemo(() => `/menu/dono${buildQuery(authQuery)}`, [authQuery]);

  const currentQuote: MenuQuoteVersionRecord | null = useMemo(() => {
    const quotes = Array.isArray(data?.quotes) ? data!.quotes! : [];
    const v = data?.currentQuoteVersion;
    if (!v) return null;
    return quotes.find((q) => q.version === v) || null;
  }, [data]);

  const refresh = async () => {
    if (!String(rid || '').trim() || !String(t || '').trim()) return;
    const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
    setData(res);
  };

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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const full = (path: string) => `${origin}${path}`;

  const clientT = data?.links?.client?.token || '';
  const clientProposalUrl = clientT
    ? `/menu/proposta?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientT)}`
    : `/menu/proposta${buildQuery(authQuery)}`;
  const clientTrackUrl = clientT
    ? `/menu/acompanhar?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientT)}`
    : `/menu/acompanhar${buildQuery(authQuery)}`;

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Copiado ✅');
    } catch {
      toast.error('Não consegui copiar');
    }
  };

  const onRegenerateClient = async () => {
    try {
      setIsRegenerating(true);
      await regenerateMenuLink({ requestId: rid, aud: 'client', token, t });
      await refresh();
      toast.success('Link regenerado ✅', { description: 'O link anterior foi desativado e um novo foi criado.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao regenerar.';
      toast.error('Não consegui regenerar', { description: String(msg) });
    } finally {
      setIsRegenerating(false);
    }
  };

  const statusMeta = getSentStatusMeta();

  return (
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-flow-frame menu-owner-state-frame">
        <div className="menu-cart-topbar menu-flow-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <span>Workspace do dono</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Proposta enviada</strong>
            <Badge className="menu-cart-pill">Fluxo do responsável</Badge>
          </div>
          <div className="menu-owner-workspace-topbar-actions">
            <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(workspaceUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao workspace
            </Button>
            <Button variant="outline" className="menu-owner-workspace-state-button" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <section className="menu-catalog-actions-card menu-flow-intro-card menu-owner-state-intro menu-owner-state-intro--sent">
          <Badge className="menu-owner-state-kicker menu-owner-state-kicker--sent">Área do responsável</Badge>
          <h1 className="menu-owner-state-title">Proposta enviada ao cliente</h1>
          <p className="menu-owner-state-copy">Visual do cardápio aplicado ao painel de acompanhamento, com foco em links, abertura da proposta e sincronização do pedido.</p>
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
                        <h2 className="text-2xl font-semibold tracking-tight">Cliente com a proposta em mãos</h2>
                        <p className="mt-1 max-w-2xl text-sm opacity-80">{statusMeta.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <Sparkles className="h-3.5 w-3.5" />
                          Versão {currentQuote ? `v${currentQuote.version}` : 'ainda não enviada'}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <Link2 className="h-3.5 w-3.5" />
                          Links assinados e rastreados
                        </div>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:max-w-2xl">
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          Versão
                        </div>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{currentQuote ? `v${currentQuote.version}` : '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">Enviada em {currentQuote ? formatDateTimeBr(currentQuote.createdAt) : '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Status
                        </div>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{currentQuote?.status || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">Situação da versão atual</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Última abertura
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-950">{formatDateTimeBr(currentQuote?.openedAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Abertura registrada da proposta</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Atualização
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-950">{formatDateTimeBr(data.updatedAt || data.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Sincronização mais recente</div>
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
                    <div className="text-sm font-semibold text-slate-900">Proposta atual</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="text-xs text-slate-500">Versão</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{currentQuote ? `v${currentQuote.version}` : '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="text-xs text-slate-500">Status</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{currentQuote?.status || '—'}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700">
                      <div>Enviada em <span className="font-semibold text-slate-950">{currentQuote ? formatDateTimeBr(currentQuote.createdAt) : '—'}</span></div>
                      <div className="mt-2">Última abertura da proposta <span className="font-semibold text-slate-950">{formatDateTimeBr(currentQuote?.openedAt)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Integração operacional</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Cliente interno</div>
                        <div className="mt-1 font-medium text-slate-900">{data.clientId ? 'Criado/sincronizado' : 'Pendente'}</div>
                        <div className="mt-1 text-xs text-slate-600 break-all">ID: {data.clientId || '—'}</div>
                        <div className="mt-1 text-xs text-slate-600">Status: <span className="font-semibold">{formatOperationalStatus(data.clientStatus)}</span></div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Proposta interna espelho</div>
                        <div className="mt-1 font-medium text-slate-900">{data.proposalId ? 'Criada/sincronizada' : 'Pendente'}</div>
                        <div className="mt-1 text-xs text-slate-600 break-all">ID: {data.proposalId || '—'}</div>
                        <div className="mt-1 text-xs text-slate-600">Status: <span className="font-semibold">{formatOperationalStatus(data.proposalStatus)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Link do cliente</div>
                        <div className="mt-1 text-xs text-slate-500">Proposta assinada com rastreio de abertura e expiração.</div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2 border-slate-200" onClick={onRegenerateClient} disabled={isRegenerating}>
                        {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                        Regenerar
                      </Button>
                    </div>

                    {data.links?.client ? (
                      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-600">
                        <div>Aberta em <span className="font-semibold text-slate-900">{formatDateTimeBr(data.links.client.openedAtLast)}</span></div>
                        <div className="mt-1">Expira em <span className="font-semibold text-slate-900">{formatDateTimeBr(data.links.client.expiresAt)}</span></div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button className="gap-2" onClick={() => navigate(clientProposalUrl)}>
                        <FileText className="h-4 w-4" />
                        Abrir proposta
                      </Button>
                      <Button variant="outline" className="gap-2 border-slate-200" onClick={() => copy(full(clientProposalUrl))}>
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </Button>
                    </div>
                    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3 text-xs text-slate-500 break-all">{full(clientProposalUrl)}</div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Acompanhamento do cliente</div>
                      <div className="mt-1 text-xs text-slate-500">A timeline pública mantém o cliente informado sobre o ciclo da solicitação.</div>
                    </div>

                    {data.links?.client ? (
                      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-600">
                        <div>Aberta em <span className="font-semibold text-slate-900">{formatDateTimeBr(data.links.client.openedAtLast)}</span></div>
                        <div className="mt-1">Expira em <span className="font-semibold text-slate-900">{formatDateTimeBr(data.links.client.expiresAt)}</span></div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" className="gap-2 border-slate-200" onClick={() => navigate(clientTrackUrl)}>
                        <ExternalLink className="h-4 w-4" />
                        Abrir timeline
                      </Button>
                      <Button variant="outline" className="gap-2 border-slate-200" onClick={() => copy(full(clientTrackUrl))}>
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </Button>
                    </div>
                    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3 text-xs text-slate-500 break-all">{full(clientTrackUrl)}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
