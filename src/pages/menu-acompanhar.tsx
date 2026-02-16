import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, CircleDot, FileText, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { daysToDurationParts, formatDurationParts } from '../lib/menuCart';
import { fetchMenuRequest, type MenuRequestRecord } from '../lib/menuRequestApi';

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

export default function MenuAcompanhar() {
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

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const backToSent = useMemo(() => {
    return `/menu/enviado${buildQuery(authQuery)}`;
  }, [authQuery]);

  const propostaUrl = useMemo(() => {
    return `/menu/proposta${buildQuery(authQuery)}`;
  }, [authQuery]);

  const ownerUrl = useMemo(() => {
    return `/menu/dono${buildQuery({ token, rid })}`;
  }, [token, rid]);

  const timeline = useMemo(() => {
    const events = Array.isArray(data?.events) ? data!.events! : [];
    const getAt = (t: string) => events.find((e) => e.type === t)?.at || null;

    return [
      {
        key: 'REQUEST_SUBMITTED',
        title: 'Solicitação enviada',
        desc: 'Recebemos sua solicitação e enviamos ao responsável.',
        at: getAt('REQUEST_SUBMITTED'),
      },
      {
        key: 'OWNER_OPENED',
        title: 'Em análise',
        desc: 'O responsável está avaliando os itens e condições.',
        at: getAt('OWNER_OPENED'),
      },
      {
        key: 'QUOTE_SENT',
        title: 'Proposta enviada',
        desc: 'Uma versão da proposta foi enviada para você visualizar.',
        at: getAt('QUOTE_SENT'),
      },
      {
        key: 'QUOTE_OPENED',
        title: 'Proposta visualizada',
        desc: 'Registramos a abertura do link (protótipo).',
        at: getAt('QUOTE_OPENED'),
      },
      {
        key: 'QUOTE_REJECTED',
        title: 'Revisão solicitada',
        desc: 'Você solicitou revisão/ajuste na proposta.',
        at: getAt('QUOTE_REJECTED'),
      },
      {
        key: 'QUOTE_APPROVED',
        title: 'Aprovada',
        desc: 'A proposta foi aprovada e ficou travada.',
        at: getAt('QUOTE_APPROVED'),
      },
    ];
  }, [data]);

  const hasQuote = Boolean(data?.currentQuoteVersion);
  const statusLabel = useMemo(() => {
    const s = String(data?.status || '').toUpperCase();
    if (s === 'SUBMITTED') return 'Solicitação recebida';
    if (s === 'IN_REVIEW') return 'Em análise';
    if (s === 'QUOTE_SENT') return 'Proposta enviada';
    if (s === 'REVISION_REQUESTED') return 'Revisão solicitada';
    if (s === 'APPROVED') return 'Aprovada';
    if (s === 'RECEBIDA') return 'Solicitação recebida';
    return s ? s : '—';
  }, [data?.status]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Acompanhar proposta</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backToSent)}>
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
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Request ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Enviado em <span className="font-semibold">{formatDateTimeBr(data.createdAt)}</span>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Status</div>
                    <div className="mt-2 flex items-start gap-3">
                      <CircleDot className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{statusLabel}</div>
                        <div className="mt-0.5 text-xs text-gray-600">
                          {hasQuote ? 'Você já pode abrir a proposta e aprovar/solicitar revisão.' : 'Aguardando avaliação do responsável.'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Button
                        className="gap-2"
                        disabled={!hasQuote}
                        onClick={() => navigate(propostaUrl)}
                      >
                        <FileText className="h-4 w-4" />
                        Ver proposta
                      </Button>
                      {token ? (
                        <Button variant="outline" className="gap-2" onClick={() => navigate(ownerUrl)}>
                          <UserCog className="h-4 w-4" />
                          Sou o responsável
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900">Seus dados</div>
                    <div className="mt-2 text-sm text-gray-700">
                      <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{data.customerName}</span></div>
                      <div className="mt-1"><span className="text-gray-500">WhatsApp:</span> {data.customerPhone}</div>
                      <div className="mt-1"><span className="text-gray-500">E-mail:</span> {data.customerEmail}</div>
                      {data.customerCompanyName && (
                        <div className="mt-1"><span className="text-gray-500">Empresa:</span> {data.customerCompanyName}</div>
                      )}
                    </div>
                  </div>
                </div>

                {data.notes && (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Observações</div>
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</div>
                    </div>
                  </>
                )}

                <Separator className="my-5" />

                <div>
                  <div className="text-sm font-semibold text-gray-900">Linha do tempo</div>
                  <div className="mt-3 space-y-3">
                    {timeline.map((t) => {
                      const done = Boolean(t.at);
                      return (
                        <div key={t.key} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium text-gray-900">{t.title}</div>
                                <div className="text-xs text-gray-500">{done ? formatDateTimeBr(t.at) : '—'}</div>
                              </div>
                              <div className="mt-0.5 text-xs text-gray-600">{t.desc}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900">Itens solicitados</div>
                  <div className="mt-3 space-y-3">
                    {data.items.map((it) => (
                      <div key={it.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {it.snapshot?.pointName || 'Ponto'}
                          {it.snapshot?.unitLabel ? ` — ${it.snapshot.unitLabel}` : ''}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {it.snapshot?.city ? `${it.snapshot.city}` : ''}{it.snapshot?.state ? `/${it.snapshot.state}` : ''}
                          {it.snapshot?.addressLine ? ` • ${it.snapshot.addressLine}` : ''}
                        </div>
                        <div className="mt-2 text-xs text-gray-700">
                          Duração: <span className="font-semibold">{formatDurationParts(it.duration || daysToDurationParts(it.durationDays))}</span>
                        </div>
                      </div>
                    ))}
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
