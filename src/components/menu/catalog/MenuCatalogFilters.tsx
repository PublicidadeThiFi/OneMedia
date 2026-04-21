import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../../ui/button';
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
    <div className="menu-catalog-filters-card">
      <div className="menu-catalog-filters-head">
        <div className="menu-catalog-filters-title">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros de Busca</span>
        </div>
        <Button type="button" variant="outline" className="menu-catalog-clear-btn" onClick={onClearFilters} disabled={loading}>
          <X className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
      </div>

      <form
        className="menu-catalog-filters-grid"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <div className="menu-catalog-filter-search">
          <Search className="h-4 w-4" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder="Busca por nome, cidade..."
            className="menu-catalog-filter-input"
            disabled={loading}
          />
        </div>

        <Select value={asSelectValue(typeValue)} onValueChange={(value) => onTypeChange(resolveSelectValue(value))} disabled={loading}>
          <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Tipo de mídia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tipo de mídia</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{buildOptionLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={asSelectValue(cityValue)} onValueChange={(value) => onCityChange(resolveSelectValue(value))} disabled={loading}>
          <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Cidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Cidades</SelectItem>
            {cityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{buildOptionLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={asSelectValue(districtValue)} onValueChange={(value) => onDistrictChange(resolveSelectValue(value))} disabled={loading}>
          <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Bairros" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Bairros</SelectItem>
            {districtOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{buildOptionLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={asSelectValue(environmentValue)} onValueChange={(value) => onEnvironmentChange(resolveSelectValue(value))} disabled={loading}>
          <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Ambientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Ambientes</SelectItem>
            {environmentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{buildOptionLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>

      <div className="menu-catalog-toolbar">
        <div className="menu-catalog-availability">
          <Select value={availabilityValue} onValueChange={(value) => onAvailabilityChange(value as MenuCatalogAvailabilityFilter)} disabled={loading}>
            <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Todos os pontos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pontos</SelectItem>
              <SelectItem value="available">Disponíveis</SelectItem>
              <SelectItem value="partial">Parciais</SelectItem>
              <SelectItem value="occupied">Ocupados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="menu-catalog-sort">
          <span className="menu-catalog-sort-label">Ordenar por:</span>
          <Select value={sortValue} onValueChange={(value) => onSortChange(value as MenuCatalogSort)} disabled={loading}>
            <SelectTrigger className="menu-catalog-filter-control"><SelectValue placeholder="Nome (A-Z)" /></SelectTrigger>
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

      <div className="menu-catalog-summary">
        <h3>Mostrando {filteredPoints} de {totalPoints} veículos.</h3>
        <div className="meta">
          <span><strong>{totalUnits}</strong> telas/faces</span>
          <span>•</span>
          <span><strong>{totalImpressionsLabel}</strong> impacto total</span>
          <span>•</span>
          <span>{occupiedCount} Ocupados</span>
          {partialCount > 0 ? <><span>|</span><span>{partialCount} Parciais</span></> : null}
          <span>|</span>
          <span>{availableCount} Disponíveis</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <button key={`${filter.key}-${filter.label}`} type="button" onClick={() => onRemoveFilter(filter.key)} className="group">
                <span className="menu-catalog-filter-chip">
                  {filter.label}
                  <X className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
                </span>
              </button>
            ))
          ) : (
            <span className="menu-catalog-filter-chip menu-catalog-filter-chip--empty">Sem filtros adicionais</span>
          )}
        </div>
      </div>
    </div>
  );
}
