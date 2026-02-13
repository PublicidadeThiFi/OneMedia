import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveMenuQuote,
  fetchMenuRequest,
  rejectMenuQuote,
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
  const [isActing, setIsActing] = useState(false);

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
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'client' });
        if (!alive) return;
        setData(res);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar.';
        toast.error('Não foi possível carregar', { description: String(msg) });
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
              <div className="text-sm text-gray-600">Não encontramos essa solicitação.</div>
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
                    <div className="text-xs text-gray-500">Descontos</div>
                    <div className="mt-1 text-lg font-bold text-gray-900">- {formatMoneyBr(currentQuote.totals.discount)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-900 bg-gray-900 px-4 py-3">
                    <div className="text-xs text-gray-300">Total</div>
                    <div className="mt-1 text-lg font-bold text-white">{formatMoneyBr(currentQuote.totals.total)}</div>
                  </div>
                </div>

                {Array.isArray(currentQuote.draft?.services) && currentQuote.draft.services.length > 0 && (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Serviços incluídos</div>
                      <div className="mt-3 space-y-2">
                        {currentQuote.draft.services.map((s, idx) => (
                          <div key={`${s.name}-${idx}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                            <div className="text-sm text-gray-900">{s.name}</div>
                            <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(s.value)}</div>
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
                </div>

                {showReject && (
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
