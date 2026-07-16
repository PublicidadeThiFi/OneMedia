import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { useNavigation } from '../contexts/NavigationContext';
import { verifyMarketplaceEmail } from '../lib/marketplaceAccountApi';
import { safeMarketplaceReturnUrl } from '../lib/marketplaceReturnUrl';
import { getApiError } from '../lib/getApiError';

export default function MarketplaceVerifyEmailPage() {
  const navigate = useNavigation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const returnUrl = safeMarketplaceReturnUrl(params.get('returnUrl'));
  const [state, setState] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Confirmando seu e-mail…' : 'O link de confirmação está incompleto.');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyMarketplaceEmail(token)
      .then((response) => {
        if (cancelled) return;
        setState('success');
        setMessage(response.message);
        window.history.replaceState({}, '', '/marketplace/verificar-email');
      })
      .catch((error) => {
        if (cancelled) return;
        setState('error');
        setMessage(getApiError(error, 'Não foi possível confirmar este e-mail.').message);
        window.history.replaceState({}, '', '/marketplace/verificar-email');
      });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <MarketplaceShell pageTitle="Confirmar e-mail" hideFooter>
      <section className="marketplace-auth-page">
        <div className="marketplace-auth-card marketplace-auth-card--status">
          {state === 'loading' ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : state === 'success' ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          <span>Verificação da conta</span>
          <h1>{state === 'success' ? 'E-mail confirmado' : state === 'loading' ? 'Só um instante' : 'Não foi possível confirmar'}</h1>
          <p>{message}</p>
          {state !== 'loading' ? (
            <button className="marketplace-button marketplace-button--primary" type="button" onClick={() => navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`)}>
              {state === 'success' ? 'Entrar na minha conta' : 'Voltar para o login'}
            </button>
          ) : null}
        </div>
      </section>
    </MarketplaceShell>
  );
}
