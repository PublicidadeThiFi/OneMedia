import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, Mail, Phone, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { clearCart, formatDurationParts, readCart } from '../lib/menuCart';
import { createMenuRequest, fetchPublicMenuConfig } from '../lib/menuRequestApi';
import {
  buildMenuUrl,
  getMenuCatalogQueryParams,
  getMenuEntryUrl,
  isAgencyFlow,
} from '../lib/menuFlow';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { formatCpfCnpjDisplay, getCpfCnpjErrorMessage } from '../lib/validators';
import '../components/menu/catalog/menuCatalogTheme.css';

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

  const query = useMemo(() => getMenuCatalogQueryParams(), []);
  const { token, uf, city, flow, ownerCompanyId, source } = query;

  const cart = useMemo(() => readCart(), []);

  const backUrl = useMemo(() => buildMenuUrl('/menu/carrinho', query), [query]);
  const entryUrl = useMemo(() => getMenuEntryUrl(query), [query]);

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
      navigate(entryUrl);
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
      navigate(buildMenuUrl('/menu/enviado', query, { token: t, rid: requestId }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Não consegui enviar agora.';
      toast.error('Não foi possível enviar', { description: String(msg) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniquePoints = new Set(cart.items.map((item) => item.pointId)).size;
  const facesCount = cart.items.filter((item) => item.unitId).length;

  if (!cart.items.length) {
    return (
      <div className="menu-catalog-screen">
        <div className="menu-catalog-frame menu-cart-frame">
          <div className="menu-cart-topbar">
            <div className="menu-catalog-breadcrumb">
              <span>Cardápio</span>
              <ChevronRight className="h-4 w-4" />
              <strong>Checkout</strong>
              {isAgencyFlow(flow) ? <Badge className="menu-cart-pill">Agência</Badge> : null}
            </div>
            <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao carrinho
            </Button>
          </div>

          <Card className="menu-catalog-actions-card menu-cart-empty-card">
            <CardContent className="menu-cart-empty-content">
              <div className="menu-cart-empty-icon">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="menu-cart-empty-texts">
                <div className="menu-cart-empty-title">Seu checkout só aparece depois que o carrinho tiver pelo menos um ponto ou face.</div>
                <div className="menu-cart-empty-copy">
                  Volte para a vitrine, escolha os espaços desejados e depois retorne para preencher os dados de contato.
                </div>
              </div>
              <div className="menu-checkout-empty-actions">
                <Button className="menu-cart-primary-button" onClick={() => navigate(entryUrl)}>
                  {source === 'catalog' ? 'Voltar ao catálogo' : 'Ver pontos'}
                </Button>
                <Button variant="outline" className="menu-cart-secondary-button" onClick={() => navigate(backUrl)}>
                  Voltar ao carrinho
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-cart-frame">
        <div className="menu-cart-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Checkout</strong>
            {isAgencyFlow(flow) ? <Badge className="menu-cart-pill">Agência</Badge> : null}
          </div>
          <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao carrinho
          </Button>
        </div>

        <section className="menu-catalog-actions-card menu-cart-hero-card">
          <div className="menu-cart-hero-main">
            <div className="menu-cart-kicker">
              <Mail className="h-3.5 w-3.5" />
              Finalizar pedido de proposta
            </div>
            <h1 className="menu-cart-hero-title">Feche seu pedido no mesmo padrão visual do cardápio.</h1>
            <p className="menu-cart-hero-copy">
              Preencha os dados de contato, revise a seleção e envie tudo para o responsável montar a proposta do jeito certo.
            </p>
          </div>
          <div className="menu-cart-hero-summary">
            {[
              ['Itens', String(cart.items.length)],
              ['Pontos', String(uniquePoints)],
              ['Faces', String(facesCount)],
            ].map(([label, value]) => (
              <div key={label} className="menu-cart-stat-box">
                <span className="menu-cart-stat-value">{value}</span>
                <span className="menu-cart-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="menu-checkout-layout">
          <div className="menu-checkout-main-column">
            <Card className="menu-catalog-actions-card menu-checkout-form-card">
              <CardContent className="menu-checkout-form-content">
                <div className="menu-checkout-form-head">
                  <div>
                    <div className="menu-cart-panel-label">Dados de contato</div>
                    <h2 className="menu-cart-summary-title">Conte para o responsável como entrar em contato com você.</h2>
                    <p className="menu-cart-summary-copy">
                      Essas informações vão junto com o pedido para o retorno sair rápido e com a proposta mais alinhada.
                    </p>
                  </div>
                  <div className="menu-checkout-security-badge">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Envio protegido
                  </div>
                </div>

                <div className="menu-checkout-form-grid">
                  <label className="menu-checkout-field">
                    <Label className="menu-checkout-label">Seu nome *</Label>
                    <Input className="menu-checkout-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" />
                  </label>

                  <label className="menu-checkout-field">
                    <Label className="menu-checkout-label">WhatsApp *</Label>
                    <div className="menu-checkout-input-wrap">
                      <Phone className="menu-checkout-input-icon" />
                      <Input
                        className="menu-checkout-input menu-checkout-input-iconpad"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </label>

                  <label className="menu-checkout-field menu-checkout-field-wide">
                    <Label className="menu-checkout-label">E-mail *</Label>
                    <Input
                      className="menu-checkout-input"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                    />
                  </label>

                  <label className="menu-checkout-field">
                    <Label className="menu-checkout-label">Empresa (opcional)</Label>
                    <div className="menu-checkout-input-wrap">
                      <Building2 className="menu-checkout-input-icon" />
                      <Input
                        className="menu-checkout-input menu-checkout-input-iconpad"
                        value={customerCompanyName}
                        onChange={(e) => setCustomerCompanyName(e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </label>

                  <label className="menu-checkout-field">
                    <Label className="menu-checkout-label">CPF ou CNPJ</Label>
                    <Input
                      className="menu-checkout-input"
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
                    {customerDocError ? <div className="menu-checkout-error">{customerDocError}</div> : null}
                  </label>

                  <label className="menu-checkout-field menu-checkout-field-wide">
                    <Label className="menu-checkout-label">Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex.: datas desejadas, bairros preferidos, briefing da campanha…"
                      className="menu-checkout-textarea"
                    />
                  </label>

                  {captchaRequired ? (
                    <div className="menu-checkout-field menu-checkout-field-wide">
                      <Label className="menu-checkout-label">Confirmação</Label>
                      <div className="menu-checkout-captcha-box">
                        {turnstileSiteKey ? (
                          <TurnstileWidget siteKey={turnstileSiteKey} onToken={handleCaptchaToken} className="pt-1" />
                        ) : null}
                        {captchaLoadError ? (
                          <div className="menu-checkout-error">{captchaLoadError}</div>
                        ) : (
                          <div className="menu-checkout-helper">É rapidinho — só pra garantir que há uma pessoa de verdade no envio 🙂</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {reservationCutoffNotice ? (
                  <div className="menu-checkout-callout">
                    <span className="font-semibold">Início da vigência:</span> {reservationCutoffNotice}
                  </div>
                ) : null}

                <div className="menu-checkout-actions">
                  <Button variant="outline" className="menu-cart-secondary-button" onClick={() => navigate(backUrl)}>
                    Voltar pro carrinho
                  </Button>
                  <Button onClick={onSubmit} disabled={isSubmitting} className="menu-cart-primary-button">
                    <CheckCircle2 className="h-4 w-4" />
                    {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="menu-checkout-sidebar">
            <Card className="menu-catalog-actions-card menu-cart-summary-card menu-checkout-summary-card">
              <CardContent className="menu-cart-summary-content menu-checkout-summary-content">
                <div>
                  <div className="menu-cart-panel-label">Resumo da sua escolha</div>
                  <h2 className="menu-cart-summary-title">Tudo pronto para envio.</h2>
                  <p className="menu-cart-summary-copy">
                    Confira os itens selecionados antes de concluir o envio para o responsável.
                  </p>
                </div>

                <div className="menu-cart-summary-stats menu-checkout-summary-stats">
                  {[
                    ['Itens', String(cart.items.length)],
                    ['Pontos', String(uniquePoints)],
                    ['Faces', String(facesCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="menu-cart-summary-stat">
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="menu-checkout-summary-list">
                  {cart.items.map((it, idx) => (
                    <div key={it.id} className="menu-checkout-summary-item">
                      <div className="menu-checkout-summary-item-head">
                        <div className="menu-checkout-summary-item-title menu-copy-wrap">
                          {it.snapshot?.pointName || 'Ponto'}
                          {it.snapshot?.unitLabel ? ` — ${it.snapshot.unitLabel}` : ''}
                        </div>
                        <Badge variant="outline" className="menu-cart-soft-badge">
                          Item {idx + 1}
                        </Badge>
                      </div>
                      <div className="menu-checkout-summary-item-copy menu-copy-wrap">
                        {it.snapshot?.city ? `${it.snapshot.city}` : ''}
                        {it.snapshot?.state ? `/${it.snapshot.state}` : ''}
                        {it.snapshot?.addressLine ? ` • ${it.snapshot.addressLine}` : ''}
                      </div>
                      <div className="menu-checkout-summary-pill">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {formatDurationParts(it.duration)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="menu-cart-summary-checklist menu-checkout-summary-checklist">
                  <div className="menu-cart-section-title menu-cart-section-title-sm">
                    <Sparkles className="h-4 w-4" />
                    O que acontece depois
                  </div>
                  <ul>
                    <li>O responsável recebe seu pedido e analisa disponibilidade, período e composição.</li>
                    <li>Você recebe um link para acompanhar tudo em tempo real.</li>
                    <li>Quando a proposta estiver pronta, você pode aprovar ou pedir revisão.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
