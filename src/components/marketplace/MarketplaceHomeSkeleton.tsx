export function MarketplaceHomeSkeleton() {
  return (
    <div className="marketplace-home-skeleton" aria-label="Carregando pontos de mídia" aria-busy="true">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section className="marketplace-home-skeleton__section" key={sectionIndex}>
          <div className="marketplace-home-skeleton__title" />
          <div className="marketplace-home-skeleton__cards">
            {Array.from({ length: 6 }).map((__, cardIndex) => (
              <div className="marketplace-home-skeleton__card" key={cardIndex}>
                <div className="marketplace-home-skeleton__media" />
                <div className="marketplace-home-skeleton__line marketplace-home-skeleton__line--wide" />
                <div className="marketplace-home-skeleton__line" />
                <div className="marketplace-home-skeleton__line marketplace-home-skeleton__line--price" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
