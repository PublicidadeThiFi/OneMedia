import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, Lock, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
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

    // Etapa 8 — blindagem: páginas do responsável só via link assinado (t)
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

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Dono • Aprovada (travada)</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(workspaceUrl)}>
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
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-900">{loadError?.title || 'Não encontramos essa solicitação.'}</div>
                <div className="text-sm text-gray-600">{loadError?.description || 'Verifique o link e tente novamente.'}</div>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => navigate('/menu')}>
                    Ir para o início
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-white">
                  <div className="mt-0.5 h-9 w-9 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Proposta aprovada e travada</div>
                    <div className="mt-1 text-xs text-gray-200">Este ciclo foi finalizado.</div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                  <div className="text-xs text-gray-500">Request ID</div>
                  <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Versão final</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {currentQuote ? `v${currentQuote.version} • ${formatDateTimeBr(currentQuote.createdAt)}` : '—'}
                      </div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => navigate(propostaUrl)}>
                      <FileText className="h-4 w-4" />
                      Ver proposta
                    </Button>
                  </div>

                  {currentQuote && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-lg font-bold text-gray-900">{formatMoneyBr(currentQuote.totals.total)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {currentQuote.status}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 px-3 py-3">
                      <div className="text-xs text-gray-500">Proposta interna</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{formatOperationalStatus(data.operational?.proposal?.status || data.proposalStatus)}</div>
                      <div className="mt-1 text-xs text-gray-600 break-all">ID: {data.proposalId || '—'}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 px-3 py-3">
                      <div className="text-xs text-gray-500">Campanha gerada</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{data.operational?.campaign?.name || '—'}</div>
                      <div className="mt-1 text-xs text-gray-600 break-all">ID: {data.operational?.campaign?.id || data.campaignId || '—'}</div>
                      <div className="mt-1 text-xs text-gray-600">Status: <span className="font-semibold">{formatOperationalStatus(data.operational?.campaign?.status)}</span></div>
                    </div>
                    <div className="rounded-xl border border-gray-200 px-3 py-3">
                      <div className="text-xs text-gray-500">Reservas</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{data.operational?.reservations?.total ?? 0}</div>
                      <div className="mt-1 text-xs text-gray-600">{formatStatusCounts(data.operational?.reservations?.byStatus)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 px-3 py-3">
                      <div className="text-xs text-gray-500">Cobranças</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{data.operational?.billing?.total ?? 0}</div>
                      <div className="mt-1 text-xs text-gray-600">{formatStatusCounts(data.operational?.billing?.byStatus)}</div>
                    </div>
                  </div>

                  {Array.isArray(data.operational?.billing?.invoices) && data.operational!.billing!.invoices.length > 0 ? (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Cobranças geradas</div>
                        <div className="mt-3 space-y-2">
                          {data.operational!.billing!.invoices.map((invoice) => (
                            <div key={invoice.id} className="rounded-xl border border-gray-200 px-3 py-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {invoice.type ? `${invoice.type}${invoice.sequence ? ` #${invoice.sequence}` : ''}` : 'Cobrança'}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-600 break-all">ID: {invoice.id}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(invoice.amount)}</div>
                                  <div className="mt-1 text-xs text-gray-600">Vencimento: {formatDateTimeBr(invoice.dueDate)}</div>
                                  <div className="mt-1 text-xs text-gray-600">Status: <span className="font-semibold">{formatOperationalStatus(invoice.status)}</span></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
