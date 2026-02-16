import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, RefreshCw, AlertTriangle, PencilLine } from 'lucide-react';
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

export default function MenuDonoRevisao() {
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

  const refresh = async () => {
    const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
    setData(res);
  };

  useEffect(() => {
    let alive = true;
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
          <div className="text-sm text-gray-600">Dono • Revisão solicitada</div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(workspaceUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" className="gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
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
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">Cliente solicitou revisão</div>
                    <div className="mt-1 text-xs text-amber-800">Ajuste a proposta e envie uma nova versão (v2, v3…).</div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                  <div className="text-xs text-gray-500">Request ID</div>
                  <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>

                  <div className="mt-4 text-sm font-semibold text-gray-900">Versão atual</div>
                  <div className="mt-2 text-sm text-gray-700">
                    {currentQuote ? (
                      <>
                        <div>v{currentQuote.version} • enviada em <span className="font-semibold">{formatDateTimeBr(currentQuote.createdAt)}</span></div>
                        <div className="mt-1">Status: <span className="font-semibold">{currentQuote.status}</span></div>
                        {currentQuote.rejectReason && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-500">Mensagem do cliente</div>
                            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 whitespace-pre-wrap">{currentQuote.rejectReason}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>Nenhuma versão enviada ainda.</div>
                    )}
                  </div>

                  <div className="mt-5">
                    <Button className="gap-2" onClick={() => navigate(workspaceUrl)}>
                      <PencilLine className="h-4 w-4" />
                      Ajustar e enviar nova versão
                    </Button>
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
