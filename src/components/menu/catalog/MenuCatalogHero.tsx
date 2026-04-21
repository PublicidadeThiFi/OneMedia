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
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={oneMediaLogo} alt="OneMedia" className="h-10 w-auto sm:h-11" />
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-900">Mídia Kit</span>
            <span className="mx-2 text-slate-300">|</span>
            <span>{companyName}</span>
          </div>
        </div>
      </header>

      <div className="rounded-[34px] border border-slate-200 bg-white p-2 shadow-[0_14px_36px_rgba(15,23,42,0.04)] sm:p-3">
        <div className="relative isolate overflow-hidden rounded-[28px] border border-slate-200/80 bg-white min-h-[230px] sm:min-h-[300px] lg:min-h-[360px]">
          <div className="absolute inset-0">
            {heroImageUrl ? (
              <ImageWithFallback
                src={heroImageUrl}
                alt={companyName}
                className="h-full w-full object-cover object-center opacity-20"
              />
            ) : (
              <div
                className="h-full w-full bg-cover bg-center opacity-25"
                style={{
                  backgroundImage: "url('/fundo_capa_cardapio_global.png'), linear-gradient(135deg,#eef3f9 0%,#f8fafc 50%,#f1f5f9 100%)",
                }}
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.8)_35%,rgba(255,255,255,0.88)_100%)]" />
          </div>

          <div className="relative flex h-full min-h-[230px] flex-col justify-between px-4 py-5 sm:min-h-[300px] sm:px-7 sm:py-6 lg:min-h-[360px] lg:px-10 lg:py-7">
            <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
              <div className="rounded-[20px] bg-white/60 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-[2px] sm:px-6 sm:py-4 lg:px-8 lg:py-5">
                {logoUrl ? (
                  <ImageWithFallback src={logoUrl} alt={companyName} className="h-14 w-auto object-contain sm:h-20 lg:h-28" />
                ) : (
                  <div className="text-4xl font-semibold tracking-tight text-[#2b1a4d] sm:text-5xl lg:text-7xl">{companyName}</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="text-slate-950">
                  <div className="text-[2.2rem] italic leading-none tracking-tight sm:text-[3rem] lg:text-[4rem]" style={{ fontFamily: 'Georgia, serif' }}>
                    MÍDIA
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-[2.5rem] font-black leading-none tracking-tight sm:text-[3.35rem] lg:text-[4.35rem]">KIT</div>
                    <div className="pb-1 text-[1.4rem] leading-none sm:text-[1.8rem] lg:text-[2.2rem]">{year}</div>
                  </div>
                </div>

                <div className="max-w-[32rem] text-sm font-medium text-slate-700 sm:text-right">
                  {formatGeneratedAt(displayUpdatedAt)}
                </div>
              </div>

              <div className="h-px w-full bg-slate-300/80" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
