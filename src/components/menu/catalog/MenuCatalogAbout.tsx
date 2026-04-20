import { Building2, Globe2, MapPinned } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

type MenuCatalogAboutProps = {
  aboutText: string | null;
  companyName: string;
};

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}|•\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MenuCatalogAbout({ aboutText, companyName }: MenuCatalogAboutProps) {
  const content =
    String(aboutText ?? '').trim() ||
    `${companyName} conecta marcas e públicos em pontos estratégicos, organizando o inventário público com leitura comercial rápida e navegação objetiva.`;

  const paragraphs = splitParagraphs(content);

  return (
    <Card className="rounded-[32px] border-slate-200 bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <CardContent className="p-6 sm:p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sobre nós</div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="space-y-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
            {paragraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            ))}
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Building2 className="h-4 w-4" />
                Leitura comercial
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">Leitura rápida dos principais dados do inventário para apoiar comparação e tomada de decisão.</div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <MapPinned className="h-4 w-4" />
                Navegação pública
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">A navegação começa no catálogo e segue naturalmente para detalhe, faces, carrinho e envio da proposta.</div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Globe2 className="h-4 w-4" />
                Fonte pública
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">Os pontos são apresentados com foco comercial, combinando contexto, disponibilidade e preços de forma mais objetiva.</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
