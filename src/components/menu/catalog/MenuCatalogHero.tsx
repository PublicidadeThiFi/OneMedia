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

  return (
    <section className="space-y-4 sm:space-y-5">
      <header className="menu-catalog-topbar">
        <div className="menu-catalog-brand">
          <img src={oneMediaLogo} alt="OneMedia" className="h-6 w-auto sm:h-7" />
          <span className="text-[15px] font-semibold text-slate-800">OneMedia</span>
        </div>
        <div className="menu-catalog-breadcrumb">
          <strong>Mídia Kit</strong>
          <span className="text-slate-300">|</span>
          <span>{companyName}</span>
        </div>
      </header>

      <div className="menu-catalog-hero-card p-2 sm:p-3">
        <div className="menu-catalog-hero-surface">
          <div className="absolute inset-0">
            {heroImageUrl ? (
              <ImageWithFallback
                src={heroImageUrl}
                alt={companyName}
                className="h-full w-full object-cover object-center opacity-25"
              />
            ) : (
              <div
                className="h-full w-full bg-cover bg-center opacity-25"
                style={{
                  backgroundImage: "url('/fundo_capa_cardapio_global.png'), linear-gradient(135deg,#edf2f7 0%,#f8fafc 50%,#eef2f7 100%)",
                }}
              />
            )}
          </div>

          <div className="menu-catalog-hero-content">
            <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
              <div className="menu-catalog-logo-box">
                {logoUrl ? (
                  <ImageWithFallback src={logoUrl} alt={companyName} className="h-16 w-auto object-contain sm:h-20 lg:h-24" />
                ) : (
                  <div className="text-4xl font-semibold tracking-tight text-[#2b1a4d] sm:text-5xl lg:text-6xl">{companyName}</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
