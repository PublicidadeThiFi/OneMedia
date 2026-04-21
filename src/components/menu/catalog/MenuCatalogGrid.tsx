import { MapPinned, RotateCcw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { PublicMediaKitPoint } from '../../../lib/publicMediaKit';
import { MenuCatalogCard } from './MenuCatalogCard';

type MenuCatalogGridProps = {
  points: PublicMediaKitPoint[];
  loading: boolean;
  isAgency: boolean;
  markupPercent: number;
  onOpenDetail: (pointId: string) => void;
  isSelectionMode?: boolean;
  selectedPointIds?: string[];
  onToggleSelection?: (pointId: string) => void;
  onClearFilters?: () => void;
  onChangeRegion?: () => void;
};

export function MenuCatalogGrid({
  points,
  loading,
  isAgency,
  markupPercent,
  onOpenDetail,
  isSelectionMode = false,
  selectedPointIds = [],
  onToggleSelection,
  onClearFilters,
  onChangeRegion,
}: MenuCatalogGridProps) {
  if (loading && points.length === 0) {
    return (
      <div className="menu-catalog-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="menu-card animate-pulse">
            <div className="menu-card-inner">
              <div className="menu-card-media bg-slate-200" />
              <CardContent className="menu-card-content space-y-4">
                <div className="h-5 w-2/3 rounded bg-white/80" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-white/75" />
                  <div className="h-4 w-11/12 rounded bg-white/70" />
                  <div className="h-4 w-5/6 rounded bg-white/70" />
                </div>
                <div className="h-12 rounded bg-white/80" />
                <div className="flex items-center justify-between gap-3">
                  <div className="h-8 w-28 rounded bg-white/80" />
                  <div className="h-8 w-32 rounded bg-white/80" />
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <Card className="rounded-[18px] border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.05)]">
        <CardContent className="p-8 text-center">
          <div className="text-lg font-semibold text-slate-950">Nenhum ponto encontrado</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Tente limpar os filtros aplicados ou troque a região para ampliar a busca dentro do inventário.
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {typeof onClearFilters === 'function' ? (
              <Button variant="outline" className="h-10 rounded-md border-slate-200 bg-white px-4" onClick={onClearFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}
            {typeof onChangeRegion === 'function' ? (
              <Button className="h-10 rounded-md bg-slate-950 px-4 text-white hover:bg-slate-900" onClick={onChangeRegion}>
                <MapPinned className="mr-2 h-4 w-4" />
                Trocar região
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedSet = new Set(selectedPointIds);

  return (
    <div className="menu-catalog-grid">
      {points.map((point) => (
        <MenuCatalogCard
          key={point.id}
          point={point}
          isAgency={isAgency}
          markupPercent={markupPercent}
          onOpenDetail={onOpenDetail}
          isSelectionMode={isSelectionMode}
          isSelected={selectedSet.has(point.id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}
