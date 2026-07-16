import { useEffect, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useMarketplaceAuth } from '../../contexts/MarketplaceAuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

export function MarketplaceProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useMarketplaceAuth();
  const navigate = useNavigation();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    navigate(`/marketplace/entrar?returnUrl=${encodeURIComponent(returnUrl)}`);
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="marketplace-account-loading" role="status">
        <LoaderCircle className="is-spinning" aria-hidden="true" />
        <p>{isLoading ? 'Carregando sua conta…' : 'Redirecionando para o login…'}</p>
      </div>
    );
  }

  return <>{children}</>;
}
