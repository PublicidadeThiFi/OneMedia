import { Search, SlidersHorizontal, X } from 'lucide-react';
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
    <Card className="rounded-[28px] border-[#d7e0ec] bg-[#eef2f7] shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-[#5f83c2]" />
                Filtros de Busca
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-slate-300 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onClearFilters}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          </div>

          <form
            className="grid gap-2.5 lg:grid-cols-[minmax(0,1.35fr)_repeat(5,minmax(0,1fr))]"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <div className="lg:col-span-1">
              <div className="relative flex gap-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchValue}
                  onChange={(event) => onSearchValueChange(event.target.value)}
                  placeholder="Busca por nome, cidade..."
                  className="h-11 rounded-[16px] border-slate-300 bg-white pl-11 pr-4 text-sm shadow-none placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <Select value={asSelectValue(typeValue)} onValueChange={(value) => onTypeChange(resolveSelectValue(value))} disabled={loading}>
              <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
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
              <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
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
              <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
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

            <Select value={asSelectValue(environmentValue)} onValueChange={(value) => onEnvironmentChange(resolveSelectValue(value))} disabled={loading}>
              <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
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
              <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
                <SelectValue placeholder="Todos os pontos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pontos</SelectItem>
                <SelectItem value="available">Disponíveis</SelectItem>
                <SelectItem value="partial">Parciais</SelectItem>
                <SelectItem value="occupied">Ocupados</SelectItem>
              </SelectContent>
            </Select>
          </form>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">Ordenar por:</span>
              <div className="w-full max-w-[260px]">
                <Select value={sortValue} onValueChange={(value) => onSortChange(value as MenuCatalogSort)} disabled={loading}>
                  <SelectTrigger className="h-11 rounded-[16px] border-slate-300 bg-white text-left shadow-none">
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

            <Button type="button" className="h-11 rounded-[16px] bg-slate-950 px-4 text-white hover:bg-slate-900 lg:hidden" onClick={onSearchSubmit} disabled={loading}>
              Buscar
            </Button>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="text-[1.1rem] font-semibold text-slate-950 sm:text-[1.35rem]">
              Mostrando {filteredPoints} de {totalPoints} veículos.
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-700">
              <span className="font-medium">{totalUnits} telas/faces</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium">{totalImpressionsLabel} impacto total</span>
              <span className="text-slate-300">•</span>
              <span>{occupiedCount} Ocupados</span>
              {partialCount > 0 ? (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{partialCount} Parciais</span>
                </>
              ) : null}
              <span className="text-slate-300">|</span>
              <span>{availableCount} Disponíveis</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeFilters.length > 0 ? (
                activeFilters.map((filter) => (
                  <button key={`${filter.key}-${filter.label}`} type="button" onClick={() => onRemoveFilter(filter.key)} className="group">
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:text-sm">
                      {filter.label}
                      <X className="ml-2 h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
                    </span>
                  </button>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:text-sm">
                  Sem filtros adicionais
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
