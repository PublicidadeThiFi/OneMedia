import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, RefreshCw, AlertTriangle, PencilLine, MessageSquareQuote, Clock3, FileText, Sparkles } from 'lucide-react';
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

function getReviewStatusMeta() {
  return {
    label: 'Revisão solicitada',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-800',
    panelClass: 'border-amber-200 bg-amber-50/80 text-amber-950',
    description: 'O cliente pediu ajustes. Este é o momento de revisar a composição, entender o recado e preparar a próxima versão.',
  };
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

  const statusMeta = getReviewStatusMeta();

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#fff7ed_30%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-10">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="rounded-full border border-amber-200 bg-amber-50 text-amber-700">Área do responsável</Badge>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Revisão solicitada pelo cliente</h1>
                <p className="mt-1 text-sm text-slate-600">Um estado visual mais claro para entender o recado do cliente e preparar a nova versão.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 border-slate-200 bg-white/80" onClick={() => navigate(workspaceUrl)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar ao workspace
              </Button>
              <Button variant="outline" className="gap-2 border-slate-200 bg-white/80" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        <Card className="mt-6 overflow-hidden border-slate-200/80 bg-white/88 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardContent className="p-6 lg:p-8">
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
                        <h2 className="text-2xl font-semibold tracking-tight">Hora de ajustar a proposta</h2>
                        <p className="mt-1 max-w-2xl text-sm opacity-80">{statusMeta.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Cliente aguardando uma nova versão
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-slate-700">
                          <Sparkles className="h-3.5 w-3.5" />
                          Ajustes com histórico preservado
                        </div>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:max-w-2xl">
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          Versão atual
                        </div>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{currentQuote ? `v${currentQuote.version}` : '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">Enviada em {currentQuote ? formatDateTimeBr(currentQuote.createdAt) : '—'}</div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Atualização
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-950">{formatDateTimeBr(data.updatedAt || data.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">Última sincronização do pedido</div>
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

                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Versão que precisa de ajuste</div>
                    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700">
                      {currentQuote ? (
                        <>
                          <div>v{currentQuote.version} • enviada em <span className="font-semibold text-slate-950">{formatDateTimeBr(currentQuote.createdAt)}</span></div>
                          <div className="mt-2">Status atual: <span className="font-semibold text-slate-950">{currentQuote.status}</span></div>
                        </>
                      ) : (
                        <div>Nenhuma versão enviada ainda.</div>
                      )}
                    </div>

                    {currentQuote?.rejectReason ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
                        <div className="flex items-center gap-2 font-semibold">
                          <MessageSquareQuote className="h-4 w-4" />
                          Recado do cliente
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6">{currentQuote.rejectReason}</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="rounded-[24px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Próximo passo</div>
                      <div className="mt-1 text-sm text-slate-600">Volte ao workspace para ajustar itens, custos, descontos e enviar uma nova versão com histórico preservado.</div>
                    </div>
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
