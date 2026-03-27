import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Building2, CheckCircle2, Mail, Phone, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { clearCart, formatDurationParts, readCart } from '../lib/menuCart';
import { createMenuRequest, fetchPublicMenuConfig } from '../lib/menuRequestApi';
import { getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { formatCpfCnpjDisplay, getCpfCnpjErrorMessage } from '../lib/validators';

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
      } catch (e: any) {
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
        captchaToken: captchaRequired ? (captchaToken || undefined) : undefined,
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
      <div className="menu-app-shell">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
              Cardápio
            </Badge>
            {isAgencyFlow(flow) && (
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
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

          <Card className="menu-glass-card mt-5 overflow-hidden rounded-[32px]">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-slate-100 text-slate-700 shadow-sm">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Falta escolher os itens
                  </div>
                  <h1 className="menu-soft-title mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Seu checkout só aparece depois que o carrinho tiver pelo menos um ponto ou face.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Volte para a vitrine, selecione os espaços desejados e então retorne para preencher os dados de contato.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button className="rounded-2xl px-5" onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                      Ver pontos
                    </Button>
                    <Button variant="outline" className="rounded-2xl border-slate-200 bg-white px-5" onClick={() => navigate(backUrl)}>
                      Voltar ao carrinho
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const uniquePoints = new Set(cart.items.map((item) => item.pointId)).size;
  const facesCount = cart.items.filter((item) => item.unitId).length;

  return (
    <div className="menu-app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
            Cardápio
          </Badge>
          {isAgencyFlow(flow) && (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
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

        <div className="menu-glass-card mt-5 overflow-hidden rounded-[32px]">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                <Mail className="h-3.5 w-3.5" />
                Finalize o pedido de proposta
              </div>
              <h1 className="menu-soft-title mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Um checkout mais claro para enviar seu pedido com confiança.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Preencha seus dados de contato, confira o resumo do carrinho e envie tudo para o responsável. Assim que a proposta ficar pronta, você recebe o link para acompanhar e decidir.
              </p>
            </div>

            <Card className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo rápido</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ['Itens', String(cart.items.length)],
                    ['Pontos', String(uniquePoints)],
                    ['Faces', String(facesCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur">
                      <div className="text-xl font-semibold text-white">{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white/75">
                  Revise os dados e envie um pedido mais redondo para o responsável transformar em proposta.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card className="menu-glass-card rounded-[30px]">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Seus dados de contato</div>
                  <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Essas informações vão junto com o pedido para o responsável responder com a proposta certa.
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Envio protegido
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Seu nome *</Label>
                  <Input className="h-12 rounded-2xl border-slate-200 bg-white/90" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" />
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-12 rounded-2xl border-slate-200 bg-white/90 pl-11"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>E-mail *</Label>
                  <Input
                    className="h-12 rounded-2xl border-slate-200 bg-white/90"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Empresa (opcional)</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-12 rounded-2xl border-slate-200 bg-white/90 pl-11"
                      value={customerCompanyName}
                      onChange={(e) => setCustomerCompanyName(e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input
                    className="h-12 rounded-2xl border-slate-200 bg-white/90"
                    value={customerCnpj}
                    onChange={(e) => {
                      const next = formatCpfCnpjDisplay(e.target.value);
                      setCustomerCnpj(next);
                      setCustomerDocError(getCpfCnpjErrorMessage(next));
                    }}
                    onBlur={() => setCustomerDocError(getCpfCnpjErrorMessage(customerCnpj))}
                    placeholder="Digite CPF (11) ou CNPJ (14)"
                    aria-invalid={!!customerDocError}
                  />
                  {customerDocError ? (
                    <div className="text-xs text-red-600">{customerDocError}</div>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: datas desejadas, bairros preferidos, briefing da campanha…"
                    className="min-h-[130px] rounded-[24px] border-slate-200 bg-white/90"
                  />
                </div>

                {captchaRequired ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Confirmação</Label>
                    <div className="menu-muted-panel rounded-[24px] p-4">
                      {turnstileSiteKey ? (
                        <TurnstileWidget siteKey={turnstileSiteKey} onToken={handleCaptchaToken} className="pt-1" />
                      ) : null}
                      {captchaLoadError ? (
                        <div className="text-xs text-red-600">{captchaLoadError}</div>
                      ) : (
                        <div className="text-xs leading-6 text-slate-600">
                          É rapidinho — só pra garantir que há uma pessoa de verdade no envio 🙂
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {reservationCutoffNotice ? (
                <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50/90 px-4 py-4 text-sm leading-6 text-blue-950 shadow-sm">
                  <span className="font-semibold">Início da vigência:</span> {reservationCutoffNotice}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-5" onClick={() => navigate(backUrl)}>
                  Voltar pro carrinho
                </Button>
                <Button onClick={onSubmit} disabled={isSubmitting} className="h-12 gap-2 rounded-2xl px-5">
                  <CheckCircle2 className="h-4 w-4" />
                  {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="menu-glass-card rounded-[30px]">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Resumo da sua escolha</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    Conferência rápida dos itens selecionados antes de concluir o envio.
                  </div>
                </div>

                <div className="space-y-3">
                  {cart.items.map((it, idx) => (
                    <div key={it.id} className="menu-muted-panel rounded-[22px] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="menu-copy-wrap text-sm font-semibold text-slate-950">
                            {it.snapshot?.pointName || 'Ponto'}
                            {it.snapshot?.unitLabel ? ` — ${it.snapshot.unitLabel}` : ''}
                          </div>
                          <div className="menu-copy-wrap mt-1 text-xs leading-5 text-slate-600">
                            {it.snapshot?.city ? `${it.snapshot.city}` : ''}{it.snapshot?.state ? `/${it.snapshot.state}` : ''}
                            {it.snapshot?.addressLine ? ` • ${it.snapshot.addressLine}` : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-white px-3 text-slate-600 shadow-sm">
                          Item {idx + 1}
                        </Badge>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {formatDurationParts(it.duration)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/65 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    O que acontece depois
                  </div>
                  <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                    <div>• O responsável recebe seu pedido e analisa disponibilidade, período e composição.</div>
                    <div>• Você recebe um link para acompanhar tudo em tempo real.</div>
                    <div>• Quando a proposta estiver pronta, você pode aprovar ou pedir revisão.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
