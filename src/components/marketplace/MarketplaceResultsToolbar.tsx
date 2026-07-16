import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { buildMarketplacePatchedSearchPath } from '../../lib/marketplaceFilters';
import type { MarketplaceSearchParams } from '../../types/marketplace';

type MarketplaceResultsToolbarProps = {
  params: MarketplaceSearchParams;
  activeFilterCount: number;
  onToggleFilters: () => void;
  filtersOpen: boolean;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MarketplaceResultsToolbar({
  params,
  activeFilterCount,
  onToggleFilters,
  filtersOpen,
}: MarketplaceResultsToolbarProps) {
  const navigate = useNavigation();
  const [location, setLocation] = useState(params.q || '');
  const [startDate, setStartDate] = useState(params.startDate || '');
  const [endDate, setEndDate] = useState(params.endDate || '');
  const [type, setType] = useState(params.type || '');
  const today = useMemo(() => toDateInputValue(new Date()), []);

  useEffect(() => {
    setLocation(params.q || '');
    setStartDate(params.startDate || '');
    setEndDate(params.endDate || '');
    setType(params.type || '');
  }, [params.endDate, params.q, params.startDate, params.type]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedStart = startDate || endDate;
    const normalizedEnd = endDate || startDate;
    navigate(buildMarketplacePatchedSearchPath(window.location.search, {
      q: location.trim() || null,
      startDate: normalizedStart || null,
      endDate: normalizedEnd || null,
      type: type || null,
      page: null,
    }, false));
  };

  return (
    <div className="marketplace-results-toolbar">
      <form className="marketplace-results-toolbar__search" role="search" onSubmit={submit}>
        <label className="marketplace-results-toolbar__field marketplace-results-toolbar__field--location">
          <MapPin aria-hidden="true" />
          <span className="marketplace-visually-hidden">Cidade, região ou ponto</span>
          <input
            type="search"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Pontos por perto"
          />
        </label>

        <label className="marketplace-results-toolbar__field marketplace-results-toolbar__field--dates">
          <CalendarDays aria-hidden="true" />
          <span className="marketplace-visually-hidden">Data inicial</span>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              if (endDate && value > endDate) setEndDate(value);
            }}
          />
          <span aria-hidden="true">–</span>
          <span className="marketplace-visually-hidden">Data final</span>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <label className="marketplace-results-toolbar__field marketplace-results-toolbar__field--type">
          <span className="marketplace-visually-hidden">Tipo de mídia</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            <option value="OOH">OOH</option>
            <option value="DOOH">DOOH</option>
          </select>
        </label>

        <button type="submit" className="marketplace-results-toolbar__submit" aria-label="Atualizar busca">
          <Search aria-hidden="true" />
        </button>
      </form>

      <button
        type="button"
        className={`marketplace-results-toolbar__filters${filtersOpen ? ' is-open' : ''}`}
        aria-expanded={filtersOpen}
        onClick={onToggleFilters}
      >
        <SlidersHorizontal aria-hidden="true" />
        Filtros
        {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
      </button>
    </div>
  );
}
