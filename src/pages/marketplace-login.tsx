import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { TurnstileWidget } from '../components/turnstile/TurnstileWidget';
import { useMarketplaceAuth } from '../contexts/MarketplaceAuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { createMarketplaceCustomerInquiry } from '../lib/marketplaceAccountApi';
import { clearPendingMarketplaceInquiry, readPendingMarketplaceInquiry } from '../lib/marketplacePendingInquiry';
import { readMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';
import { publicApiClient } from '../lib/apiClient';
import { getApiError } from '../lib/getApiError';

export default function MarketplaceLoginPage() {
  const navigate = useNavigation();
  const { login, isAuthenticated, isLoading: authLoading } = useMarketplaceAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSiteKey, setCaptchaSiteKey] = useState(
    String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || ''),
  );
  const [submitting, setSubmitting] = useState(false);

  const returnUrl = readMarketplaceReturnUrl('/marketplace/solicitacoes');

  useEffect(() => {
    if (!authLoading && isAuthenticated && !submitting) navigate(returnUrl);
  }, [authLoading, isAuthenticated, navigate, returnUrl, submitting]);

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

  const finishPendingInquiry = async () => {
    const pending = readPendingMarketplaceInquiry();
    if (!pending) return false;
    try {
      await createMarketplaceCustomerInquiry({
        slug: pending.slug,
        startDate: pending.startDate,
        endDate: pending.endDate,
        campaignType: pending.campaignType,
      });
      clearPendingMarketplaceInquiry();
      toast.success('Solicitação enviada para o responsável pelo ponto.');
      navigate('/marketplace/solicitacoes?enviada=1');
      return true;
    } catch (error) {
      const apiError = getApiError(error, 'Sua conta foi acessada, mas não foi possível enviar a solicitação.');
      toast.error(apiError.message);
      navigate(pending.returnUrl || returnUrl);
      return true;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (captchaSiteKey && !captchaToken) {
      toast.error('Valide o captcha para continuar.');
      return;
    }
    try {
      setSubmitting(true);
      await login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
        captchaToken: captchaSiteKey ? captchaToken : undefined,
      });
      toast.success('Bem-vindo ao Marketplace OneMedia.');
      if (!(await finishPendingInquiry())) navigate(returnUrl);
    } catch (error) {
      const apiError = getApiError(error, 'Não foi possível entrar. Confira seus dados.');
      toast.error(apiError.message);
      setCaptchaToken('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketplaceShell pageTitle="Entrar" hideFooter>
      <section className="marketplace-auth-page">
        <div className="marketplace-auth-card">
          <div className="marketplace-auth-card__intro">
            <span>Conta do anunciante</span>
            <h1>Entre para acompanhar suas solicitações</h1>
            <p>Este acesso é exclusivo para quem busca anunciar em pontos OOH e DOOH. Ele é separado da conta empresarial da OneMedia.</p>
          </div>

          <form className="marketplace-auth-form" onSubmit={submit}>
            <label>
              <span>E-mail</span>
              <div className="marketplace-auth-input">
                <Mail aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                  maxLength={254}
                />
              </div>
            </label>

            <label>
              <span>Senha</span>
              <div className="marketplace-auth-input">
                <LockKeyhole aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </label>

            <div className="marketplace-auth-form__options">
              <label className="marketplace-auth-check">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Lembrar neste dispositivo</span>
              </label>
              <button type="button" onClick={() => navigate(`/marketplace/esqueci-senha?returnUrl=${encodeURIComponent(returnUrl)}`)}>
                Esqueci minha senha
              </button>
            </div>

            {captchaSiteKey ? <TurnstileWidget siteKey={captchaSiteKey} onToken={setCaptchaToken} /> : null}

            <button className="marketplace-button marketplace-button--primary marketplace-auth-form__submit" type="submit" disabled={submitting || (captchaSiteKey ? !captchaToken : false)}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="marketplace-auth-card__switch">
            Ainda não tem conta?{' '}
            <button type="button" onClick={() => navigate(`/marketplace/cadastro?returnUrl=${encodeURIComponent(returnUrl)}`)}>Criar conta gratuita</button>
          </p>
          <button className="marketplace-auth-card__business-link" type="button" onClick={() => navigate('/login')}>
            Precisa acessar a conta empresarial?
          </button>
        </div>
      </section>
    </MarketplaceShell>
  );
}
