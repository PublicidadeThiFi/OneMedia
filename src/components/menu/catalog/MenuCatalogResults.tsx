import { X } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import type { MenuCatalogActiveFilter } from '../../../lib/menuCatalogFilters';

type MenuCatalogResultsProps = {
  totalPoints: number;
  filteredPoints: number;
  totalUnits: number;
  totalImpressionsLabel: string;
  availableCount: number;
  partialCount: number;
  occupiedCount: number;
  activeFilters: MenuCatalogActiveFilter[];
  onRemoveFilter: (key: MenuCatalogActiveFilter['key']) => void;
};

export function MenuCatalogResults({
  totalPoints,
  filteredPoints,
  totalUnits,
  totalImpressionsLabel,
  availableCount,
  partialCount,
  occupiedCount,
  activeFilters,
  onRemoveFilter,
}: MenuCatalogResultsProps) {
  return (
    <Card className="rounded-[32px] border-slate-200 bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <CardContent className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo de resultados</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Mostrando {filteredPoints} de {totalPoints} veículos.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>{totalUnits} telas/faces</span>
              <span>•</span>
              <span>{totalImpressionsLabel} impacto total</span>
              <span>•</span>
              <span>
                {occupiedCount} ocupados | {availableCount} disponíveis{partialCount > 0 ? ` | ${partialCount} parciais` : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <button key={filter.label} type="button" onClick={() => onRemoveFilter(filter.key)} className="group">
                  <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                    {filter.label}
                    <X className="ml-2 h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
                  </Badge>
                </button>
              ))
            ) : (
              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">
                Sem filtros adicionais
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
