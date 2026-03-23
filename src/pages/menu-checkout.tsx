import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Mail } from 'lucide-react';
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

  // Captcha config can come from:
  // - Vite env (build-time)
  // - Backend runtime config (so prod can change without rebuilding the frontend)
  const [captchaRequired, setCaptchaRequired] = useState<boolean>(!!String(ENV_TURNSTILE_SITE_KEY || '').trim());
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>(String(ENV_TURNSTILE_SITE_KEY || '').trim());
  const [captchaLoadError, setCaptchaLoadError] = useState<string | null>(null);

  // Keep the Turnstile callback stable; otherwise the widget can re-initialize on every re-render
  // (e.g. while typing), which looks like "piscando"/recarregando.
  const handleCaptchaToken = useCallback((t?: string | null) => {
    setCaptchaToken(String(t || ''));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const data = await fetchPublicMenuConfig();

        const enabled = !!data?.captcha?.enabled;
        const key = String(data?.captcha?.siteKey ?? '').trim();

        if (cancelled) return;

        // Backend decides if captcha is required.
        // If the backend says enabled but doesn't provide a site key,
        // we keep the env key (if any) and show an inline warning.
        setCaptchaRequired(enabled || !!turnstileSiteKey);

        if (!turnstileSiteKey && key) {
          setTurnstileSiteKey(key);
        }

        if ((enabled || !!turnstileSiteKey) && !String(key || turnstileSiteKey).trim()) {
          setCaptchaLoadError('Captcha habilitado, mas a chave do site não foi configurada.');
        } else {
          setCaptchaLoadError(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        // If config fails, we still can work with the env key.
        if (!String(turnstileSiteKey || '').trim()) {
          setCaptchaLoadError('Não consegui carregar a configuração do captcha.');
        }
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

    // Captcha (when enabled in backend config)
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
      <div className="min-h-screen w-full bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
            {isAgencyFlow(flow) && (
              <Badge variant="outline" className="rounded-full">Agência</Badge>
            )}
            <div className="text-sm text-gray-600">Finalizar</div>

            <div className="ml-auto">
              <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>

          <Card className="mt-5">
            <CardContent className="py-8">
              <div className="text-sm font-semibold text-gray-900">Seu carrinho está vazio</div>
              <div className="mt-1 text-sm text-gray-600">Volte para a lista de pontos e adicione itens.</div>
              <div className="mt-5">
                <Button onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                  Ver pontos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Finalizar</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">Finalizar e pedir proposta</h1>
          <p className="mt-1 text-sm text-gray-600">
            Preencha seus dados. A gente envia tudo para o responsável e você recebe um link pra acompanhar.
          </p>
        </div>

        <Card className="mt-5">
          <CardContent className="py-5">
            <div className="text-sm font-semibold text-gray-900">O que você escolheu</div>
            <div className="mt-2 space-y-2">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {it.snapshot?.pointName || 'Ponto'}
                      {it.snapshot?.unitLabel ? ` — ${it.snapshot.unitLabel}` : ''}
                    </div>
                    <div className="text-xs text-gray-600">
                      {it.snapshot?.city ? `${it.snapshot.city}` : ''}{it.snapshot?.state ? `/${it.snapshot.state}` : ''}
                      {it.snapshot?.addressLine ? ` • ${it.snapshot.addressLine}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-700">
                    <span className="font-semibold">{formatDurationParts(it.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="py-5">
            <div className="text-sm font-semibold text-gray-900">Seus dados (pra contato)</div>
            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seu nome *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail *</Label>
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Empresa (opcional)</Label>
                <Input
                  value={customerCompanyName}
                  onChange={(e) => setCustomerCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>Digite CPF (11) ou CNPJ (14)</Label>
                <Input
                  value={customerCnpj}
                  onChange={(e) => {
                    const next = formatCpfCnpjDisplay(e.target.value);
                    setCustomerCnpj(next);
                    setCustomerDocError(getCpfCnpjErrorMessage(next));
                  }}
                  onBlur={() => setCustomerDocError(getCpfCnpjErrorMessage(customerCnpj))}
                  placeholder="CPF ou Digite CPF (11) ou CNPJ (14)"
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
                  className="min-h-[110px]"
                />
              </div>

              {captchaRequired ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Confirmação</Label>
                  {turnstileSiteKey ? (
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onToken={handleCaptchaToken}
                      className="pt-1"
                    />
                  ) : null}
                  {captchaLoadError ? (
                    <div className="text-xs text-red-600">{captchaLoadError}</div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      É rapidinho — só pra garantir que é uma pessoa de verdade 🙂
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => navigate(backUrl)}>
                Voltar pro carrinho
              </Button>
              <Button onClick={onSubmit} disabled={isSubmitting} className="gap-2">
                <Mail className="h-4 w-4" />
                {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
