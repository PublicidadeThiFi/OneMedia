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
  onClearFilters?: () => void;
  onChangeRegion?: () => void;
};

export function MenuCatalogGrid({
  points,
  loading,
  isAgency,
  markupPercent,
  onOpenDetail,
  onClearFilters,
  onChangeRegion,
}: MenuCatalogGridProps) {
  if (loading && points.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse overflow-hidden rounded-[30px] border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <div className="aspect-[16/9] w-full bg-slate-200" />
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-14 rounded-[18px] bg-slate-100" />
                <div className="h-14 rounded-[18px] bg-slate-100" />
              </div>
              <div className="h-4 w-5/6 rounded bg-slate-200" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-24 rounded-[22px] bg-slate-100" />
                <div className="h-24 rounded-[22px] bg-slate-100" />
                <div className="h-24 rounded-[22px] bg-slate-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-[22px] bg-slate-100" />
                <div className="h-24 rounded-[22px] bg-slate-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-[22px] bg-slate-100" />
                <div className="h-24 rounded-[22px] bg-slate-100" />
              </div>
              <div className="h-11 rounded-2xl bg-slate-200" />
            </CardContent>
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

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {points.map((point) => (
        <MenuCatalogCard
          key={point.id}
          point={point}
          isAgency={isAgency}
          markupPercent={markupPercent}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}
