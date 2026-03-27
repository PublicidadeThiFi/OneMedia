import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, FileText, Sparkles, CalendarDays, Wallet, Package, Gift, MessageSquare, Clock3, Download } from 'lucide-react';
import { toast } from 'sonner';
import { MenuRequestErrorCard } from '../components/menu/MenuRequestErrorCard';
import {
  classifyMenuRequestError,
  approveMenuQuote,
  fetchMenuRequest,
  rejectMenuQuote,
  buildMenuContractUrl,
  extractFilenameFromContentDisposition,
  type MenuQuoteServiceLine,
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

function clampInt(v: any, min: number, max: number): number {
  const n = Math.floor(Number(v) || 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function buildReservationCutoffNotice(cutoffTime?: string | null) {
  const normalized = String(cutoffTime || '').trim();
  if (!normalized) return '';
  return `Check-ins realizados até ${normalized} contam no mesmo dia. Após esse horário, a vigência começa no dia seguinte.`;
}

function formatPeriod(parts?: { years?: any; months?: any; days?: any } | null): string {
  const years = clampInt(parts?.years, 0, 99);
  const months = clampInt(parts?.months, 0, 99);
  const days = clampInt(parts?.days, 0, 99);
  const segs: string[] = [];
  if (years) segs.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months) segs.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days || segs.length === 0) segs.push(`${days || 0} ${days === 1 ? 'dia' : 'dias'}`);
  return segs.join(', ');
}

function getQuoteStatusMeta(status?: string | null, isApproved?: boolean) {
  const normalized = String(status || '').trim().toUpperCase();
  if (isApproved || normalized === 'APPROVED') {
    return {
      label: 'Proposta aprovada',
      chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      panelClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
      description: 'Esta versão já foi aprovada e está bloqueada para novas edições.',
    };
  }
  if (normalized === 'REJECTED') {
    return {
      label: 'Revisão solicitada',
      chipClass: 'border-amber-200 bg-amber-50 text-amber-800',
      panelClass: 'border-amber-200 bg-amber-50/80 text-amber-950',
      description: 'Você pediu ajustes e a proposta voltou para revisão com o responsável.',
    };
  }
  return {
    label: 'Proposta pronta para decisão',
    chipClass: 'border-blue-200 bg-blue-50 text-blue-800',
    panelClass: 'border-blue-200 bg-blue-50/80 text-blue-950',
    description: 'Confira valores, adicionais, brindes e escolha entre aprovar ou solicitar ajustes.',
  };
}

export default function MenuProposta() {
  const navigate = useNavigation();

  const { token, t, rid, download } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || '',
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
      download: sp.get('download') || sp.get('dl') || sp.get('downloadContract') || '',
    };
  }, []);

  const [data, setData] = useState<MenuRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyMenuRequestError> | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isDownloadingContract, setIsDownloadingContract] = useState(false);
  const [autoDownloadDone, setAutoDownloadDone] = useState(false);

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);
  const backUrl = useMemo(() => `/menu/acompanhar${buildQuery(authQuery)}`, [authQuery]);

  const currentQuote: MenuQuoteVersionRecord | null = useMemo(() => {
    const quotes = Array.isArray(data?.quotes) ? data!.quotes! : [];
    const v = data?.currentQuoteVersion;
    if (!v) return null;
    return quotes.find((q) => q.version === v) || null;
  }, [data]);

  const refresh = async () => {
    const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'client' });
    setData(res);
  };

  useEffect(() => {
    let alive = true;

    // rid é obrigatório para carregar a proposta
    if (!String(rid || '').trim()) {
      setData(null);
      setIsLoading(false);
      setLoadError({
        kind: 'MISSING_TOKEN',
        title: 'Acesso inválido',
        description: 'O link está incompleto. Abra a proposta a partir do link enviado.',
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

  const canApprove = Boolean(currentQuote) && currentQuote?.status !== 'APPROVED' && String(data?.status || '').toUpperCase() !== 'APPROVED';
  const canReject = Boolean(currentQuote) && currentQuote?.status === 'SENT' && String(data?.status || '').toUpperCase() !== 'APPROVED';

  const isApproved = Boolean(currentQuote) && (currentQuote?.status === 'APPROVED' || String(data?.status || '').toUpperCase() === 'APPROVED');

  const contractDownloadUrl = useMemo(() => {
    if (!String(rid || '').trim()) return '';
    return buildMenuContractUrl({ requestId: rid, token, t });
  }, [rid, token, t]);

  const shouldAutoDownloadContract = useMemo(() => {
    const v = String(download || '').trim().toLowerCase();
    return v === 'contract' || v === 'pdf' || v === '1' || v === 'true';
  }, [download]);

  // Etapa F — Serviços/Descontos
  // F1) "serviço manual" deve aparecer na lista de serviços.
  // F2) Separar visualmente desconto em serviços (por linha) vs descontos gerais.
  const quoteBreakdown = currentQuote?.totals?.breakdown as any;

  const servicesIncluded = useMemo(() => {
    const out: Array<MenuQuoteServiceLine & { __manual?: boolean }> = [];

    const lines = Array.isArray(currentQuote?.draft?.services) ? (currentQuote!.draft!.services as MenuQuoteServiceLine[]) : [];
    for (const s of lines) {
      const name = String((s as any)?.name || '').trim();
      const value = Math.max(0, Number((s as any)?.value || 0));
      if (!name || !Number.isFinite(value) || value <= 0) continue;
      out.push({ ...(s as any), name, value: Number(value.toFixed(2)), lineType: 'SERVICO' } as any);
    }

    const manualValue = Math.max(0, Number((currentQuote as any)?.draft?.manualServiceValue || 0));
    if (Number.isFinite(manualValue) && manualValue > 0) {
      out.push({ name: 'Serviço manual', value: Number(manualValue.toFixed(2)), __manual: true, lineType: 'SERVICO' } as any);
    }

    return out;
  }, [currentQuote?.draft?.services, (currentQuote as any)?.draft?.manualServiceValue]);

  const productsIncluded = useMemo(() => {
    const out: Array<MenuQuoteServiceLine> = [];
    const lines = Array.isArray((currentQuote as any)?.draft?.products) ? (((currentQuote as any).draft.products) as MenuQuoteServiceLine[]) : [];
    for (const s of lines) {
      const name = String((s as any)?.name || '').trim();
      const value = Math.max(0, Number((s as any)?.value || 0));
      if (!name || !Number.isFinite(value) || value <= 0) continue;
      out.push({ ...(s as any), name, value: Number(value.toFixed(2)), lineType: 'PRODUTO' } as any);
    }
    return out;
  }, [(currentQuote as any)?.draft?.products]);

  const onApprove = async () => {
    try {
      setIsActing(true);
      await approveMenuQuote({ requestId: rid, token, t });
      toast.success('Aprovado ✅', { description: 'Registramos sua aprovação.' });
      await refresh();
      navigate(backUrl);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao aprovar.';
      toast.error('Não foi possível aprovar', { description: String(msg) });
    } finally {
      setIsActing(false);
    }
  };

  const onReject = async () => {
    try {
      setIsActing(true);
      await rejectMenuQuote({ requestId: rid, token, t, reason: rejectReason });
      toast.success('Ajustes solicitados', { description: 'Enviamos seu pedido de ajuste ao responsável.' });
      setShowReject(false);
      setRejectReason('');
      await refresh();
      navigate(backUrl);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao solicitar revisão.';
      toast.error('Não foi possível solicitar revisão', { description: String(msg) });
    } finally {
      setIsActing(false);
    }
  };

  const onDownloadContract = useCallback(async () => {
    if (!String(contractDownloadUrl || '').trim()) return;

    try {
      setIsDownloadingContract(true);

      // Tentativa 1: download via fetch (permite salvar com nome correto).
      // Pode falhar por CORS em produção, então temos fallback.
      const resp = await fetch(contractDownloadUrl, { method: 'GET' });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `HTTP ${resp.status}`);
      }

      const blob = await resp.blob();
      const fallbackName = `contrato-${rid || 'cardapio'}.pdf`;
      const fileName = extractFilenameFromContentDisposition(resp.headers.get('content-disposition'), fallbackName);

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      toast.success('Baixando contrato…');
    } catch (err: any) {
      // Fallback: abre em nova aba (funciona mesmo sem CORS; depende do header do back).
      try {
        window.open(contractDownloadUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // ignore
      }
      const msg = err?.message ? String(err.message) : 'Falha ao baixar.';
      toast.error('Não foi possível baixar automaticamente', { description: msg });
    } finally {
      setIsDownloadingContract(false);
    }
  }, [contractDownloadUrl, rid]);

  // Etapa 1 — Link do e-mail (GitHub Pages) não pode apontar direto para /api.
  // Então o e-mail aponta para /menu/proposta?...&download=contract e o front inicia o download.
  useEffect(() => {
    if (autoDownloadDone) return;
    if (!shouldAutoDownloadContract) return;
    if (isLoading) return;
    if (!isApproved) return;
    if (!String(contractDownloadUrl || '').trim()) return;

    setAutoDownloadDone(true);
    // best-effort: inicia download e mantém a tela caso o usuário queira tentar manualmente
    void onDownloadContract();
  }, [autoDownloadDone, shouldAutoDownloadContract, isLoading, isApproved, contractDownloadUrl, onDownloadContract]);

  const quoteStatusMeta = useMemo(() => getQuoteStatusMeta(currentQuote?.status, isApproved), [currentQuote?.status, isApproved]);
  const quoteItemsCount = data?.items?.length ?? 0;
  const quotePointsCount = useMemo(() => new Set((data?.items || []).map((item) => item.pointId).filter(Boolean)).size, [data?.items]);
  const hasAddons = servicesIncluded.length > 0 || productsIncluded.length > 0;
  const hasGifts = Array.isArray(currentQuote?.draft?.gifts) && currentQuote.draft.gifts.length > 0;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_34%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm">
                Proposta
              </Badge>
              <div className="text-sm text-slate-500">Visão do cliente</div>
            </div>

            <div className="sm:ml-auto">
              <Button variant="ghost" className="gap-2 rounded-full px-4 text-slate-700 hover:bg-slate-100" onClick={() => navigate(backUrl)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="flex items-center gap-3 px-6 py-8 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
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
                    label: 'Voltar para acompanhamento',
                    variant: 'ghost',
                    onClick: () => navigate(backUrl),
                  }}
                />
              </CardContent>
            </Card>
          ) : !currentQuote ? (
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-sm">
              <CardContent className="px-6 py-8">
                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(241,245,249,0.92)_100%)] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-slate-900 text-white shadow-sm">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xl font-semibold text-slate-950">Ainda não tem proposta por aqui</div>
                      <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        O responsável ainda não enviou a proposta. Enquanto isso, você pode voltar para o acompanhamento e verificar se o pedido já entrou em revisão.
                      </div>
                      <div className="mt-5">
                        <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => navigate(backUrl)}>
                          Voltar para acompanhamento
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <CardContent className="p-0">
                <div className="border-b border-slate-200/70 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(30,41,59,0.96)_44%,_rgba(37,99,235,0.9)_100%)] px-6 py-7 text-white md:px-7 md:py-8">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${quoteStatusMeta.chipClass}`}>
                          {quoteStatusMeta.label}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/90">
                          Versão v{currentQuote.version}
                        </Badge>
                      </div>

                      <div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sua proposta já está pronta para decisão</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 md:text-[15px]">
                          {quoteStatusMeta.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {!isApproved ? (
                          <>
                            <Button className="gap-2 rounded-full border border-white/10 bg-white text-slate-950 hover:bg-slate-100" disabled={!canApprove || isActing} onClick={onApprove}>
                              <CheckCircle2 className="h-4 w-4" />
                              Aprovar proposta
                            </Button>
                            <Button variant="outline" className="gap-2 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10" disabled={!canReject || isActing} onClick={() => setShowReject((s) => !s)}>
                              <XCircle className="h-4 w-4" />
                              Solicitar revisão
                            </Button>
                          </>
                        ) : null}

                        {isApproved && String(contractDownloadUrl || '').trim() ? (
                          <Button type="button" className="gap-2 rounded-full border border-white/10 bg-white text-slate-950 hover:bg-slate-100" disabled={isDownloadingContract} onClick={onDownloadContract}>
                            {isDownloadingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Baixar contrato (PDF)
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Total</div>
                          <div className="mt-2 text-2xl font-semibold text-white">{formatMoneyBr(currentQuote.totals.total)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Enviada em</div>
                          <div className="mt-2 text-sm font-semibold text-white">{formatDateTimeBr(currentQuote.createdAt)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Itens</div>
                          <div className="mt-2 text-2xl font-semibold text-white">{quoteItemsCount}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Pontos</div>
                          <div className="mt-2 text-2xl font-semibold text-white">{quotePointsCount}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 px-6 py-6 md:px-7 lg:grid-cols-[minmax(0,1.2fr)_360px]">
                  <div className="space-y-6">
                    {currentQuote.status === 'APPROVED' ? (
                      <div className="rounded-[26px] border border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.96)_0%,_rgba(240,253,244,0.86)_100%)] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                          <CheckCircle2 className="h-4 w-4" />
                          Proposta aprovada
                        </div>
                        <div className="mt-2 text-sm leading-6 text-emerald-900">Esta versão já foi aprovada e está travada para manter a segurança do que foi validado por você.</div>
                      </div>
                    ) : null}

                    {currentQuote.status === 'REJECTED' ? (
                      <div className="rounded-[26px] border border-amber-200 bg-[linear-gradient(180deg,_rgba(255,251,235,0.96)_0%,_rgba(254,243,199,0.86)_100%)] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                          <XCircle className="h-4 w-4" />
                          Ajustes solicitados
                        </div>
                        {currentQuote.rejectReason ? (
                          <div className="mt-2 text-sm leading-6 text-amber-900 whitespace-pre-wrap">{currentQuote.rejectReason}</div>
                        ) : (
                          <div className="mt-2 text-sm leading-6 text-amber-900">Seu pedido de revisão já foi enviado ao responsável.</div>
                        )}
                      </div>
                    ) : null}

                    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        Resumo financeiro
                      </div>
                      <div className="mt-1 text-sm text-slate-600">Os valores abaixo mostram a composição da proposta com base, adicionais, descontos e total final.</div>

                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Base (pontos/faces)</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoneyBr(currentQuote.totals.base)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Serviços</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoneyBr(currentQuote.totals.services)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Custos de produção</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoneyBr(currentQuote.totals.costs ?? 0)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Descontos</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">- {formatMoneyBr(currentQuote.totals.discount)}</div>
                          {quoteBreakdown ? (
                            <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                              {(quoteBreakdown?.servicesLineDiscount ?? 0) > 0 ? <div>Em serviços: - {formatMoneyBr(quoteBreakdown?.servicesLineDiscount ?? 0)}</div> : null}
                              {(quoteBreakdown?.costsLineDiscount ?? 0) > 0 ? <div>Em custos: - {formatMoneyBr(quoteBreakdown?.costsLineDiscount ?? 0)}</div> : null}
                              {Array.isArray(quoteBreakdown?.appliedDiscounts) && quoteBreakdown.appliedDiscounts.length > 0 ? (
                                <div className="pt-1 space-y-1">
                                  {quoteBreakdown.appliedDiscounts.map((discount: any, idx: number) => (
                                    <div key={String(discount?.id || `ad_${idx}`)} className="truncate">
                                      {(discount?.label || (discount?.scope === 'FACE' ? 'Face' : discount?.scope === 'POINT' ? 'Ponto' : 'Geral'))}: - {formatMoneyBr(Number(discount?.amount || 0))}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[24px] border border-slate-900 bg-slate-950 px-5 py-5 text-white">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total da proposta</div>
                        <div className="mt-2 text-3xl font-semibold">{formatMoneyBr(currentQuote.totals.total)}</div>
                      </div>
                    </section>

                    {data?.reservationStartCutoffTime ? (
                      <section className="rounded-[28px] border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
                          <Clock3 className="h-4 w-4" />
                          Início da vigência
                        </div>
                        <div className="mt-2 text-sm leading-6 text-blue-900">{buildReservationCutoffNotice(data.reservationStartCutoffTime)}</div>
                      </section>
                    ) : null}

                    {hasAddons ? (
                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <Package className="h-4 w-4 text-blue-600" />
                          Itens adicionais incluídos
                        </div>
                        <div className="mt-1 text-sm text-slate-600">Serviços e produtos que complementam a mídia escolhida nesta proposta.</div>

                        <div className="mt-5 space-y-5">
                          {servicesIncluded.length > 0 ? (
                            <div>
                              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Serviços</div>
                              <div className="space-y-2">
                                {servicesIncluded.map((service: any, idx: number) => {
                                  const value = Math.max(0, Number(service?.value || 0));
                                  const dp = service?.__manual ? 0 : Math.max(0, Number(service?.discountPercent || 0));
                                  const df = service?.__manual ? 0 : Math.max(0, Number(service?.discountFixed || 0));
                                  const lineDiscount = Number(Math.min(value, value * (dp / 100) + df).toFixed(2));
                                  const hasLineDiscount = lineDiscount > 0;

                                  return (
                                    <div key={`${String(service.name)}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-slate-950 truncate">{service.name}</div>
                                          {hasLineDiscount ? <div className="mt-1 text-xs text-slate-500">Desconto do serviço: - {formatMoneyBr(lineDiscount)}</div> : null}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-950">{formatMoneyBr(value)}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {productsIncluded.length > 0 ? (
                            <div>
                              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Produtos</div>
                              <div className="space-y-2">
                                {productsIncluded.map((product: any, idx: number) => {
                                  const value = Math.max(0, Number(product?.value || 0));
                                  const dp = Math.max(0, Number(product?.discountPercent || 0));
                                  const df = Math.max(0, Number(product?.discountFixed || 0));
                                  const lineDiscount = Number(Math.min(value, value * (dp / 100) + df).toFixed(2));
                                  const hasLineDiscount = lineDiscount > 0;

                                  return (
                                    <div key={`${String(product.name)}-prod-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-slate-950 truncate">{product.name}</div>
                                          {hasLineDiscount ? <div className="mt-1 text-xs text-slate-500">Desconto do produto: - {formatMoneyBr(lineDiscount)}</div> : null}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-950">{formatMoneyBr(value)}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </section>
                    ) : null}

                    {hasGifts ? (
                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <Gift className="h-4 w-4 text-blue-600" />
                          Brindes inclusos
                        </div>
                        <div className="mt-1 text-sm text-slate-600">Itens gratuitos com período de ocupação que entram como contrapartida sem alterar o total final.</div>

                        <div className="mt-5 space-y-2">
                          {currentQuote.draft?.gifts?.map((gift: any) => (
                            <div key={String(gift.id)} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-950 truncate">
                                    {(String(gift.scope || '').toUpperCase() === 'FACE' ? 'Face' : 'Ponto')}: {gift.label || gift.targetId}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">Período: {formatPeriod(gift.duration)}</div>
                                </div>
                                <div className="text-sm font-semibold text-slate-950">{formatMoneyBr(0)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {currentQuote.draft?.message ? (
                      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          Recado do responsável
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                          {currentQuote.draft.message}
                        </div>
                      </section>
                    ) : null}

                    {isApproved && (data?.operational?.campaign || data?.operational?.billing?.total) ? (
                      <section className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.96)_0%,_rgba(240,253,244,0.86)_100%)] p-5 shadow-sm">
                        <div className="text-sm font-semibold text-emerald-950">Aprovação registrada no fluxo operacional</div>
                        <div className="mt-1 text-sm leading-6 text-emerald-900">A campanha e as cobranças já começaram a ser geradas no sistema interno.</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Campanha</div>
                            <div className="mt-2 text-base font-semibold text-emerald-950">{data?.operational?.campaign?.name || 'Em preparação'}</div>
                            <div className="mt-1 text-sm text-emerald-900">Status: {formatOperationalStatus(data?.operational?.campaign?.status)}</div>
                          </div>
                          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Cobranças</div>
                            <div className="mt-2 text-base font-semibold text-emerald-950">{data?.operational?.billing?.total ?? 0}</div>
                            <div className="mt-1 text-sm text-emerald-900">{formatStatusCounts(data?.operational?.billing?.byStatus)}</div>
                          </div>
                        </div>
                      </section>
                    ) : null}
                  </div>

                  <div className="space-y-6">
                    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Decisão da proposta
                      </div>
                      <div className="mt-1 text-sm text-slate-600">Revise tudo e escolha o próximo passo com tranquilidade.</div>

                      <div className="mt-5 space-y-3">
                        {!isApproved ? (
                          <>
                            <Button className="w-full gap-2 rounded-full bg-slate-950 text-white hover:bg-slate-800" disabled={!canApprove || isActing} onClick={onApprove}>
                              <CheckCircle2 className="h-4 w-4" />
                              Aprovar proposta
                            </Button>
                            <Button variant="outline" className="w-full gap-2 rounded-full" disabled={!canReject || isActing} onClick={() => setShowReject((s) => !s)}>
                              <XCircle className="h-4 w-4" />
                              Solicitar revisão
                            </Button>
                          </>
                        ) : null}

                        {isApproved && String(contractDownloadUrl || '').trim() ? (
                          <Button type="button" variant="secondary" className="w-full gap-2 rounded-full" disabled={isDownloadingContract} onClick={onDownloadContract}>
                            {isDownloadingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Baixar contrato (PDF)
                          </Button>
                        ) : null}
                      </div>

                      {showReject && !isApproved ? (
                        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                          <div className="text-sm font-semibold text-slate-950">O que você quer ajustar?</div>
                          <div className="mt-1 text-xs text-slate-500">Ex.: prazo, desconto, serviços, ponto específico…</div>
                          <div className="mt-3">
                            <Textarea placeholder="Escreva aqui (opcional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Button disabled={isActing} onClick={onReject}>Enviar revisão</Button>
                            <Button variant="ghost" disabled={isActing} onClick={() => setShowReject(false)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        Detalhes da versão
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Request ID</div>
                          <div className="mt-2 break-all font-mono text-sm text-slate-800">{data.id}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Versão</div>
                          <div className="mt-2 text-sm font-semibold text-slate-950">v{currentQuote.version}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Enviada em</div>
                          <div className="mt-2 text-sm font-semibold text-slate-950">{formatDateTimeBr(currentQuote.createdAt)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status atual</div>
                          <div className="mt-2 text-sm font-semibold text-slate-950">{quoteStatusMeta.label}</div>
                        </div>
                      </div>
                    </section>

                    <section className={`rounded-[28px] border p-5 shadow-sm ${quoteStatusMeta.panelClass}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock3 className="h-4 w-4" />
                        Próximo passo recomendado
                      </div>
                      <div className="mt-2 text-sm leading-6 opacity-90">
                        {isApproved
                          ? 'Baixe o contrato para guardar a formalização da proposta aprovada e acompanhe a evolução da campanha na tela de status.'
                          : 'Leia os valores com calma e decida entre aprovar agora ou pedir ajustes ao responsável.'}
                      </div>
                    </section>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
