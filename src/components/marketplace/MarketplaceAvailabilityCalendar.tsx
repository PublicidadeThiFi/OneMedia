import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarDays, CircleAlert, LoaderCircle } from "lucide-react";
import {
  enumerateMarketplaceDates,
  formatMarketplaceDate,
  formatMarketplaceDateRange,
  parseMarketplaceDate,
  startOfMarketplaceToday,
  type MarketplaceDateRangeValue,
} from "../../lib/marketplaceDates";
import type { MarketplaceAvailabilityDay } from "../../types/marketplace";

type MarketplaceAvailabilityCalendarProps = {
  days: MarketplaceAvailabilityDay[];
  selectedRange: MarketplaceDateRangeValue;
  loading?: boolean;
  error?: string | null;
  onRangeChange: (range: MarketplaceDateRangeValue) => void;
  onInvalidRange: (message: string) => void;
};

export function MarketplaceAvailabilityCalendar({
  days,
  selectedRange,
  loading = false,
  error,
  onRangeChange,
  onInvalidRange,
}: MarketplaceAvailabilityCalendarProps) {
  const [monthsToShow, setMonthsToShow] = useState(2);
  const today = useMemo(() => startOfMarketplaceToday(), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setMonthsToShow(media.matches ? 1 : 2);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  const occupiedDates = useMemo(
    () =>
      days
        .filter((day) => day.status === "OCCUPIED")
        .map((day) => parseMarketplaceDate(day.date))
        .filter((date): date is Date => !!date),
    [days],
  );
  const partialDates = useMemo(
    () =>
      days
        .filter((day) => day.status === "PARTIAL")
        .map((day) => parseMarketplaceDate(day.date))
        .filter((date): date is Date => !!date),
    [days],
  );
  const occupiedSet = useMemo(
    () => new Set(occupiedDates.map(formatMarketplaceDate)),
    [occupiedDates],
  );

  const selected: DateRange | undefined = selectedRange.from
    ? { from: selectedRange.from, to: selectedRange.to || undefined }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onRangeChange({ from: null, to: null });
      return;
    }

    if (range.to) {
      const blocked = enumerateMarketplaceDates(range.from, range.to).find(
        (date) => occupiedSet.has(formatMarketplaceDate(date)),
      );
      if (blocked) {
        onRangeChange({ from: range.from, to: null });
        onInvalidRange(
          "O período escolhido inclui um dia totalmente ocupado. Selecione outra data.",
        );
        return;
      }
    }

    onRangeChange({ from: range.from, to: range.to || null });
  };

  return (
    <section className="marketplace-availability" id="disponibilidade">
      <div className="marketplace-detail-section-heading">
        <div>
          <span className="marketplace-detail-section-heading__icon">
            <CalendarDays aria-hidden="true" />
          </span>
          <div>
            <h2>Disponibilidade para campanha</h2>
            <p>{formatMarketplaceDateRange(selectedRange)}</p>
          </div>
        </div>
        <div
          className="marketplace-availability__legend"
          aria-label="Legenda do calendário"
        >
          <span>
            <i className="is-free" /> Livre
          </span>
          <span>
            <i className="is-partial" /> Parcial
          </span>
          <span>
            <i className="is-occupied" /> Ocupado
          </span>
        </div>
      </div>

      {loading && !days.length ? (
        <div className="marketplace-availability__loading" role="status">
          <LoaderCircle aria-hidden="true" /> Carregando disponibilidade…
        </div>
      ) : (
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={monthsToShow}
          pagedNavigation
          fromMonth={today}
          defaultMonth={selectedRange.from || today}
          weekStartsOn={0}
          disabled={[
            { before: today },
            (date) => occupiedSet.has(formatMarketplaceDate(date)),
          ]}
          modifiers={{ occupied: occupiedDates, partial: partialDates }}
          className="marketplace-availability-calendar"
          classNames={{
            months: "marketplace-availability-calendar__months",
            month: "marketplace-availability-calendar__month",
            caption: "marketplace-availability-calendar__caption",
            caption_label: "marketplace-availability-calendar__caption-label",
            nav: "marketplace-availability-calendar__nav",
            nav_button: "marketplace-availability-calendar__nav-button",
            nav_button_previous:
              "marketplace-availability-calendar__nav-button--previous",
            nav_button_next:
              "marketplace-availability-calendar__nav-button--next",
            table: "marketplace-availability-calendar__table",
            head_row: "marketplace-availability-calendar__head-row",
            head_cell: "marketplace-availability-calendar__head-cell",
            row: "marketplace-availability-calendar__row",
            cell: "marketplace-availability-calendar__cell",
            day: "marketplace-availability-calendar__day",
            day_today: "is-today",
            day_selected: "is-selected",
            day_range_start: "is-range-start",
            day_range_end: "is-range-end",
            day_range_middle: "is-range-middle",
            day_outside: "is-outside",
            day_disabled: "is-disabled",
          }}
          modifiersClassNames={{
            occupied: "is-occupied",
            partial: "is-partial",
          }}
        />
      )}

      {error && (
        <p className="marketplace-availability__error" role="alert">
          <CircleAlert aria-hidden="true" /> {error}
        </p>
      )}
      <button
        type="button"
        className="marketplace-availability__clear"
        onClick={() => onRangeChange({ from: null, to: null })}
      >
        Limpar datas
      </button>
    </section>
  );
}
