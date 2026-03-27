import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Building2, CalendarDays, Mail, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { clearCart, formatDurationParts, readCart } from '../lib/menuCart';
import { createMenuRequest, fetchPublicMenuConfig } from '../lib/menuRequestApi';
import { getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { formatCpfCnpjDisplay, getCpfCnpjErrorMessage } from '../lib/validators';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { formatBRL } from '../lib/format';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function isValidEmail(email: string): boolean {
  const e = String(email || '').trim();
  return /.+@.+\..+/.test(e);
}

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D+/g, '');
}

function formatCurrencyBRL(value?: number | null): string {
  return formatBRL(value, '—');
}

const ENV_TURNSTILE_SITE_KEY = ((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

function buildReservationCutoffNotice(cutoffTime?: string | null, fallbackNotice?: string | null) {
  const normalized = String(cutoffTime || '').trim();
  if (normalized) {
    return `Check-ins realizados até ${normalized} contam no mesmo dia. Após esse horário, a vigência começa no dia seguinte.`;
  }
  return String(fallbackNotice || '').trim() || '';
}

export default function MenuFinalizar() {
  const navigate = useNavigation();

  const { token, uf, city, flow, ownerCompanyId } = useMemo(() => {
    const qp = getMenuQueryParams();
    return {
      token: qp.token,
      uf: qp.uf || '',
      city: qp.city || '',
      flow: qp.flow,
      ownerCompanyId: qp.ownerCompanyId,
    };
  }, []);

  const cart = useMemo(() => readCart(), []);
  const isAgency = isAgencyFlow(flow);

  const backUrl = useMemo(() => {
    return `/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`;
  }, [token, uf, city, flow, ownerCompanyId]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompanyName, setCustomerCompanyName] = useState('');
  const [customerCnpj, setCustomerCnpj] = useState('');
  const [customerDocError, setCustomerDocError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  const [captchaRequired, setCaptchaRequired] = useState<boolean>(!!String(ENV_TURNSTILE_SITE_KEY || '').trim());
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>(String(ENV_TURNSTILE_SITE_KEY || '').trim());
  const [captchaLoadError, setCaptchaLoadError] = useState<string | null>(null);
  const [reservationCutoffNotice, setReservationCutoffNotice] = useState<string>('');

  const handleCaptchaToken = useCallback((t?: string | null) => {
    setCaptchaToken(String(t || ''));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const data = await fetchPublicMenuConfig(token);

        const enabled = !!data?.captcha?.enabled;
        const key = String(data?.captcha?.siteKey ?? '').trim();

        if (cancelled) return;

        setCaptchaRequired(enabled || !!turnstileSiteKey);

        if (!turnstileSiteKey && key) {
          setTurnstileSiteKey(key);
        }

        setReservationCutoffNotice(buildReservationCutoffNotice(data?.reservationStartCutoffTime, data?.reservationStartCutoffNotice));

        if ((enabled || !!turnstileSiteKey) && !String(key || turnstileSiteKey).trim()) {
          setCaptchaLoadError('Captcha habilitado, mas a chave do site não foi configurada.');
        } else {
          setCaptchaLoadError(null);
        }
      } catch {
        if (cancelled) return;
        if (!String(turnstileSiteKey || '').trim()) {
          setCaptchaLoadError('Não consegui carregar a configuração do captcha.');
        }
        setReservationCutoffNotice('');
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryItems = useMemo(
    () =>
      cart.items.map((it) => ({
        id: it.id,
        pointName: it.snapshot?.pointName || 'Ponto',
        unitLabel: it.snapshot?.unitLabel || '',
        address: [it.snapshot?.city ? `${it.snapshot.city}${it.snapshot?.state ? `/${it.snapshot.state}` : ''}` : '', it.snapshot?.addressLine || '']
          .filter(Boolean)
          .join(' • '),
        imageUrl: it.snapshot?.imageUrl || '',
        durationText: formatDurationParts(it.duration),
        priceMonth: it.snapshot?.priceMonth ?? null,
        priceWeek: it.snapshot?.priceWeek ?? null,
      })),
    [cart.items],
  );

  const totals = useMemo(
    () =>
      summaryItems.reduce(
        (acc, item) => {
          acc.month += Number(item.priceMonth) || 0;
          acc.week += Number(item.priceWeek) || 0;
          return acc;
        },
        { month: 0, week: 0 },
      ),
    [summaryItems],
  );

  const pointsCount = useMemo(() => new Set(cart.items.map((item) => item.pointId)).size, [cart.items]);
  const facesCount = useMemo(() => cart.items.filter((item) => !!item.unitId).length, [cart.items]);

  const onSubmit = async () => {
    const name = String(customerName || '').trim();
    const email = String(customerEmail || '').trim();
    const phoneDigits = normalizePhone(customerPhone);
    const t = String(token || '').trim();

    if (!t) {
      toast.error('Não consegui validar seu acesso. Abra o cardápio pelo link que você recebeu.');
      return;
    }
    if (!cart.items.length) {
      toast.error('Seu carrinho está vazio.');
      navigate(`/menu/pontos${buildQuery({ token: t, uf, city, flow, ownerCompanyId })}`);
      return;
    }
    if (!name) {
      toast.error('Digite seu nome para continuar.');
      return;
    }
    if (!phoneDigits || phoneDigits.length < 10) {
      toast.error('Digite um WhatsApp/telefone válido (com DDD).');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Digite um e-mail válido.');
      return;
    }

    const docErr = getCpfCnpjErrorMessage(customerCnpj);
    if (docErr) {
      setCustomerDocError(docErr);
      toast.error(docErr);
      return;
    }

    if (captchaRequired) {
      if (!String(turnstileSiteKey || '').trim()) {
        toast.error('Captcha habilitado, mas não está configurado.');
        return;
      }
      if (!String(captchaToken || '').trim()) {
        toast.error('Só falta confirmar o captcha para continuar.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createMenuRequest({
        token: t,
        customerName: name,
        customerEmail: email,
        customerPhone: customerPhone,
        customerCompanyName: customerCompanyName || undefined,
        customerCnpj: customerCnpj || undefined,
        notes: notes || undefined,
        items: cart.items,
        uf: uf || undefined,
        city: city || undefined,
        flow,
        ownerCompanyId: ownerCompanyId || undefined,
        captchaToken: captchaRequired ? captchaToken || undefined : undefined,
      });

      const requestId = String(res?.requestId || '').trim();
      if (!requestId) {
        throw new Error('Resposta inválida: requestId ausente.');
      }

      clearCart();
      toast.success('Pronto! Pedido enviado.');
      navigate(`/menu/enviado${buildQuery({ token: t, rid: requestId, uf, city, flow, ownerCompanyId })}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Não consegui enviar agora.';
      toast.error('Não foi possível enviar', { description: String(msg) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart.items.length) {
    return (
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_28%,#f8fafc_60%,#f8fafc_100%)]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
              Cardápio
            </Badge>
            {isAgency && (
              <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-3 text-indigo-700">
                Agência
              </Badge>
            )}
            <div className="text-sm text-slate-600">Checkout</div>
            <div className="ml-auto">
              <Button variant="ghost" className="gap-2 rounded-2xl text-slate-700" onClick={() => navigate(backUrl)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>

          <Card className="mt-6 overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_22px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-8 sm:p-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                  <Mail className="h-3.5 w-3.5" />
                  Falta só escolher os itens
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Seu carrinho ainda está vazio.</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Volte para a vitrine de pontos e adicione pelo menos uma mídia para montar o pedido antes de finalizar.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button className="h-11 rounded-2xl px-5" onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                    Ver pontos
                  </Button>
                  <Button variant="outline" className="h-11 rounded-2xl px-5" onClick={() => navigate(backUrl)}>
                    Voltar ao carrinho
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_28%,#f8fafc_60%,#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
            Cardápio
          </Badge>
          {isAgency && (
            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-3 text-indigo-700">
              Agência
            </Badge>
          )}
          <div className="text-sm text-slate-600">Checkout</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-2xl text-slate-700" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_22px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                <Mail className="h-3.5 w-3.5" />
                Finalizar e pedir proposta
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Um checkout mais claro para enviar o pedido com segurança e boa apresentação.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Preencha seus dados, revise o pacote selecionado e envie tudo para o responsável. Depois disso,
                você recebe um link para acompanhar a proposta do começo ao fim.
              </p>

              <Card className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Seus dados para contato</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Use um WhatsApp e um e-mail que você acompanhe. Eles ajudam no retorno e na aprovação.
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Resposta organizada e rastreável
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Seu nome *</Label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Seu nome"
                          className="h-11 rounded-2xl border-slate-200 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>WhatsApp *</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="h-11 rounded-2xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>E-mail *</Label>
                      <Input
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="h-11 rounded-2xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Empresa (opcional)</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={customerCompanyName}
                          onChange={(e) => setCustomerCompanyName(e.target.value)}
                          placeholder="Nome da empresa"
                          className="h-11 rounded-2xl border-slate-200 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>CPF ou CNPJ</Label>
                      <Input
                        value={customerCnpj}
                        onChange={(e) => {
                          const next = formatCpfCnpjDisplay(e.target.value);
                          setCustomerCnpj(next);
                          setCustomerDocError(getCpfCnpjErrorMessage(next));
                        }}
                        onBlur={() => setCustomerDocError(getCpfCnpjErrorMessage(customerCnpj))}
                        placeholder="CPF ou CNPJ"
                        aria-invalid={!!customerDocError}
                        className="h-11 rounded-2xl border-slate-200"
                      />
                      {customerDocError ? <div className="text-xs text-red-600">{customerDocError}</div> : null}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Observações (opcional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex.: datas desejadas, bairros preferidos, briefing da campanha…"
                        className="min-h-[130px] rounded-[24px] border-slate-200"
                      />
                    </div>
                  </div>

                  {captchaRequired ? (
                    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-950">Confirmação</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">
                            É rapidinho — só para garantir que o pedido foi feito por uma pessoa de verdade.
                          </div>
                          {turnstileSiteKey ? (
                            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                              <TurnstileWidget siteKey={turnstileSiteKey} onToken={handleCaptchaToken} className="pt-1" />
                            </div>
                          ) : null}
                          {captchaLoadError ? <div className="mt-2 text-xs text-red-600">{captchaLoadError}</div> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {reservationCutoffNotice ? (
                    <div className="mt-4 rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <span className="font-semibold">Início da vigência:</span> {reservationCutoffNotice}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="h-11 rounded-2xl px-5" onClick={() => navigate(backUrl)}>
                      Voltar pro carrinho
                    </Button>
                    <Button onClick={onSubmit} disabled={isSubmitting} className="h-11 gap-2 rounded-2xl px-5">
                      <Mail className="h-4 w-4" />
                      {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <Card className="rounded-[28px] border border-slate-900/0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
                <CardContent className="p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo rápido</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      ['Itens', String(cart.items.length)],
                      ['Pontos', String(pointsCount)],
                      ['Faces', String(facesCount)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur">
                        <div className="text-xl font-semibold text-white">{value}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {summaryItems.map((item) => (
                      <div key={item.id} className="rounded-[22px] border border-white/10 bg-white/10 p-3 backdrop-blur">
                        <div className="flex items-start gap-3">
                          <div className="h-20 w-20 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
                            <ImageWithFallback src={item.imageUrl} alt={item.pointName} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white">{item.pointName}</div>
                            {item.unitLabel ? <div className="mt-1 text-xs text-white/70">{item.unitLabel}</div> : null}
                            {item.address ? (
                              <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-white/65">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{item.address}</span>
                              </div>
                            ) : null}
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {item.durationText}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
                            <div className="text-white/60">Mensal</div>
                            <div className="mt-1 text-sm font-semibold text-white">{formatCurrencyBRL(item.priceMonth)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
                            <div className="text-white/60">Bi-semana</div>
                            <div className="mt-1 text-sm font-semibold text-white">{formatCurrencyBRL(item.priceWeek)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/70">Total mensal de referência</span>
                      <span className="font-semibold text-white">{formatCurrencyBRL(totals.month || null)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/70">Total bi-semana</span>
                      <span className="font-semibold text-white">{formatCurrencyBRL(totals.week || null)}</span>
                    </div>
                  </div>

                  <Button onClick={onSubmit} disabled={isSubmitting} className="mt-5 h-11 w-full gap-2 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
                    <Mail className="h-4 w-4" />
                    {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-slate-200/80 bg-white/90 shadow-none">
                <CardContent className="p-5">
                  <div className="text-sm font-semibold text-slate-950">O que acontece depois</div>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      1. O responsável recebe o pedido com seus itens e observações.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      2. Você recebe um link para acompanhar a proposta e pedir revisão, se precisar.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      3. Quando a proposta estiver pronta, a aprovação acontece pelo mesmo fluxo.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
