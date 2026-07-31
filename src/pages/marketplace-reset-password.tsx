import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { useNavigation } from '../contexts/NavigationContext';
import {
  resetMarketplacePassword,
  validateMarketplacePasswordResetToken,
} from '../lib/marketplaceAccountApi';
import { getApiError } from '../lib/getApiError';
import { getPasswordErrorMessage } from '../lib/validators';
import { safeMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';
import { stripTokenParam } from '../lib/urlSecurity';

type TokenState = 'checking' | 'valid' | 'invalid' | 'error';

export default function MarketplaceResetPasswordPage() {
  const navigate = useNavigation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const returnUrl = safeMarketplaceReturnUrl(params.get('returnUrl'));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>(token ? 'checking' : 'invalid');
  const [tokenMessage, setTokenMessage] = useState(
    token ? '' : 'O link de redefinição está incompleto.',
  );
  const [validationAttempt, setValidationAttempt] = useState(0);

  useEffect(() => {
    stripTokenParam('/marketplace/redefinir-senha');
    if (!token) return;

    let cancelled = false;
    void validateMarketplacePasswordResetToken(token)
      .then(() => {
        if (!cancelled) setTokenState('valid');
      })
      .catch((error) => {
        if (cancelled) return;
        const apiError = getApiError(
          error,
          'Não foi possível verificar o link agora.',
        );
        setTokenMessage(apiError.message);
        setTokenState(
          apiError.code === 'RESET_TOKEN_INVALID' || apiError.status === 400
            ? 'invalid'
            : 'error',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, validationAttempt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || tokenState !== 'valid') return;

    const passwordError = getPasswordErrorMessage(password);
    if (passwordError) return void toast.error(passwordError);
    if (password !== confirmation) return void toast.error('As senhas não conferem.');

    try {
      setSubmitting(true);
      const response = await resetMarketplacePassword({ token, newPassword: password });
      toast.success(response.message);
      navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`);
    } catch (error) {
      const apiError = getApiError(error, 'Não foi possível redefinir sua senha.');
      if (apiError.code === 'RESET_TOKEN_INVALID') {
        setTokenMessage(apiError.message);
        setTokenState('invalid');
      }
      toast.error(apiError.message);
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

          {tokenState === 'checking' ? (
            <p className="marketplace-auth-info" role="status">
              <LoaderCircle className="marketplace-auth-spinner" aria-hidden="true" />
              Verificando a validade do link…
            </p>
          ) : null}

          {tokenState === 'error' ? (
            <div className="marketplace-auth-form">
              <p className="marketplace-auth-error" role="alert">{tokenMessage}</p>
              <button
                className="marketplace-button marketplace-button--secondary marketplace-auth-form__submit"
                type="button"
                onClick={() => {
                  setTokenState('checking');
                  setValidationAttempt((value) => value + 1);
                }}
              >
                Tentar verificar novamente
              </button>
            </div>
          ) : null}

          {tokenState === 'invalid' ? (
            <div className="marketplace-auth-form">
              <p className="marketplace-auth-error" role="alert">{tokenMessage}</p>
              <p className="marketplace-auth-helper">
                Solicite um novo e-mail de recuperação para continuar.
              </p>
              <button
                className="marketplace-button marketplace-button--primary marketplace-auth-form__submit"
                type="button"
                onClick={() => navigate(`/marketplace/esqueci-senha?returnUrl=${encodeURIComponent(returnUrl)}`)}
              >
                Solicitar novo link
              </button>
            </div>
          ) : null}

          {tokenState === 'valid' ? (
            <form className="marketplace-auth-form" onSubmit={submit}>
              <label>
                <span>Nova senha</span>
                <div className="marketplace-auth-input">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
                <small>Mínimo de 8 caracteres, com maiúscula, número e símbolo.</small>
              </label>

              <label>
                <span>Confirmar nova senha</span>
                <div className="marketplace-auth-input">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    type={showConfirmation ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((value) => !value)}
                    aria-label={showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  >
                    {showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <button
                className="marketplace-button marketplace-button--primary marketplace-auth-form__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Atualizando…' : 'Atualizar senha'}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </MarketplaceShell>
  );
}
