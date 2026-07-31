import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { useNavigation } from '../contexts/NavigationContext';
import { resendMarketplaceVerification, signupMarketplaceAccount } from '../lib/marketplaceAccountApi';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';
import { getPasswordErrorMessage } from '../lib/validators';
import { readMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';
import { appendInternalReturnUrl, currentInternalUrl } from '../lib/internalReturnUrl';

export default function MarketplaceSignupPage() {
  const navigate = useNavigation();
  const returnUrl = readMarketplaceReturnUrl('/marketplace/solicitacoes');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmation: '', acceptTerms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSiteKey, setCaptchaSiteKey] = useState(String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || ''));
  const [submitting, setSubmitting] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    publicApiClient.get('/public/menu/config', { signal: controller.signal })
      .then((response) => {
        const data = response.data as any;
        const key = data?.captcha?.siteKey || data?.turnstile?.siteKey || data?.captchaSiteKey;
        if (typeof key === 'string' && key.trim()) setCaptchaSiteKey(key.trim());
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const passwordError = getPasswordErrorMessage(form.password);
    if (passwordError) return void toast.error(passwordError);
    if (form.password !== form.confirmation) return void toast.error('As senhas não conferem.');
    if (!form.acceptTerms) return void toast.error('Aceite os termos e a política de privacidade.');
    if (captchaSiteKey && !captchaToken) return void toast.error('Valide o captcha para continuar.');

    try {
      setSubmitting(true);
      const result = await signupMarketplaceAccount({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        passwordConfirmation: form.confirmation,
        acceptTerms: true,
        termsVersion: 'marketplace-v1',
        captchaToken: captchaSiteKey ? captchaToken : undefined,
        returnUrl,
      });
      setCreatedEmail(result.account.email);
      setCaptchaToken('');
      toast.success(result.message);
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível criar sua conta.').message);
      setCaptchaToken('');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!createdEmail || resending) return;
    if (captchaSiteKey && !captchaToken) {
      toast.error('Valide o captcha para reenviar.');
      return;
    }
    try {
      setResending(true);
      const result = await resendMarketplaceVerification({
        email: createdEmail,
        returnUrl,
        captchaToken: captchaSiteKey ? captchaToken : undefined,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível reenviar o e-mail.').message);
      setCaptchaToken('');
    } finally {
      setResending(false);
    }
  };

  if (createdEmail) {
    return (
      <MarketplaceShell pageTitle="Confirme seu e-mail" hideFooter>
        <section className="marketplace-auth-page">
          <div className="marketplace-auth-card marketplace-auth-card--success">
            <CheckCircle2 aria-hidden="true" />
            <span>Cadastro realizado</span>
            <h1>Confira sua caixa de entrada</h1>
            <p>Enviamos um link de confirmação para <strong>{createdEmail}</strong>. Depois de confirmar, você poderá entrar e concluir sua solicitação.</p>
            <button className="marketplace-button marketplace-button--primary" type="button" onClick={() => navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`)}>Ir para o login</button>
            {captchaSiteKey ? <TurnstileWidget siteKey={captchaSiteKey} onToken={setCaptchaToken} /> : null}
            <button className="marketplace-auth-link" type="button" onClick={resend} disabled={resending || (captchaSiteKey ? !captchaToken : false)}>{resending ? 'Reenviando…' : 'Reenviar e-mail de confirmação'}</button>
          </div>
        </section>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell pageTitle="Criar conta" hideFooter>
      <section className="marketplace-auth-page">
        <div className="marketplace-auth-card">
          <div className="marketplace-auth-card__intro">
            <span>Cadastro básico</span>
            <h1>Crie sua conta de anunciante</h1>
            <p>Use esta conta para solicitar pontos, acompanhar retornos e conversar com os responsáveis. Nenhuma empresa será criada.</p>
          </div>

          <form className="marketplace-auth-form" onSubmit={submit}>
            <label><span>Nome completo</span><div className="marketplace-auth-input"><UserRound aria-hidden="true" /><input value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></div></label>
            <label><span>E-mail</span><div className="marketplace-auth-input"><Mail aria-hidden="true" /><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" maxLength={254} required /></div></label>
            <label><span>Telefone</span><div className="marketplace-auth-input"><Phone aria-hidden="true" /><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" placeholder="(00) 00000-0000" maxLength={24} required /></div></label>
            <label><span>Senha</span><div className="marketplace-auth-input"><LockKeyhole aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div><small>Mínimo de 8 caracteres, com maiúscula, número e símbolo.</small></label>
            <label><span>Confirmar senha</span><div className="marketplace-auth-input"><LockKeyhole aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} value={form.confirmation} onChange={(event) => update('confirmation', event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></div></label>

            <label className="marketplace-auth-check marketplace-auth-check--terms">
              <input type="checkbox" checked={form.acceptTerms} onChange={(event) => update('acceptTerms', event.target.checked)} />
              <span>Li e aceito os <button type="button" onClick={() => navigate(appendInternalReturnUrl('/termos', currentInternalUrl('/marketplace/cadastro')))}>Termos de uso</button> e a <button type="button" onClick={() => navigate(appendInternalReturnUrl('/privacidade', currentInternalUrl('/marketplace/cadastro')))}>Política de privacidade</button>.</span>
            </label>

            {captchaSiteKey ? <TurnstileWidget siteKey={captchaSiteKey} onToken={setCaptchaToken} /> : null}
            <button className="marketplace-button marketplace-button--primary marketplace-auth-form__submit" type="submit" disabled={submitting || (captchaSiteKey ? !captchaToken : false)}>{submitting ? 'Criando conta…' : 'Criar conta'}</button>
          </form>

          <p className="marketplace-auth-card__switch">Já possui uma conta? <button type="button" onClick={() => navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`)}>Entrar</button></p>
        </div>
      </section>
    </MarketplaceShell>
  );
}
