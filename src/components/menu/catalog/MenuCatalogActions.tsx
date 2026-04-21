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
    <section className="menu-catalog-actions-card">
      <div className="menu-catalog-actions-top">
        <div className="menu-catalog-actions-copy">
          <div className="eyebrow">Planeje sua seleção</div>
          <p>
            Selecione apenas os pontos disponíveis, adicione ao carrinho e siga com a solicitação sem perder o fluxo comercial.
          </p>
          {(featuredPointName || featuredPrice) ? (
            <p className="mt-2 text-slate-700">
              <span className="font-semibold text-slate-900">Destaque atual:</span>{' '}
              <span>{featuredPointName || 'Catálogo atualizado conforme os filtros'}</span>
              {featuredPrice ? <span className="text-slate-500"> • A partir de {featuredPrice}</span> : null}
            </p>
          ) : null}
        </div>

        <div className="menu-catalog-actions-group">
          <Button
            className={`h-10 rounded-md px-4 text-[13px] ${isSelectionMode ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-[#4169e1] text-white hover:bg-[#3557c7]'}`}
            onClick={onToggleSelectionMode}
          >
            {isSelectionMode ? <XCircle className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isSelectionMode ? 'Cancelar seleção' : 'Selecionar pontos'}
          </Button>

          {typeof onAddSelectedToCart === 'function' ? (
            <Button
              className="h-10 rounded-md bg-slate-950 px-4 text-[13px] text-white hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-500"
              onClick={onAddSelectedToCart}
              disabled={!isSelectionMode || !canAddSelected}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ao carrinho{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          ) : null}

          {typeof onOpenCart === 'function' ? (
            <Button
              variant="outline"
              className="h-10 rounded-md border-slate-300 bg-white px-4 text-[13px] text-slate-900 hover:bg-slate-50"
              onClick={onOpenCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ver carrinho
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{cartCount}</span>
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="h-10 rounded-md border-slate-300 bg-white px-4 text-[13px] text-slate-700 hover:bg-slate-50"
            onClick={onChangeRegion}
          >
            <MapPinned className="mr-2 h-4 w-4" />
            Trocar região
          </Button>
        </div>
      </div>

      <div className="menu-catalog-actions-footer">
        <div className="text-[13px] text-slate-600">
          {isSelectionMode ? (
            <span className="inline-flex items-center gap-2 font-medium text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-[#4169e1]" />
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
          className="text-[13px] font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onOpenRegionList}
          disabled={disabled}
        >
          {regionCtaLabel}
        </button>
      </div>
    </section>
  );
}
