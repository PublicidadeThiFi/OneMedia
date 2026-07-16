import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { buildMarketplaceSearchPath } from '../../lib/marketplaceApi';
import type { MarketplaceFilterMetadata } from '../../types/marketplace';

type MarketplaceSearchBarProps = {
  filters?: MarketplaceFilterMetadata | null;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MarketplaceSearchBar({ filters }: MarketplaceSearchBarProps) {
  const navigate = useNavigation();
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('');
  const today = useMemo(() => toDateInputValue(new Date()), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedStart = startDate || endDate;
    const normalizedEnd = endDate || startDate;
    navigate(buildMarketplaceSearchPath({
      q: location.trim(),
      startDate: normalizedStart,
      endDate: normalizedEnd,
      type,
    }));
  };

  return (
    <form className="marketplace-search-bar" role="search" aria-label="Buscar pontos de mídia" onSubmit={submit}>
      <label className="marketplace-search-bar__field marketplace-search-bar__field--location">
        <MapPin aria-hidden="true" />
        <span>
          <strong>Onde</strong>
          <input
            type="search"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Busque por cidade ou região"
            list="marketplace-location-options"
          />
        </span>
      </label>

      <datalist id="marketplace-location-options">
        {(filters?.cities ?? []).map((city) => <option key={city} value={city} />)}
        {(filters?.states ?? []).map((state) => <option key={state} value={state} />)}
      </datalist>

      <div className="marketplace-search-bar__field marketplace-search-bar__field--period">
        <CalendarDays aria-hidden="true" />
        <span>
          <strong>Período</strong>
          <span className="marketplace-search-bar__dates">
            <label>
              <span className="marketplace-visually-hidden">Data inicial</span>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  if (endDate && endDate < value) setEndDate(value);
                }}
              />
            </label>
            <span aria-hidden="true">–</span>
            <label>
              <span className="marketplace-visually-hidden">Data final</span>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </span>
        </span>
      </div>

      <label className="marketplace-search-bar__field marketplace-search-bar__field--type">
        <SlidersHorizontal aria-hidden="true" />
        <span>
          <strong>Filtros</strong>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos os formatos</option>
            <option value="OOH">OOH estático</option>
            <option value="DOOH">DOOH digital</option>
          </select>
        </span>
      </label>

      <button className="marketplace-search-bar__submit" type="submit" aria-label="Buscar pontos de mídia">
        <Search aria-hidden="true" />
      </button>
    </form>
  );
}
