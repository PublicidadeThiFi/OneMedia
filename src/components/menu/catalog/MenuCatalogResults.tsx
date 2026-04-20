import { X } from 'lucide-react';
import { Badge } from '../../ui/badge';
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
    <section className="rounded-[28px] border border-[#d6e2f3] bg-white/90 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-xl font-semibold tracking-tight text-slate-950">
            Mostrando {filteredPoints} de {totalPoints} veículos.
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{totalUnits} telas/faces</span>
            <span className="text-slate-300">•</span>
            <span>{totalImpressionsLabel} impacto total</span>
            <span className="text-slate-300">•</span>
            <span>{occupiedCount} ocupados</span>
            <span className="text-slate-300">|</span>
            <span>{availableCount} disponíveis</span>
            {partialCount > 0 ? (
              <>
                <span className="text-slate-300">|</span>
                <span>{partialCount} parciais</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <button key={filter.label} type="button" onClick={() => onRemoveFilter(filter.key)} className="group">
                <Badge className="rounded-full border border-[#d6e2f3] bg-[#f5f8fd] px-3 py-1.5 text-slate-700 hover:bg-[#edf3fb]">
                  {filter.label}
                  <X className="ml-2 h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
                </Badge>
              </button>
            ))
          ) : (
            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">
              Todos os pontos visíveis
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}
