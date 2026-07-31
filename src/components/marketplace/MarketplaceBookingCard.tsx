import {
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  formatMarketplaceDate,
  formatMarketplaceDateRange,
  parseMarketplaceDate,
  type MarketplaceDateRangeValue,
} from "../../lib/marketplaceDates";
import {
  getMarketplaceCampaignDurationDays,
  normalizeMarketplaceCampaignRange,
  type MarketplaceCampaignType,
} from "../../lib/marketplaceCampaigns";
import type {
  MarketplaceAvailabilitySummary,
  MarketplaceAvailabilityStatus,
} from "../../types/marketplace";

type MarketplaceBookingCardProps = {
  priceBiweekly: number;
  priceMonthly: number | null;
  selectedRange: MarketplaceDateRangeValue;
  campaignType: MarketplaceCampaignType;
  availability: Pick<
    MarketplaceAvailabilitySummary,
    "status" | "label" | "isAvailable"
  > | null;
  availabilityLoading?: boolean;
  message?: string | null;
  onRangeChange: (range: MarketplaceDateRangeValue) => void;
  onCampaignTypeChange: (value: MarketplaceCampaignType) => void;
  onRequest: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function statusClass(status: MarketplaceAvailabilityStatus | undefined) {
  return status ? status.toLowerCase() : "unknown";
}

export function MarketplaceBookingCard({
  priceBiweekly,
  priceMonthly,
  selectedRange,
  campaignType,
  availability,
  availabilityLoading = false,
  message,
  onRangeChange,
  onCampaignTypeChange,
  onRequest,
}: MarketplaceBookingCardProps) {
  const fixedDurationDays =
    getMarketplaceCampaignDurationDays(campaignType);
  const fixedCampaign = fixedDurationDays !== null;

  const setDate = (field: "from" | "to", value: string) => {
    if (field === "to" && fixedCampaign) return;

    const date = parseMarketplaceDate(value);
    const next = { ...selectedRange, [field]: date };
    if (next.from && next.to && next.from.getTime() > next.to.getTime()) {
      if (field === "from") next.to = date;
      else next.from = date;
    }
    onRangeChange(normalizeMarketplaceCampaignRange(next, campaignType));
  };

  const ready = Boolean(selectedRange.from && selectedRange.to && campaignType);

  return (
    <div className="marketplace-booking-card">
      <div className="marketplace-booking-card__price">
        {priceMonthly ? (
          <>
            <span>Valor mensal</span>
            <strong>{currencyFormatter.format(priceMonthly)}</strong>
          </>
        ) : (
          <>
            <span>A partir de</span>
            <strong>{currencyFormatter.format(priceBiweekly)}</strong>
          </>
        )}
        <small>
          Valor bisemanal: {currencyFormatter.format(priceBiweekly)}
        </small>
      </div>

      <div
        className={`marketplace-booking-card__status marketplace-booking-card__status--${statusClass(availability?.status)}`}
      >
        {availabilityLoading ? (
          <LoaderCircle aria-hidden="true" />
        ) : (
          <CheckCircle2 aria-hidden="true" />
        )}
        <span>
          {availabilityLoading
            ? "Verificando período…"
            : availability?.label || "Selecione um período"}
        </span>
      </div>

      <fieldset className="marketplace-booking-card__fieldset">
        <legend>Período da campanha</legend>
        <div className="marketplace-booking-card__date-summary">
          <CalendarDays aria-hidden="true" />
          <span>{formatMarketplaceDateRange(selectedRange)}</span>
        </div>
        <div className="marketplace-booking-card__dates">
          <label>
            <span>Início</span>
            <input
              type="date"
              value={formatMarketplaceDate(selectedRange.from)}
              min={formatMarketplaceDate(new Date())}
              onChange={(event) => setDate("from", event.target.value)}
            />
          </label>
          <label>
            <span>Fim</span>
            <input
              type="date"
              value={formatMarketplaceDate(selectedRange.to)}
              min={formatMarketplaceDate(selectedRange.from || new Date())}
              disabled={fixedCampaign}
              aria-readonly={fixedCampaign}
              title={
                fixedCampaign
                  ? "A data final é calculada automaticamente."
                  : undefined
              }
              onChange={(event) => setDate("to", event.target.value)}
            />
          </label>
        </div>
        {fixedCampaign && (
          <small className="marketplace-booking-card__duration-note">
            A data final é calculada automaticamente para uma campanha de{" "}
            {fixedDurationDays} dias.
          </small>
        )}
      </fieldset>

      <label className="marketplace-booking-card__field">
        <span>Tipo de campanha</span>
        <select
          value={campaignType}
          onChange={(event) =>
            onCampaignTypeChange(event.target.value as MarketplaceCampaignType)
          }
        >
          <option value="">Selecione o tipo</option>
          <option value="BIWEEKLY">Bisemanal — 15 dias</option>
          <option value="MONTHLY">Mensal — 30 dias</option>
          <option value="ON_REQUEST">Sob consulta</option>
        </select>
      </label>

      <button
        type="button"
        className="marketplace-button marketplace-button--primary marketplace-booking-card__submit"
        disabled={
          !ready || availabilityLoading || availability?.status === "OCCUPIED"
        }
        onClick={onRequest}
      >
        <CalendarDays aria-hidden="true" /> Solicitar reserva
      </button>

      {message && (
        <p className="marketplace-booking-card__message" role="status">
          {message}
        </p>
      )}

      <p className="marketplace-booking-card__notice">
        <ShieldCheck aria-hidden="true" />
        <span>
          Você ainda não será cobrado. A solicitação será enviada para
          confirmação de disponibilidade e condições comerciais.
        </span>
      </p>
    </div>
  );
}
