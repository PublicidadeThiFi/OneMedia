import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { buildMarketplaceSearchPath } from '../../lib/marketplaceApi';
import type { MarketplaceHomeSection } from '../../types/marketplace';
import { MarketplacePointCard } from './MarketplacePointCard';

type MarketplaceSectionProps = {
  section: MarketplaceHomeSection;
};

const sectionCopy: Record<string, { title?: string; subtitle?: string }> = {
  'most-searched': {
    title: 'Pontos de mídia mais procurados',
  },
  'high-impact': {
    title: 'Pontos ideais para campanhas de alto impacto',
    subtitle: 'Compare formatos, localização, impacto estimado e valores antes de escolher sua mídia.',
  },
  'available-next-month': {
    title: 'Disponíveis no próximo mês',
  },
  'brand-highlights': {
    title: 'Mídias em destaque para sua marca aparecer mais',
    subtitle: 'Pontos selecionados pela OneMedia por localização estratégica e presença visual.',
  },
};

export function MarketplaceSection({ section }: MarketplaceSectionProps) {
  const navigate = useNavigation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const copy = sectionCopy[section.key] ?? {};

  const scroll = (direction: -1 | 1) => {
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(280, element.clientWidth * 0.78), behavior: 'smooth' });
  };

  const viewMore = () => navigate(buildMarketplaceSearchPath(section.viewMoreQuery || {}));

  return (
    <section className="marketplace-catalog-section" aria-labelledby={`marketplace-section-${section.key}`}>
      <div className="marketplace-catalog-section__heading">
        <div>
          <h2 id={`marketplace-section-${section.key}`} className="marketplace-catalog-section__title">
            <button type="button" onClick={viewMore}>
              <span>{copy.title || section.title}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </h2>
          {copy.subtitle && <p>{copy.subtitle}</p>}
        </div>

        <div className="marketplace-catalog-section__controls" aria-label={`Navegar por ${copy.title || section.title}`}>
          <button type="button" onClick={() => scroll(-1)} aria-label="Ver pontos anteriores">
            <ArrowLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Ver próximos pontos">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="marketplace-catalog-section__scroller" ref={scrollerRef}>
        {section.items.map((point) => <MarketplacePointCard key={point.id} point={point} />)}
      </div>
    </section>
  );
}
