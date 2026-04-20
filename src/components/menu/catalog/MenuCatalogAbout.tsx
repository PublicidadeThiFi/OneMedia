import { cn } from '../../../lib/utils';

type MenuCatalogAboutProps = {
  aboutText: string | null;
  companyName: string;
  className?: string;
};

function normalizeParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}|•\s*/g)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function buildFallbackAbout(companyName: string): string {
  return `${companyName} conecta marcas e pessoas em pontos estratégicos, organizando o inventário público com leitura comercial clara e navegação objetiva para apoiar campanhas com visibilidade e impacto.`;
}

export function MenuCatalogAbout({ aboutText, companyName, className }: MenuCatalogAboutProps) {
  const content = String(aboutText ?? '').trim() || buildFallbackAbout(companyName);
  const paragraphs = normalizeParagraphs(content);

  return (
    <section
      className={cn(
        'rounded-[32px] border border-slate-200/80 bg-white/96 px-6 py-6 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:px-7 sm:py-7',
        className,
      )}
      aria-label="Sobre nós"
    >
      <div className="max-w-4xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sobre nós</div>

        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
          {paragraphs.map((paragraph, index) => {
            const isIntro = index === 0;
            return (
              <p
                key={`${paragraph}-${index}`}
                className={cn(
                  isIntro ? 'text-[15px] font-medium leading-7 text-slate-800 sm:text-base' : '',
                )}
              >
                {paragraph}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
