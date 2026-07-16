import { useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { useNavigation } from '../contexts/NavigationContext';
import { resetMarketplacePassword } from '../lib/marketplaceAccountApi';
import { getApiError } from '../lib/getApiError';
import { getPasswordErrorMessage } from '../lib/validators';
import { safeMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';

export default function MarketplaceResetPasswordPage() {
  const navigate = useNavigation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const returnUrl = safeMarketplaceReturnUrl(params.get('returnUrl'));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return void toast.error('O link de redefinição está incompleto.');
    const passwordError = getPasswordErrorMessage(password);
    if (passwordError) return void toast.error(passwordError);
    if (password !== confirmation) return void toast.error('As senhas não conferem.');
    try {
      setSubmitting(true);
      const response = await resetMarketplacePassword({ token, newPassword: password });
      window.history.replaceState({}, '', '/marketplace/redefinir-senha');
      toast.success(response.message);
      navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`);
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível redefinir sua senha.').message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketplaceShell pageTitle="Redefinir senha" hideFooter>
      <section className="marketplace-auth-page">
        <div className="marketplace-auth-card">
          <div className="marketplace-auth-card__intro">
            <span>Segurança da conta</span>
            <h1>Crie uma nova senha</h1>
            <p>A nova senha encerrará as sessões anteriores da conta de anunciante.</p>
          </div>
          {!token ? <p className="marketplace-auth-error">O link está incompleto ou já teve o token removido por segurança.</p> : null}
          <form className="marketplace-auth-form" onSubmit={submit}>
            <label><span>Nova senha</span><div className="marketplace-auth-input"><LockKeyhole aria-hidden="true" /><input type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div><small>Mínimo de 8 caracteres, com maiúscula, número e símbolo.</small></label>
            <label><span>Confirmar nova senha</span><div className="marketplace-auth-input"><LockKeyhole aria-hidden="true" /><input type={show ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></div></label>
            <button className="marketplace-button marketplace-button--primary marketplace-auth-form__submit" type="submit" disabled={submitting || !token}>{submitting ? 'Atualizando…' : 'Atualizar senha'}</button>
          </form>
        </div>
      </section>
    </MarketplaceShell>
  );
}
