import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { MenuCatalogAvailabilityFilter, MenuCatalogSort } from '../../../lib/menuFlow';
import type { MenuCatalogActiveFilter, MenuCatalogOption } from '../../../lib/menuCatalogFilters';

const ALL_VALUE = '__all__';

type MenuCatalogFiltersProps = {
  searchValue: string;
  typeValue: string | null;
  cityValue: string | null;
  districtValue: string | null;
  environmentValue: string | null;
  availabilityValue: MenuCatalogAvailabilityFilter;
  sortValue: MenuCatalogSort;
  typeOptions: MenuCatalogOption[];
  cityOptions: MenuCatalogOption[];
  districtOptions: MenuCatalogOption[];
  environmentOptions: MenuCatalogOption[];
  loading: boolean;
  activeFiltersCount: number;
  totalPoints: number;
  filteredPoints: number;
  totalUnits: number;
  totalImpressionsLabel: string;
  availableCount: number;
  partialCount: number;
  occupiedCount: number;
  activeFilters: MenuCatalogActiveFilter[];
  onSearchValueChange: (value: string) => void;
  onSearchSubmit: () => void;
  onTypeChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
  onDistrictChange: (value: string | null) => void;
  onEnvironmentChange: (value: string | null) => void;
  onAvailabilityChange: (value: MenuCatalogAvailabilityFilter) => void;
  onSortChange: (value: MenuCatalogSort) => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: MenuCatalogActiveFilter['key']) => void;
};

function asSelectValue(value: string | null | undefined): string {
  return value && String(value).trim() ? String(value) : ALL_VALUE;
}

function resolveSelectValue(value: string): string | null {
  return value === ALL_VALUE ? null : value;
}

function buildOptionLabel(option: MenuCatalogOption): string {
  return `${option.label} (${option.count})`;
}

export function MenuCatalogFilters({
  searchValue,
  typeValue,
  cityValue,
  districtValue,
  environmentValue,
  availabilityValue,
  sortValue,
  typeOptions,
  cityOptions,
  districtOptions,
  environmentOptions,
  loading,
  activeFiltersCount,
  totalPoints,
  filteredPoints,
  totalUnits,
  totalImpressionsLabel,
  availableCount,
  partialCount,
  occupiedCount,
  activeFilters,
  onSearchValueChange,
  onSearchSubmit,
  onTypeChange,
  onCityChange,
  onDistrictChange,
  onEnvironmentChange,
  onAvailabilityChange,
  onSortChange,
  onClearFilters,
  onRemoveFilter,
}: MenuCatalogFiltersProps) {
  return (
    <Card className="rounded-[28px] border-[#d6e2f3] bg-[#edf3fb] shadow-[0_18px_46px_rgba(15,23,42,0.05)] sm:rounded-[30px]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros de Busca
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Busque por nome, região, ambiente, disponibilidade e ordenação para navegar pelo cardápio com mais rapidez.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}`
                  : 'Mostrando todo o catálogo'}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-white/80 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white"
                onClick={onClearFilters}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </div>

          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <div className="relative flex flex-col gap-3 sm:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchValue}
                  onChange={(event) => onSearchValueChange(event.target.value)}
                  placeholder="Busca por nome, cidade..."
                  className="h-12 rounded-full border-white bg-white pl-11 pr-4 text-sm shadow-sm placeholder:text-slate-400 sm:pr-28"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-slate-950 px-4 text-white hover:bg-slate-900 sm:absolute sm:right-1.5 sm:top-1.5 sm:h-9 sm:w-auto"
                  disabled={loading}
                >
                  Buscar
                </Button>
              </div>
            </div>

            <Select value={asSelectValue(typeValue)} onValueChange={(value) => onTypeChange(resolveSelectValue(value))} disabled={loading}>
              <SelectTrigger className="h-12 rounded-full border-white bg-white text-left shadow-sm">
                <SelectValue placeholder="Tipo de mídia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Tipo de mídia</SelectItem>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {buildOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={asSelectValue(cityValue)} onValueChange={(value) => onCityChange(resolveSelectValue(value))} disabled={loading}>
              <SelectTrigger className="h-12 rounded-full border-white bg-white text-left shadow-sm">
                <SelectValue placeholder="Cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Cidades</SelectItem>
                {cityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {buildOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={asSelectValue(districtValue)} onValueChange={(value) => onDistrictChange(resolveSelectValue(value))} disabled={loading}>
              <SelectTrigger className="h-12 rounded-full border-white bg-white text-left shadow-sm">
                <SelectValue placeholder="Bairros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Bairros</SelectItem>
                {districtOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {buildOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={asSelectValue(environmentValue)}
              onValueChange={(value) => onEnvironmentChange(resolveSelectValue(value))}
              disabled={loading}
            >
              <SelectTrigger className="h-12 rounded-full border-white bg-white text-left shadow-sm">
                <SelectValue placeholder="Ambientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Ambientes</SelectItem>
                {environmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {buildOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={availabilityValue} onValueChange={(value) => onAvailabilityChange(value as MenuCatalogAvailabilityFilter)} disabled={loading}>
              <SelectTrigger className="h-12 rounded-full border-white bg-white text-left shadow-sm">
                <SelectValue placeholder="Todos os pontos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pontos</SelectItem>
                <SelectItem value="available">Disponíveis</SelectItem>
                <SelectItem value="partial">Parcialmente ocupados</SelectItem>
                <SelectItem value="occupied">Ocupados</SelectItem>
              </SelectContent>
            </Select>

            <div className="xl:col-span-full">
              <div className="flex flex-col gap-2 rounded-[24px] border border-white/80 bg-white/75 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ordenar por</div>
                <div className="sm:w-full sm:max-w-[280px]">
                  <Select value={sortValue} onValueChange={(value) => onSortChange(value as MenuCatalogSort)} disabled={loading}>
                    <SelectTrigger className="h-11 rounded-full border-slate-200 bg-white text-left shadow-none">
                      <SelectValue placeholder="Nome (A-Z)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Destaques</SelectItem>
                      <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                      <SelectItem value="price-asc">Menor preço</SelectItem>
                      <SelectItem value="price-desc">Maior preço</SelectItem>
                      <SelectItem value="impressions-desc">Impacto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </form>

          <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.35rem]">
                  Mostrando {filteredPoints} de {totalPoints} veículos.
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
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
                    <button key={`${filter.key}-${filter.label}`} type="button" onClick={() => onRemoveFilter(filter.key)} className="group">
                      <span className="inline-flex items-center rounded-full border border-[#d6e2f3] bg-[#f5f8fd] px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-[#edf3fb] sm:text-sm">
                        {filter.label}
                        <X className="ml-2 h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:text-sm">
                    Todos os pontos visíveis
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
