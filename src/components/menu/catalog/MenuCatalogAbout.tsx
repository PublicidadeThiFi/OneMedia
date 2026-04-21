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
  return `${companyName} conecta marcas e pessoas em locais estratégicos, organizando o inventário público com leitura comercial clara e navegação objetiva para apoiar campanhas com visibilidade e impacto.`;
}

export function MenuCatalogAbout({ aboutText, companyName, className }: MenuCatalogAboutProps) {
  const content = String(aboutText ?? '').trim() || buildFallbackAbout(companyName);
  const paragraphs = normalizeParagraphs(content);

  return (
    <section className={cn('px-1 text-slate-900', className)} aria-label="Sobre nós">
      <div className="max-w-5xl space-y-5">
        <div className="text-[15px] font-semibold">Sobre nós:</div>

        <div className="space-y-4 text-[15px] leading-8 text-slate-800 sm:text-[16px]">
          {paragraphs.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`} className={index === 0 ? 'font-medium text-slate-900' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
