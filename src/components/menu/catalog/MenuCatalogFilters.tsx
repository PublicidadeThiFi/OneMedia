import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { MenuCatalogAvailabilityFilter, MenuCatalogSort } from '../../../lib/menuFlow';
import type { MenuCatalogOption } from '../../../lib/menuCatalogFilters';

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
  onSearchValueChange: (value: string) => void;
  onSearchSubmit: () => void;
  onTypeChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
  onDistrictChange: (value: string | null) => void;
  onEnvironmentChange: (value: string | null) => void;
  onAvailabilityChange: (value: MenuCatalogAvailabilityFilter) => void;
  onSortChange: (value: MenuCatalogSort) => void;
  onClearFilters: () => void;
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
  onSearchValueChange,
  onSearchSubmit,
  onTypeChange,
  onCityChange,
  onDistrictChange,
  onEnvironmentChange,
  onAvailabilityChange,
  onSortChange,
  onClearFilters,
}: MenuCatalogFiltersProps) {
  return (
    <Card className="rounded-[32px] border-slate-200 bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros de busca
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Refine a vitrine por busca, mídia, localização, ambiente, disponibilidade e ordenação para encontrar o melhor recorte.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}` : 'Catálogo unificado'}
            </div>
            <Button variant="outline" className="h-10 rounded-2xl border-slate-200 px-4" onClick={onClearFilters} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </div>

        <form
          className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(180px,1fr))] xl:grid-cols-[minmax(0,1.7fr)_repeat(6,minmax(0,1fr))]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder="Busca por nome, cidade, bairro..."
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-28 text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                className="absolute right-1.5 top-1.5 h-9 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-900"
                disabled={loading}
              >
                Buscar
              </Button>
            </div>
          </div>

          <Select value={asSelectValue(typeValue)} onValueChange={(value) => onTypeChange(resolveSelectValue(value))} disabled={loading}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
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
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
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
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
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
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
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
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
              <SelectValue placeholder="Todos os pontos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pontos</SelectItem>
              <SelectItem value="available">Disponíveis</SelectItem>
              <SelectItem value="partial">Parcialmente ocupados</SelectItem>
              <SelectItem value="occupied">Ocupados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortValue} onValueChange={(value) => onSortChange(value as MenuCatalogSort)} disabled={loading}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Ordenar por: Destaques</SelectItem>
              <SelectItem value="name-asc">Ordenar por: Nome (A-Z)</SelectItem>
              <SelectItem value="name-desc">Ordenar por: Nome (Z-A)</SelectItem>
              <SelectItem value="price-asc">Ordenar por: Menor preço</SelectItem>
              <SelectItem value="price-desc">Ordenar por: Maior preço</SelectItem>
              <SelectItem value="impressions-desc">Ordenar por: Impacto</SelectItem>
            </SelectContent>
          </Select>
        </form>
      </CardContent>
    </Card>
  );
}
