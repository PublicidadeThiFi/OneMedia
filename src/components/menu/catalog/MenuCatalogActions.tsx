import { CheckCircle2, MapPinned, Plus, ShoppingCart, Sparkles, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';

type MenuCatalogActionsProps = {
  onOpenRegionList: () => void;
  onChangeRegion: () => void;
  onToggleSelectionMode: () => void;
  onAddSelectedToCart?: () => void;
  onOpenCart?: () => void;
  regionCtaLabel: string;
  featuredPointName?: string | null;
  featuredPrice?: string | null;
  cartCount?: number;
  selectedCount?: number;
  canAddSelected?: boolean;
  isSelectionMode?: boolean;
  disabled?: boolean;
};

export function MenuCatalogActions({
  onOpenRegionList,
  onChangeRegion,
  onToggleSelectionMode,
  onAddSelectedToCart,
  onOpenCart,
  regionCtaLabel,
  featuredPointName,
  featuredPrice,
  cartCount = 0,
  selectedCount = 0,
  canAddSelected = false,
  isSelectionMode = false,
  disabled,
}: MenuCatalogActionsProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-[#f5f7fb] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Planeje sua seleção</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Selecione apenas os pontos disponíveis, adicione ao carrinho e siga com a solicitação sem perder o fluxo comercial.
          </div>
          {(featuredPointName || featuredPrice) ? (
            <div className="mt-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Destaque atual:</span>{' '}
              <span>{featuredPointName || 'Catálogo atualizado conforme os filtros'}</span>
              {featuredPrice ? <span className="text-slate-500"> • A partir de {featuredPrice}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className={`h-11 rounded-full px-4 text-sm ${isSelectionMode ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-[#5f83c2] text-white hover:bg-[#4f72af]'}`}
            onClick={onToggleSelectionMode}
          >
            {isSelectionMode ? <XCircle className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isSelectionMode ? 'Cancelar seleção' : 'Selecionar pontos'}
          </Button>

          {typeof onAddSelectedToCart === 'function' ? (
            <Button
              className="h-11 rounded-full bg-slate-950 px-4 text-sm text-white hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-500"
              onClick={onAddSelectedToCart}
              disabled={!isSelectionMode || !canAddSelected}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ao carrinho
              {selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          ) : null}

          {typeof onOpenCart === 'function' ? (
            <Button
              variant="outline"
              className="h-11 rounded-full border-[#5f83c2] bg-white px-4 text-sm text-slate-900 hover:bg-slate-50"
              onClick={onOpenCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ver carrinho
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{cartCount}</span>
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="h-11 rounded-full border-slate-300 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onChangeRegion}
          >
            <MapPinned className="mr-2 h-4 w-4" />
            Trocar região
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {isSelectionMode ? (
            <span className="inline-flex items-center gap-2 font-medium text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-[#5f83c2]" />
              {selectedCount > 0
                ? `${selectedCount} ponto${selectedCount === 1 ? '' : 's'} selecionado${selectedCount === 1 ? '' : 's'}.`
                : 'Selecione apenas os pontos com status Disponível.'}
            </span>
          ) : (
            'Você pode trocar a região atual a qualquer momento sem perder o recorte compartilhado no link.'
          )}
        </div>

        <button
          type="button"
          className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onOpenRegionList}
          disabled={disabled}
        >
          {regionCtaLabel}
        </button>
      </div>
    </section>
  );
}
