import { ImageWithFallback } from '../../figma/ImageWithFallback';
import oneMediaLogo from '../../../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

function formatGeneratedAt(value: string | null): string {
  if (!value) return 'Última atualização indisponível';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Última atualização indisponível';
  return `Última atualização em ${date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} (horário de Brasília)`;
}

function resolveYear(value: string | null): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : String(new Date().getFullYear());
}

type MenuCatalogHeroProps = {
  companyName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  generatedAt: string | null;
  lastInventoryChangeAt: string | null;
};

export function MenuCatalogHero({
  companyName,
  logoUrl,
  heroImageUrl,
  generatedAt,
  lastInventoryChangeAt,
}: MenuCatalogHeroProps) {
  const displayUpdatedAt = lastInventoryChangeAt ?? generatedAt;
  const year = resolveYear(displayUpdatedAt ?? generatedAt);
  const heroBackgroundImage = heroImageUrl
    ? `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.14) 100%), url('${heroImageUrl}')`
    : `url('/fundo_capa_cardapio_global.png'), url('/figma-assets/midiakit.png'), linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)`;

  return (
    <section>
      <header className="menu-catalog-topbar">
        <div className="menu-catalog-brand">
          <img src={oneMediaLogo} alt="OneMedia" />
          <span className="menu-catalog-brand-name">OneMedia</span>
        </div>
        <div className="menu-catalog-breadcrumb">
          <strong>Mídia Kit</strong>
          <span>|</span>
          <span>{companyName}</span>
        </div>
      </header>

      <div className="menu-catalog-hero-card">
        <div className="menu-catalog-hero-surface" style={{ backgroundImage: heroBackgroundImage }}>
          <div className="menu-catalog-hero-content">
            <div className="menu-catalog-logo-box">
              {logoUrl ? (
                <ImageWithFallback src={logoUrl} alt={companyName} className="menu-catalog-logo-image" />
              ) : (
                <div className="menu-catalog-logo-fallback">{companyName}</div>
              )}
            </div>

            <div className="menu-catalog-hero-footer">
              <div className="menu-catalog-kit-lockup">
                <div className="line-media">MÍDIA</div>
                <div className="line-kit">
                  <strong>KIT</strong>
                  <span>{year}</span>
                </div>
              </div>
              <div className="menu-catalog-updated">{formatGeneratedAt(displayUpdatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
