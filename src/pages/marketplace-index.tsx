import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { MarketplaceSearchBar } from '../components/marketplace/MarketplaceSearchBar';
import { MarketplaceSection } from '../components/marketplace/MarketplaceSection';
import { MarketplaceHomeSkeleton } from '../components/marketplace/MarketplaceHomeSkeleton';
import { useNavigation } from '../contexts/NavigationContext';
import { fetchMarketplaceHome } from '../lib/marketplaceApi';
import type { MarketplaceHomeResponse } from '../types/marketplace';

export default function MarketplaceIndexPage() {
  const navigate = useNavigation();
  const [data, setData] = useState<MarketplaceHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMarketplaceHome({}, controller.signal)
      .then((response) => setData(response))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error('[marketplace] Falha ao carregar a página inicial:', requestError);
        setError('Não foi possível carregar os pontos de mídia agora. Tente novamente em instantes.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [requestVersion]);

  const sections = (data?.sections ?? []).filter((section) => section.items.length > 0);

  return (
    <MarketplaceShell pageTitle="Encontre mídia OOH e DOOH">
      <section className="marketplace-home-search">
        <div className="marketplace-home-search__inner">
          <h1 className="marketplace-visually-hidden">Marketplace OneMedia de mídia OOH e DOOH</h1>
          <MarketplaceSearchBar filters={data?.filters} />
        </div>
      </section>

      <section className="marketplace-home-catalog" aria-label="Pontos de mídia em destaque" aria-busy={loading}>
        <div className="marketplace-home-catalog__inner">
          {loading && !data && <MarketplaceHomeSkeleton />}

          {!loading && error && !data && (
            <div className="marketplace-home-state" role="alert">
              <span className="marketplace-home-state__icon"><AlertCircle aria-hidden="true" /></span>
              <h2>Não conseguimos carregar o catálogo</h2>
              <p>{error}</p>
              <button type="button" className="marketplace-button marketplace-button--primary" onClick={retry}>
                <RefreshCw aria-hidden="true" /> Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && data && sections.length === 0 && (
            <div className="marketplace-home-state">
              <h2>Novos pontos estão chegando</h2>
              <p>O catálogo público ainda não possui pontos publicados. Enquanto isso, conheça a plataforma OneMedia.</p>
              <button type="button" className="marketplace-button marketplace-button--primary" onClick={() => navigate('/home')}>
                Conhecer a OneMedia <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}

          {sections.map((section) => <MarketplaceSection key={section.key} section={section} />)}

          {data && error && (
            <div className="marketplace-home-inline-error" role="status">
              Alguns dados podem estar desatualizados. <button type="button" onClick={retry}>Atualizar</button>
            </div>
          )}
        </div>
      </section>
    </MarketplaceShell>
  );
}
