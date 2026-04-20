import { ArrowRight, ListFilter, MapPinned, RefreshCcw, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

type MenuCatalogActionsProps = {
  onReload: () => void;
  onOpenRegionList: () => void;
  onChangeRegion: () => void;
  onScrollToGrid: () => void;
  onOpenCart?: () => void;
  regionCtaLabel: string;
  featuredPointName?: string | null;
  featuredPrice?: string | null;
  cartCount?: number;
  disabled?: boolean;
};

export function MenuCatalogActions({
  onReload,
  onOpenRegionList,
  onChangeRegion,
  onScrollToGrid,
  onOpenCart,
  regionCtaLabel,
  featuredPointName,
  featuredPrice,
  cartCount = 0,
  disabled,
}: MenuCatalogActionsProps) {
  const hasCart = cartCount > 0 && typeof onOpenCart === 'function';

  return (
    <Card className="rounded-[32px] border-slate-200 bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <CardContent className="flex h-full flex-col gap-5 p-6 sm:p-7">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ações rápidas</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Use a vitrine para navegar pelos pontos, comparar oportunidades e seguir para o detalhe, seleção de faces e proposta quando fizer sentido.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="h-12 rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-900" onClick={onScrollToGrid}>
            <Sparkles className="mr-2 h-4 w-4" />
            Ver pontos
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-4" onClick={onChangeRegion}>
            <MapPinned className="mr-2 h-4 w-4" />
            Trocar região
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-4" onClick={onReload} disabled={disabled}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar dados
          </Button>
          <Button className="h-12 rounded-2xl bg-slate-100 px-4 text-slate-900 hover:bg-slate-200" onClick={onOpenRegionList}>
            <ListFilter className="mr-2 h-4 w-4" />
            {regionCtaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {hasCart ? (
          <Button
            variant="outline"
            className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-slate-900"
            onClick={onOpenCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ver carrinho ({cartCount})
          </Button>
        ) : null}

        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Destaque atual do catálogo</div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{featuredPointName || 'Aguardando filtros e carregamento'}</div>
          <div className="mt-1 text-sm text-slate-600">{featuredPrice ? `A partir de ${featuredPrice} por mês.` : 'O destaque principal será atualizado conforme os filtros aplicados.'}</div>
        </div>
      </CardContent>
    </Card>
  );
}
