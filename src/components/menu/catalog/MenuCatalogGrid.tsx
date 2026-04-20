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
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse overflow-hidden rounded-[30px] border-sky-100 bg-[#ebf4ff] shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <div className="grid lg:grid-cols-[minmax(250px,320px)_minmax(0,1fr)]">
              <div className="min-h-[240px] bg-slate-200" />
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-3 border-b border-sky-100 pb-4 lg:flex-row lg:justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-56 rounded bg-white/90" />
                    <div className="h-3 w-40 rounded bg-white/80" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[240px] lg:grid-cols-1 xl:grid-cols-2">
                    <div className="h-20 rounded-[20px] bg-white/90" />
                    <div className="h-20 rounded-[20px] bg-white/90" />
                  </div>
                </div>
                <div className="h-4 w-5/6 rounded bg-white/85" />
                <div className="grid gap-3 lg:grid-cols-2">
                  {Array.from({ length: 8 }).map((__, lineIndex) => (
                    <div key={lineIndex} className="h-4 rounded bg-white/80" />
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center border-t border-sky-100 pt-4">
                  <div className="h-20 rounded-[18px] bg-white/85" />
                  <div className="h-11 w-full rounded-2xl bg-white/90 sm:w-[180px]" />
                </div>
                <div className="h-11 w-full rounded-2xl bg-slate-200 sm:w-[180px]" />
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <Card className="rounded-[32px] border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.05)]">
        <CardContent className="p-8 text-center">
          <div className="text-lg font-semibold text-slate-950">Nenhum ponto encontrado</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Tente limpar os filtros aplicados ou troque a região para ampliar a busca dentro do inventário.
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {typeof onClearFilters === 'function' ? (
              <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4" onClick={onClearFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}
            {typeof onChangeRegion === 'function' ? (
              <Button className="h-11 rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-900" onClick={onChangeRegion}>
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
    <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
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
