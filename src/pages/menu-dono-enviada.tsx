import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, Copy, ExternalLink, FileText, RefreshCw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
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
      toast.success('Copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const onRegenerateClient = async () => {
    try {
      setIsRegenerating(true);
      await regenerateMenuLink({ requestId: rid, aud: 'client', token, t });
      await refresh();
      toast.success('Link regenerado', { description: 'O link anterior foi invalidado e um novo foi gerado.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao regenerar.';
      toast.error('Não foi possível regenerar', { description: String(msg) });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Dono • Enviada</div>

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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Request ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={refresh}>
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>

                <Separator className="my-5" />

                <div className="text-sm font-semibold text-gray-900">Proposta atual</div>
                <div className="mt-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                  {currentQuote ? (
                    <>
                      <div>Versão: <span className="font-semibold">v{currentQuote.version}</span></div>
                      <div className="mt-1">Enviada em: <span className="font-semibold">{formatDateTimeBr(currentQuote.createdAt)}</span></div>
                      <div className="mt-1">Última abertura (proposta): <span className="font-semibold">{formatDateTimeBr(currentQuote.openedAt)}</span></div>
                      <div className="mt-1">Status: <span className="font-semibold">{currentQuote.status}</span></div>
                    </>
                  ) : (
                    <div>Nenhuma versão enviada ainda.</div>
                  )}
                </div>

                <Separator className="my-5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">Link do cliente (proposta)</div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={onRegenerateClient} disabled={isRegenerating}>
                        {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                        Regenerar
                      </Button>
                    </div>
                    {data.links?.client && (
                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links.client.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links.client.expiresAt)}</span></div>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button className="gap-2" onClick={() => navigate(clientProposalUrl)}>
                        <FileText className="h-4 w-4" />
                        Abrir
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => copy(full(clientProposalUrl))}>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 break-all">{full(clientProposalUrl)}</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Acompanhamento (timeline)</div>
                    {data.links?.client && (
                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links.client.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links.client.expiresAt)}</span></div>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => navigate(clientTrackUrl)}>
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => copy(full(clientTrackUrl))}>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 break-all">{full(clientTrackUrl)}</div>
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                  * Etapa 6: links assinados com expiração + rastreio (aberto/expira) + regeneração.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
