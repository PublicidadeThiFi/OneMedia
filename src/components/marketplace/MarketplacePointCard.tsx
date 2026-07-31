import { FocusEvent, MouseEvent } from "react";
import { toast } from "sonner";
import { Heart, ImageOff } from "lucide-react";
import { useNavigation } from "../../contexts/NavigationContext";
import { resolveUploadsUrl } from "../../lib/format";
import { useMarketplaceFavorites } from "../../lib/marketplaceFavorites";
import { trackMarketplaceEventOnce } from "../../lib/marketplaceEventTracking";
import type { MarketplacePointCardData } from "../../types/marketplace";

type MarketplacePointCardProps = {
  point: MarketplacePointCardData;
  active?: boolean;
  onActivate?: (slug: string) => void;
  onDeactivate?: (slug: string) => void;
  onOpen?: (slug: string) => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

function formatNextAvailability(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormatter.format(date).replace(".", "");
}

function cardTitle(point: MarketplacePointCardData) {
  const format =
    point.subcategory ||
    (point.type === "DOOH" ? "DOOH Digital" : "OOH Estático");
  const local = point.location.district || point.location.city;
  return [format, local].filter(Boolean).join(" · ");
}

export function MarketplacePointCard({
  point,
  active = false,
  onActivate,
  onDeactivate,
  onOpen,
}: MarketplacePointCardProps) {
  const navigate = useNavigation();
  const { isFavorite, toggleFavorite } = useMarketplaceFavorites();
  const favorite = isFavorite(point.slug);
  const coverUrl =
    resolveUploadsUrl(point.cover?.url) || point.cover?.url || null;
  const nextAvailability = formatNextAvailability(
    point.availability.nextAvailableAt,
  );
  const accessibleName = point.name || cardTitle(point);

  const openPoint = () => {
    if (onOpen) onOpen(point.slug);
    else navigate(`/pontos/${encodeURIComponent(point.slug)}`);
  };

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const wasFavorite = isFavorite(point.slug);
    toggleFavorite(point.slug);
    toast.success(
      wasFavorite ? "Removido dos favoritos." : "Adicionado aos favoritos.",
    );
    if (!wasFavorite) trackMarketplaceEventOnce(point.slug, "FAVORITE");
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null))
      return;
    onDeactivate?.(point.slug);
  };

  return (
    <article
      className={`marketplace-point-card${active ? " is-active" : ""}`}
      onMouseEnter={() => onActivate?.(point.slug)}
      onMouseLeave={() => onDeactivate?.(point.slug)}
      onFocusCapture={() => onActivate?.(point.slug)}
      onBlurCapture={handleBlur}
      data-marketplace-point={point.slug}
    >
      <div className="marketplace-point-card__media">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={accessibleName}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="marketplace-point-card__media-empty"
            aria-label="Imagem indisponível"
          >
            <ImageOff aria-hidden="true" />
          </div>
        )}

        <span
          className={`marketplace-point-card__status marketplace-point-card__status--${point.availability.status.toLowerCase()}`}
        >
          {point.availability.isAvailable
            ? point.availability.status === "PARTIAL"
              ? "Disponibilidade parcial"
              : "Disponível"
            : nextAvailability
              ? `Disponível em ${nextAvailability}`
              : "Ocupado"}
        </span>

        <button
          type="button"
          className={`marketplace-point-card__favorite${favorite ? " is-active" : ""}`}
          aria-label={
            favorite ? "Remover dos favoritos" : "Salvar nos favoritos"
          }
          aria-pressed={favorite}
          onClick={handleFavorite}
        >
          <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="marketplace-point-card__body">
        <h3>{cardTitle(point)}</h3>
        <p className="marketplace-point-card__name">
          {point.name || point.shortDescription}
        </p>
        <p className="marketplace-point-card__location">
          {[point.location.city, point.location.state]
            .filter(Boolean)
            .join(" - ") || "Localização disponível no detalhe"}
        </p>
        <p className="marketplace-point-card__price">
          <span>A partir de:</span>
          <strong>{currencyFormatter.format(point.price.amount)}</strong>
          <small> / 15 dias</small>
        </p>
      </div>

      <button
        type="button"
        className="marketplace-point-card__open"
        onClick={openPoint}
        aria-label={`Ver detalhes de ${accessibleName}`}
      />
    </article>
  );
}
