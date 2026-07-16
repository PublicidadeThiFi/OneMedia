import { ArrowRight, Construction, MapPin, Search } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';

type MarketplaceRoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  compact?: boolean;
};

export function MarketplaceRoutePlaceholder({
  eyebrow,
  title,
  description,
  actionLabel = 'Explorar o marketplace',
  actionPath = '/',
  compact = false,
}: MarketplaceRoutePlaceholderProps) {
  const navigate = useNavigation();

  return (
    <section className={compact ? 'marketplace-placeholder marketplace-placeholder--compact' : 'marketplace-placeholder'}>
      <div className="marketplace-container">
        <div className="marketplace-placeholder__card">
          <div className="marketplace-placeholder__icon" aria-hidden="true">
            <Construction />
          </div>
          <p className="marketplace-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <button type="button" className="marketplace-button marketplace-button--primary" onClick={() => navigate(actionPath)}>
            {actionLabel}
            <ArrowRight aria-hidden="true" />
          </button>
          <div className="marketplace-placeholder__features" aria-label="Recursos previstos">
            <span><Search aria-hidden="true" /> Busca pública</span>
            <span><MapPin aria-hidden="true" /> Pontos no mapa</span>
          </div>
        </div>
      </div>
    </section>
  );
}
