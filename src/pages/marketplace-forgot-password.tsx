import { useEffect, useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { useNavigation } from '../contexts/NavigationContext';
import { forgotMarketplacePassword } from '../lib/marketplaceAccountApi';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import { readMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';

export default function MarketplaceForgotPasswordPage() {
  const navigate = useNavigation();
  const returnUrl = readMarketplaceReturnUrl('/marketplace/solicitacoes');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSiteKey, setCaptchaSiteKey] = useState(String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || ''));
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    publicApiClient.get('/public/menu/config', { signal: controller.signal }).then((response) => {
      const data = response.data as any;
      const key = data?.captcha?.siteKey || data?.turnstile?.siteKey || data?.captchaSiteKey;
      if (typeof key === 'string' && key.trim()) setCaptchaSiteKey(key.trim());
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (captchaSiteKey && !captchaToken) return void toast.error('Valide o captcha para continuar.');
    try {
      setSubmitting(true);
      const response = await forgotMarketplacePassword({
        email: email.trim().toLowerCase(),
        captchaToken: captchaSiteKey ? captchaToken : undefined,
        returnUrl,
      });
      setSent(true);
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível solicitar a redefinição.').message);
      setCaptchaToken('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketplaceShell pageTitle="Recuperar senha" hideFooter>
      <section className="marketplace-auth-page">
        <div className="marketplace-auth-card">
          <div className="marketplace-auth-card__intro">
            <span>Segurança da conta</span>
            <h1>Recupere sua senha</h1>
            <p>Informe o e-mail da sua conta de anunciante. O link enviado será válido por tempo limitado.</p>
          </div>
          {sent ? (
            <div className="marketplace-auth-feedback">
              <Mail aria-hidden="true" />
              <h2>Confira seu e-mail</h2>
              <p>Se a conta existir, você receberá as instruções para criar uma nova senha.</p>
              <button className="marketplace-button marketplace-button--primary" type="button" onClick={() => navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`)}>Voltar para o login</button>
            </div>
          ) : (
            <form className="marketplace-auth-form" onSubmit={submit}>
              <label><span>E-mail</span><div className="marketplace-auth-input"><Mail aria-hidden="true" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></label>
              {captchaSiteKey ? <TurnstileWidget siteKey={captchaSiteKey} onToken={setCaptchaToken} /> : null}
              <button className="marketplace-button marketplace-button--primary marketplace-auth-form__submit" type="submit" disabled={submitting || (captchaSiteKey ? !captchaToken : false)}>{submitting ? 'Enviando…' : 'Enviar link de redefinição'}</button>
            </form>
          )}
          <p className="marketplace-auth-card__switch"><button type="button" onClick={() => navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`)}>Voltar para o login</button></p>
        </div>
      </section>
    </MarketplaceShell>
  );
}
