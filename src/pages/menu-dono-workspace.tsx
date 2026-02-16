import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Loader2, Send, FileText, History, Lock, ExternalLink, RotateCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMenuRequest,
  regenerateMenuLink,
  sendMenuQuote,
  type MenuQuoteDraft,
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

type ServiceOption = { name: string; defaultValue: number };

const MOCK_SERVICES: ServiceOption[] = [
  { name: 'Impressão (material)', defaultValue: 1200 },
  { name: 'Instalação (mão de obra)', defaultValue: 600 },
  { name: 'Criação/Arte', defaultValue: 800 },
  { name: 'Logística', defaultValue: 350 },
];

function computeBase(items: any[]): number {
  let sum = 0;
  for (const it of items || []) {
    const d = (() => {
    const dd = Number(it?.durationDays);
    if (Number.isFinite(dd) && dd > 0) return Math.max(1, Math.floor(dd));

    const dur = it?.duration || {};
    const years = Math.max(0, Math.floor(Number(dur?.years) || 0));
    const months = Math.max(0, Math.floor(Number(dur?.months) || 0));
    const days = Math.max(0, Math.floor(Number(dur?.days) || 0));

    const total = years * 365 + months * 30 + days;
    return Math.max(1, Math.floor(Number.isFinite(total) && total > 0 ? total : 30));
  })();
    const week = Number(it?.snapshot?.priceWeek || 0);
    const month = Number(it?.snapshot?.priceMonth || 0);

    let base = 0;
    if (d <= 7 && week > 0) base = week;
    else if (month > 0) base = month * Math.max(1, d / 30);
    else if (week > 0) base = week * Math.max(1, d / 7);
    sum += base;
  }
  return Number(sum.toFixed(2));
}

function computePreviewTotals(record: MenuRequestRecord | null, draft: MenuQuoteDraft) {
  const base = computeBase(record?.items || []);
  const services = Number(
    (
      (draft.services || []).reduce((acc, s) => acc + Number(s.value || 0), 0) +
      Number(draft.manualServiceValue || 0)
    ).toFixed(2),
  );
  const subtotal = base + services;
  const pct = Math.max(0, Number(draft.discountPercent || 0));
  const fixed = Math.max(0, Number(draft.discountFixed || 0));
  const discount = Number(Math.min(subtotal, subtotal * (pct / 100) + fixed).toFixed(2));
  const total = Number(Math.max(0, subtotal - discount).toFixed(2));
  return { base, services, discount, total };
}

export default function MenuDonoWorkspace() {
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
  const [isSending, setIsSending] = useState(false);
  const [isRegeneratingClient, setIsRegeneratingClient] = useState(false);

  const [draft, setDraft] = useState<MenuQuoteDraft>({
    message: '',
    services: [],
    manualServiceValue: null,
    discountPercent: null,
    discountFixed: null,
  });

  const [servicePick, setServicePick] = useState<string>(MOCK_SERVICES[0]?.name || '');
  const [serviceValue, setServiceValue] = useState<number>(MOCK_SERVICES[0]?.defaultValue || 0);

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const clientToken = data?.links?.client?.token || '';
  const ownerToken = data?.links?.owner?.token || '';
  const backUrl = useMemo(() => {
    if (clientToken) return `/menu/acompanhar?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientToken)}`;
    return `/menu/acompanhar${buildQuery(authQuery)}`;
  }, [clientToken, rid, authQuery]);

  const propostaUrl = useMemo(() => {
    if (clientToken) return `/menu/proposta?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientToken)}`;
    return `/menu/proposta${buildQuery(authQuery)}`;
  }, [clientToken, rid, authQuery]);
  const o4Url = useMemo(() => `/menu/dono/enviada${buildQuery(authQuery)}`, [authQuery]);
  const o5Url = useMemo(() => `/menu/dono/revisao${buildQuery(authQuery)}`, [authQuery]);
  const o6Url = useMemo(() => `/menu/dono/aprovada${buildQuery(authQuery)}`, [authQuery]);

  const ownerWorkspaceLink = useMemo(() => {
    if (ownerToken) return `/menu/dono?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(ownerToken)}`;
    return `/menu/dono${buildQuery(authQuery)}`;
  }, [ownerToken, rid, authQuery]);

  const currentQuote: MenuQuoteVersionRecord | null = useMemo(() => {
    const quotes = Array.isArray(data?.quotes) ? data!.quotes! : [];
    const v = data?.currentQuoteVersion;
    if (!v) return null;
    return quotes.find((q) => q.version === v) || null;
  }, [data]);

  const status = String(data?.status || '').toUpperCase();
  const isLocked = status === 'APPROVED';

  const previewTotals = useMemo(() => computePreviewTotals(data, draft), [data, draft]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
        if (!alive) return;
        setData(res);

        // Prefill draft with last sent version (optional quality-of-life)
        const quotes = Array.isArray(res?.quotes) ? res!.quotes! : [];
        const v = res?.currentQuoteVersion;
        const last = v ? quotes.find((q) => q.version === v) : null;
        if (last?.draft) {
          setDraft({
            message: last.draft.message || '',
            services: Array.isArray(last.draft.services) ? last.draft.services : [],
            manualServiceValue: last.draft.manualServiceValue ?? null,
            discountPercent: last.draft.discountPercent ?? null,
            discountFixed: last.draft.discountFixed ?? null,
          });
        }
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

  const refresh = async () => {
    const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
    setData(res);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const full = (path: string) => `${origin}${path}`;

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
      setIsRegeneratingClient(true);
      await regenerateMenuLink({ requestId: rid, aud: 'client', token, t });
      await refresh();
      toast.success('Link do cliente regenerado', { description: 'O link anterior foi invalidado.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao regenerar.';
      toast.error('Não foi possível regenerar', { description: String(msg) });
    } finally {
      setIsRegeneratingClient(false);
    }
  };

  const onPickService = (name: string) => {
    setServicePick(name);
    const opt = MOCK_SERVICES.find((s) => s.name === name);
    if (opt) setServiceValue(opt.defaultValue);
  };

  const addServiceLine = () => {
    const name = String(servicePick || '').trim();
    const value = Number(serviceValue || 0);
    if (!name || !Number.isFinite(value) || value <= 0) return;

    const line: MenuQuoteServiceLine = { name, value };
    setDraft((d) => ({
      ...d,
      services: [...(d.services || []), line],
    }));
  };

  const removeServiceLine = (idx: number) => {
    setDraft((d) => ({
      ...d,
      services: (d.services || []).filter((_, i) => i !== idx),
    }));
  };

  const onSend = async () => {
    try {
      if (isLocked) return;
      setIsSending(true);
      await sendMenuQuote({ requestId: rid, token, t, draft });
      toast.success('Proposta enviada', { description: 'Versão criada e vinculada ao request (protótipo).' });
      navigate(o4Url);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar.';
      toast.error('Não foi possível enviar', { description: String(msg) });
    } finally {
      setIsSending(false);
    }
  };

  const goByStatus = () => {
    if (status === 'APPROVED') return navigate(o6Url);
    if (status === 'REVISION_REQUESTED') return navigate(o5Url);
    if (status === 'QUOTE_SENT') return navigate(o4Url);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Workspace do responsável</div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Acompanhar
            </Button>
            <Button variant="outline" className="gap-2" onClick={goByStatus}>
              <FileText className="h-4 w-4" />
              Estado atual
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
                    Atualizado em <span className="font-semibold">{formatDateTimeBr(data.updatedAt || data.createdAt)}</span>
                  </div>
                </div>

                {data.links && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-500">Link do cliente (assinado)</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={onRegenerateClient}
                          disabled={isRegeneratingClient}
                        >
                          {isRegeneratingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                          Regenerar
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links?.client?.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links?.client?.expiresAt)}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(backUrl))}>
                          <Copy className="h-4 w-4" />
                          Copiar acompanhamento
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(propostaUrl))}>
                          <Copy className="h-4 w-4" />
                          Copiar proposta
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 break-all">{full(propostaUrl)}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">Link do dono (workspace)</div>

                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links?.owner?.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links?.owner?.expiresAt)}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(ownerWorkspaceLink))}>
                          <Copy className="h-4 w-4" />
                          Copiar link
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 break-all">{full(ownerWorkspaceLink)}</div>
                    </div>
                  </div>
                )}

                {isLocked && (
                  <div className="mt-4 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-sm text-white">
                    <div className="flex items-center gap-2 font-semibold">
                      <Lock className="h-4 w-4" />
                      Proposta aprovada (travada)
                    </div>
                    <div className="mt-1 text-xs text-gray-200">Você não pode gerar novas versões após aprovação.</div>
                  </div>
                )}

                {status === 'REVISION_REQUESTED' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="font-semibold">Revisão solicitada pelo cliente</div>
                    <div className="mt-1 text-xs text-amber-800">Abra a tela de revisão para ver a mensagem do cliente.</div>
                    <div className="mt-3">
                      <Button variant="outline" onClick={() => navigate(o5Url)}>Ver revisão</Button>
                    </div>
                  </div>
                )}

                <Separator className="my-5" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Resumo do cliente</div>
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                      <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{data.customerName}</span></div>
                      <div className="mt-1"><span className="text-gray-500">WhatsApp:</span> {data.customerPhone}</div>
                      <div className="mt-1"><span className="text-gray-500">E-mail:</span> {data.customerEmail}</div>
                      {data.customerCompanyName && (
                        <div className="mt-1"><span className="text-gray-500">Empresa:</span> {data.customerCompanyName}</div>
                      )}
                      {data.notes && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500">Observações</div>
                          <div className="mt-1 whitespace-pre-wrap">{data.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 text-sm font-semibold text-gray-900">Histórico de versões</div>
                    <div className="mt-3 space-y-2">
                      {(Array.isArray(data.quotes) ? data.quotes : []).length === 0 ? (
                        <div className="text-sm text-gray-600">Nenhuma versão enviada ainda.</div>
                      ) : (
                        (data.quotes || []).slice().reverse().map((q) => (
                          <div key={q.version} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">v{q.version}</div>
                              <div className="text-xs text-gray-600">{formatDateTimeBr(q.createdAt)}</div>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <div className="text-xs text-gray-600">Status: <span className="font-semibold">{q.status}</span></div>
                              <div className="text-sm font-bold text-gray-900">{formatMoneyBr(q.totals.total)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">Documento editável (mock)</div>
                      <Button variant="outline" className="gap-2" onClick={() => navigate(propostaUrl)}>
                        <ExternalLink className="h-4 w-4" />
                        Ver como cliente
                      </Button>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="text-xs text-gray-500">Mensagem (opcional)</div>
                      <div className="mt-2">
                        <Textarea
                          value={String(draft.message ?? '')}
                          onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                          placeholder="Explique condições, prazos, observações…"
                          disabled={isLocked}
                        />
                      </div>

                      <Separator className="my-4" />

                      <div className="text-sm font-semibold text-gray-900">Serviços</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                          value={servicePick}
                          onChange={(e) => onPickService(e.target.value)}
                          disabled={isLocked}
                        >
                          {MOCK_SERVICES.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          value={Number.isFinite(Number(serviceValue)) ? String(serviceValue) : ''}
                          onChange={(e) => setServiceValue(Number(e.target.value || 0))}
                          placeholder="Valor"
                          disabled={isLocked}
                        />
                        <Button variant="outline" onClick={addServiceLine} disabled={isLocked}>Adicionar</Button>
                      </div>

                      {(draft.services || []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {(draft.services || []).map((s, idx) => (
                            <div key={`${s.name}-${idx}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                              <div className="text-sm text-gray-900">{s.name}</div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(s.value)}</div>
                                <Button variant="ghost" size="sm" onClick={() => removeServiceLine(idx)} disabled={isLocked}>Remover</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500">Serviço manual (R$)</div>
                          <Input
                            type="number"
                            value={draft.manualServiceValue == null ? '' : String(draft.manualServiceValue)}
                            onChange={(e) => setDraft((d) => ({ ...d, manualServiceValue: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </div>
                        <div />
                      </div>

                      <Separator className="my-4" />

                      <div className="text-sm font-semibold text-gray-900">Descontos</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500">% (sobre subtotal)</div>
                          <Input
                            type="number"
                            value={draft.discountPercent == null ? '' : String(draft.discountPercent)}
                            onChange={(e) => setDraft((d) => ({ ...d, discountPercent: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">R$ fixo</div>
                          <Input
                            type="number"
                            value={draft.discountFixed == null ? '' : String(draft.discountFixed)}
                            onChange={(e) => setDraft((d) => ({ ...d, discountFixed: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="text-sm font-semibold text-gray-900">Resumo (preview)</div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Base</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(previewTotals.base)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Serviços</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(previewTotals.services)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Desconto</div>
                          <div className="text-sm font-semibold text-gray-900">- {formatMoneyBr(previewTotals.discount)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-900 bg-gray-900 px-3 py-2">
                          <div className="text-xs text-gray-300">Total</div>
                          <div className="text-sm font-semibold text-white">{formatMoneyBr(previewTotals.total)}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button className="w-full gap-2" onClick={onSend} disabled={isLocked || isSending}>
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Enviar proposta (gera nova versão)
                        </Button>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                          <History className="h-3.5 w-3.5" />
                          Ao reenviar, criamos v1/v2/v3… sem perder histórico.
                        </div>
                      </div>
                    </div>
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
