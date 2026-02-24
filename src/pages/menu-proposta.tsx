import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
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

export default function MenuProposta() {
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
  const [isActing, setIsActing] = useState(false);
  const [isDownloadingContract, setIsDownloadingContract] = useState(false);

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
      out.push({ ...(s as any), name, value: Number(value.toFixed(2)) });
    }

    const manualValue = Math.max(0, Number((currentQuote as any)?.draft?.manualServiceValue || 0));
    if (Number.isFinite(manualValue) && manualValue > 0) {
      out.push({ name: 'Serviço manual', value: Number(manualValue.toFixed(2)), __manual: true } as any);
    }

    return out;
  }, [currentQuote?.draft?.services, (currentQuote as any)?.draft?.manualServiceValue]);

  const onApprove = async () => {
    try {
      setIsActing(true);
      await approveMenuQuote({ requestId: rid, token, t });
      toast.success('Aprovada!', { description: 'Registramos sua aprovação (protótipo).' });
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
      toast.success('Revisão solicitada', { description: 'Enviamos o pedido de revisão ao responsável (protótipo).' });
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

  const onDownloadContract = async () => {
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

      toast.success('Download iniciado');
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
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Proposta</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <Card className="mt-5">
          <CardContent className="py-6">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : !data ? (
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
            ) : !currentQuote ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Ainda não há proposta</div>
                    <div className="mt-1 text-sm text-gray-600">
                      O responsável ainda não enviou a proposta. Você pode acompanhar pelo status.
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => navigate(backUrl)}>
                        Voltar para acompanhamento
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Request ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Versão <span className="font-semibold">v{currentQuote.version}</span> • enviada em{' '}
                    <span className="font-semibold">{formatDateTimeBr(currentQuote.createdAt)}</span>
                  </div>
                </div>

                {currentQuote.status === 'APPROVED' && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Proposta aprovada
                    </div>
                    <div className="mt-1 text-xs text-green-800">Esta versão está travada (protótipo).</div>
                  </div>
                )}

                {currentQuote.status === 'REJECTED' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <XCircle className="h-4 w-4" />
                      Revisão solicitada
                    </div>
                    {currentQuote.rejectReason && (
                      <div className="mt-1 text-xs text-amber-800 whitespace-pre-wrap">{currentQuote.rejectReason}</div>
                    )}
                  </div>
                )}

                <Separator className="my-5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Base (pontos/faces)</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">{formatMoneyBr(currentQuote.totals.base)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Serviços</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">{formatMoneyBr(currentQuote.totals.services)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Custos de produção</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">{formatMoneyBr(currentQuote.totals.costs ?? 0)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Descontos</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">- {formatMoneyBr(currentQuote.totals.discount)}</div>
                    {quoteBreakdown ? (
                      <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                        {(quoteBreakdown?.servicesLineDiscount ?? 0) > 0 ? (
                          <div>Em serviços: - {formatMoneyBr(quoteBreakdown?.servicesLineDiscount ?? 0)}</div>
                        ) : null}
                        {(quoteBreakdown?.costsLineDiscount ?? 0) > 0 ? (
                          <div>Em custos: - {formatMoneyBr(quoteBreakdown?.costsLineDiscount ?? 0)}</div>
                        ) : null}

                        {Array.isArray(quoteBreakdown?.appliedDiscounts) && quoteBreakdown.appliedDiscounts.length > 0 ? (
                          <div className="mt-1 space-y-0.5">
                            {quoteBreakdown.appliedDiscounts.map((d: any, idx: number) => (
                              <div key={String(d?.id || `ad_${idx}`)} className="truncate">
                                {(d?.label || (d?.scope === 'FACE' ? 'Face' : d?.scope === 'POINT' ? 'Ponto' : 'Geral'))}:
                                {' '} - {formatMoneyBr(Number(d?.amount || 0))}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="col-span-1 sm:col-span-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3"
                    style={{ backgroundColor: "#111827", color: "#ffffff" }}
                  >
                    <div className="text-xs text-gray-300">Total</div>
                    <div className="mt-1 text-lg font-bold text-white">{formatMoneyBr(currentQuote.totals.total)}</div>
                  </div>
                </div>

                {servicesIncluded.length > 0 && (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Serviços incluídos</div>
                      <div className="mt-3 space-y-2">
                        {servicesIncluded.map((s: any, idx: number) => {
                          const value = Math.max(0, Number(s?.value || 0));
                          const dp = s?.__manual ? 0 : Math.max(0, Number(s?.discountPercent || 0));
                          const df = s?.__manual ? 0 : Math.max(0, Number(s?.discountFixed || 0));
                          const lineDiscount = Number(Math.min(value, value * (dp / 100) + df).toFixed(2));
                          const hasLineDiscount = lineDiscount > 0;

                          return (
                            <div key={`${String(s.name)}-${idx}`} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                                  {hasLineDiscount ? (
                                    <div className="mt-0.5 text-xs text-gray-600">Desconto do serviço: - {formatMoneyBr(lineDiscount)}</div>
                                  ) : null}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(value)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {Array.isArray(currentQuote.draft?.gifts) && currentQuote.draft.gifts.length > 0 && (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Brindes (R$ 0)</div>
                      <div className="mt-1 text-xs text-gray-600">
                        Itens gratuitos com período de ocupação. Não alteram o total da proposta e constam como contrapartida.
                      </div>
                      <div className="mt-3 space-y-2">
                        {currentQuote.draft.gifts.map((g: any) => (
                          <div key={String(g.id)} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  {(String(g.scope || '').toUpperCase() === 'FACE' ? 'Face' : 'Ponto')}: {g.label || g.targetId}
                                </div>
                                <div className="mt-0.5 text-xs text-gray-600">Período: {formatPeriod(g.duration)}</div>
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(0)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {currentQuote.draft?.message && (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Mensagem do responsável</div>
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{currentQuote.draft.message}</div>
                    </div>
                  </>
                )}

                <Separator className="my-5" />

                <div className="flex flex-col sm:flex-row gap-3">
                  {!isApproved && (
                    <>
                      <Button className="gap-2" disabled={!canApprove || isActing} onClick={onApprove}>
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={!canReject || isActing}
                        onClick={() => setShowReject((s) => !s)}
                      >
                        <XCircle className="h-4 w-4" />
                        Solicitar revisão
                      </Button>
                    </>
                  )}

                  {isApproved && String(contractDownloadUrl || '').trim() && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      disabled={isDownloadingContract}
                      onClick={onDownloadContract}
                    >
                      {isDownloadingContract ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Baixar contrato
                    </Button>
                  )}
                </div>

                {showReject && !isApproved && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">O que você quer ajustar?</div>
                    <div className="mt-1 text-xs text-gray-600">Ex.: prazo, desconto, serviços, ponto específico…</div>
                    <div className="mt-3">
                      <Textarea
                        placeholder="Escreva aqui (opcional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button disabled={isActing} onClick={onReject}>Enviar revisão</Button>
                      <Button variant="ghost" disabled={isActing} onClick={() => setShowReject(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
