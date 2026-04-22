import { ImageWithFallback } from '../../figma/ImageWithFallback';
import oneMediaLogo from '../../../assets/4e6db870c03dccede5d3c65f6e7438ecda23a8e5.png';

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

function resolveYear(value: string | null): string {
  const formatted = formatInSaoPaulo(value, { year: 'numeric' });
  return formatted ?? formatInSaoPaulo(new Date().toISOString(), { year: 'numeric' }) ?? String(new Date().getFullYear());
}

type MenuCatalogHeroProps = {
  companyName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  generatedAt: string | null;
  lastInventoryChangeAt: string | null;
};

const HERO_BACKGROUND_IMAGE =
  "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.16) 100%), url('/fundo_capa_cardapio_global.png')";

export function MenuCatalogHero({
  companyName,
  logoUrl,
  generatedAt,
  lastInventoryChangeAt,
}: MenuCatalogHeroProps) {
  const displayUpdatedAt = lastInventoryChangeAt ?? generatedAt;
  const year = resolveYear(displayUpdatedAt ?? generatedAt);
  const heroBackgroundImage = HERO_BACKGROUND_IMAGE;

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
