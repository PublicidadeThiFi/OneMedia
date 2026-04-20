import { CheckCircle2, MapPinned, Plus, ShoppingCart, Sparkles, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';

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
  const canOpenCart = typeof onOpenCart === 'function';

  return (
    <Card className="rounded-[28px] border-slate-200 bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:rounded-[32px]">
      <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-7">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Planeje sua seleção</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Selecione os pontos disponíveis, adicione ao carrinho e siga para o envio da solicitação sem sair do fluxo comercial.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className={`h-12 w-full justify-center rounded-2xl px-4 text-center text-white ${isSelectionMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-950 hover:bg-slate-900'}`}
            onClick={onToggleSelectionMode}
          >
            {isSelectionMode ? <XCircle className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isSelectionMode ? 'Cancelar seleção' : 'Selecionar pontos'}
          </Button>

          {canOpenCart ? (
            <Button
              variant="outline"
              className="h-12 w-full justify-center rounded-2xl border-slate-200 bg-white px-4 text-center text-slate-900"
              onClick={onOpenCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ver carrinho
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{cartCount}</span>
            </Button>
          ) : (
            <Button variant="outline" className="h-12 w-full justify-center rounded-2xl border-slate-200 bg-white px-4 text-center" onClick={onChangeRegion}>
              <MapPinned className="mr-2 h-4 w-4" />
              Trocar região
            </Button>
          )}

          {isSelectionMode ? (
            <Button
              className="h-12 w-full justify-center rounded-2xl bg-emerald-600 px-4 text-center text-white hover:bg-emerald-700 disabled:bg-emerald-200 disabled:text-emerald-700 sm:col-span-2"
              onClick={onAddSelectedToCart}
              disabled={!canAddSelected || typeof onAddSelectedToCart !== 'function'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ao carrinho
              {selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          ) : null}
        </div>

        {isSelectionMode ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-sky-700" />
              Modo de seleção ativo
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-600">
              {selectedCount > 0
                ? `${selectedCount} ponto${selectedCount === 1 ? '' : 's'} selecionado${selectedCount === 1 ? '' : 's'} no catálogo.`
                : 'Selecione apenas os pontos com status Disponível. Pontos em negociação, parciais ou ocupados não entram na seleção.'}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600">
            Você pode trocar a região atual a qualquer momento e o catálogo continuará respeitando os filtros compartilhados no link inicial.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-900" onClick={onChangeRegion}>
            <MapPinned className="mr-2 h-4 w-4" />
            Trocar região
          </Button>
          <button
            type="button"
            className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onOpenRegionList}
            disabled={disabled}
          >
            {regionCtaLabel}
          </button>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Destaque atual do catálogo</div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{featuredPointName || 'Destaque atualizado conforme os filtros aplicados'}</div>
          <div className="mt-1 text-sm text-slate-600">{featuredPrice ? `A partir de ${featuredPrice} por mês.` : 'O destaque principal será atualizado conforme os filtros aplicados.'}</div>
        </div>
      </CardContent>
    </Card>
  );
}
