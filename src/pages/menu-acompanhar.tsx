import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Loader2, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
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

  const { token, rid } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
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
        const res = await fetchMenuRequest({ requestId: rid, token });
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
  }, [rid, token]);

  const backToSent = useMemo(() => {
    return `/menu/enviado${buildQuery({ token, rid })}`;
  }, [token, rid]);

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
                        <div className="text-sm font-medium text-gray-900">Solicitação recebida</div>
                        <div className="mt-0.5 text-xs text-gray-600">Aguardando avaliação do responsável.</div>
                      </div>
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
                          Duração: <span className="font-semibold">{it.durationDays}</span> dia(s)
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
