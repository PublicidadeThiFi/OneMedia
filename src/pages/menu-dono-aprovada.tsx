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
                    <div className="mt-1 text-xs text-gray-200">Este estado representa o fim do ciclo no protótipo.</div>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
