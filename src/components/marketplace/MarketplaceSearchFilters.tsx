import { FormEvent, useEffect, useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import type {
  MarketplaceFilterMetadata,
  MarketplaceSearchParams,
} from "../../types/marketplace";

type FilterPatch = Record<string, string | number | null | undefined>;

type MarketplaceSearchFiltersProps = {
  open: boolean;
  params: MarketplaceSearchParams;
  metadata?: MarketplaceFilterMetadata | null;
  onClose: () => void;
  onApply: (patch: FilterPatch) => void;
  onClear: () => void;
};

export function MarketplaceSearchFilters({
  open,
  params,
  metadata,
  onClose,
  onApply,
  onClear,
}: MarketplaceSearchFiltersProps) {
  const [state, setState] = useState(params.state || "");
  const [city, setCity] = useState(params.city || "");
  const [subcategory, setSubcategory] = useState(params.subcategory || "");
  const [environment, setEnvironment] = useState(params.environment || "");
  const [availability, setAvailability] = useState(params.availability || "");
  const [sort, setSort] = useState(params.sort || "featured");
  const [minPrice, setMinPrice] = useState(params.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(params.maxPrice?.toString() || "");

  useEffect(() => {
    setState(params.state || "");
    setCity(params.city || "");
    setSubcategory(params.subcategory || "");
    setEnvironment(params.environment || "");
    setAvailability(params.availability || "");
    setSort(params.sort || "featured");
    setMinPrice(params.minPrice?.toString() || "");
    setMaxPrice(params.maxPrice?.toString() || "");
  }, [params]);

  const cities = useMemo(() => {
    if (!state) return metadata?.cities ?? [];
    return (
      metadata?.citiesByState.find((entry) => entry.state === state)?.cities ??
      []
    );
  }, [metadata, state]);

  useEffect(() => {
    if (city && cities.length > 0 && !cities.includes(city)) setCity("");
  }, [cities, city]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let normalizedMin = minPrice === "" ? null : Number(minPrice);
    let normalizedMax = maxPrice === "" ? null : Number(maxPrice);
    if (
      normalizedMin != null &&
      normalizedMax != null &&
      normalizedMin > normalizedMax
    ) {
      [normalizedMin, normalizedMax] = [normalizedMax, normalizedMin];
    }
    onApply({
      state: state || null,
      city: city || null,
      subcategory: subcategory || null,
      environment: environment || null,
      availability: availability || null,
      sort: sort === "featured" ? null : sort,
      minPrice: normalizedMin,
      maxPrice: normalizedMax,
    });
  };

  return (
    <div
      className="marketplace-search-filters"
      role="region"
      aria-label="Filtros avançados"
    >
      <form onSubmit={submit}>
        <div className="marketplace-search-filters__heading">
          <div>
            <strong>Refine sua busca</strong>
            <span>Escolha localização, formato, preço e disponibilidade.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar filtros">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="marketplace-search-filters__grid">
          <label>
            <span>Estado</span>
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              <option value="">Todos os estados</option>
              {(metadata?.states ?? []).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Cidade</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">Todas as cidades</option>
              {cities.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Formato</span>
            <select
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
            >
              <option value="">Todos os formatos</option>
              {(metadata?.subcategories ?? []).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Ambiente</span>
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              <option value="">Todos os ambientes</option>
              {(metadata?.environments ?? []).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Disponibilidade</span>
            <select
              value={availability}
              onChange={(event) =>
                setAvailability(
                  event.target.value as "" | "available" | "occupied",
                )
              }
            >
              <option value="">Todos</option>
              <option value="available">Disponíveis no período</option>
              <option value="occupied">Ocupados no período</option>
            </select>
          </label>

          <label>
            <span>Ordenar por</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="featured">Destaques</option>
              <option value="popular">Mais procurados</option>
              <option value="newest">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="impact_desc">Maior impacto</option>
            </select>
          </label>

          <label>
            <span>Preço mínimo / 15 dias</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder={
                metadata?.priceRange.min != null
                  ? String(Math.floor(metadata.priceRange.min))
                  : "R$ 0"
              }
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </label>

          <label>
            <span>Preço máximo / 15 dias</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder={
                metadata?.priceRange.max != null
                  ? String(Math.ceil(metadata.priceRange.max))
                  : "Sem limite"
              }
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </label>
        </div>

        <div className="marketplace-search-filters__actions">
          <button
            type="button"
            className="marketplace-search-filters__clear"
            onClick={onClear}
          >
            <RotateCcw aria-hidden="true" /> Limpar filtros
          </button>
          <button
            type="submit"
            className="marketplace-button marketplace-button--primary"
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    </div>
  );
}
