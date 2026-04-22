import { ImageWithFallback } from '../../figma/ImageWithFallback';

function formatInSaoPaulo(value: string | null, options: Intl.DateTimeFormatOptions): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      ...options,
    }).format(date);
  } catch {
    return null;
  }
}

function formatGeneratedAt(value: string | null): string {
  const formatted = formatInSaoPaulo(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!formatted) return 'Última atualização indisponível';
  return `Última atualização em ${formatted} (horário de Brasília)`;
}

type MenuCatalogHeroProps = {
  companyName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  generatedAt: string | null;
  lastInventoryChangeAt: string | null;
};

const HERO_BACKGROUND_IMAGE = "url('/fundo_capa_cardapio_global.png')";

export function MenuCatalogHero({
  companyName,
  logoUrl,
  generatedAt,
  lastInventoryChangeAt,
}: MenuCatalogHeroProps) {
  const displayUpdatedAt = lastInventoryChangeAt ?? generatedAt;

  return (
    <section>
      <header className="menu-catalog-topbar">
        <div className="menu-catalog-brand">
          <span className="menu-catalog-brand-name">OneMedia</span>
        </div>
        <div className="menu-catalog-breadcrumb">
          <strong>Mídia Kit</strong>
          <span>|</span>
          <span>{companyName}</span>
        </div>
      </header>

      <div className="menu-catalog-hero-card">
        <div className="menu-catalog-hero-surface" style={{ backgroundImage: HERO_BACKGROUND_IMAGE }}>
          <div className="menu-catalog-hero-content">
            <div className="menu-catalog-logo-box" aria-label={`Logo de ${companyName}`}>
              {logoUrl ? (
                <ImageWithFallback src={logoUrl} alt={companyName} className="menu-catalog-logo-image" />
              ) : (
                <div className="menu-catalog-logo-fallback">{companyName}</div>
              )}
            </div>

            <div className="menu-catalog-hero-footer">
              <div className="menu-catalog-updated">{formatGeneratedAt(displayUpdatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
