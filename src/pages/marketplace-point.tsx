import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Compass,
  Flag,
  Heart,
  Images,
  Layers3,
  MapPin,
  Maximize2,
  Monitor,
  MoveHorizontal,
  RefreshCw,
  Ruler,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { MarketplaceAvailabilityCalendar } from "../components/marketplace/MarketplaceAvailabilityCalendar";
import {
  MarketplaceBookingCard,
  type MarketplaceCampaignType,
} from "../components/marketplace/MarketplaceBookingCard";
import { MarketplaceGallery } from "../components/marketplace/MarketplaceGallery";
import { MarketplaceKnowMore } from "../components/marketplace/MarketplaceKnowMore";
import { MarketplaceLocationMap } from "../components/marketplace/MarketplaceLocationMap";
import { MarketplacePartnerCard } from "../components/marketplace/MarketplacePartnerCard";
import { MarketplaceReportDialog } from "../components/marketplace/MarketplaceReportDialog";
import { MarketplacePointCard } from "../components/marketplace/MarketplacePointCard";
import { MarketplaceShell } from "../components/marketplace/MarketplaceShell";
import { useMarketplaceAuth } from "../contexts/MarketplaceAuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { createMarketplaceCustomerInquiry } from "../lib/marketplaceAccountApi";
import {
  fetchMarketplaceAvailability,
  fetchMarketplaceNearby,
  fetchMarketplacePoint,
} from "../lib/marketplaceApi";
import {
  addMarketplaceDays,
  enumerateMarketplaceDates,
  formatMarketplaceDate,
  formatMarketplaceLongDate,
  parseMarketplaceDate,
  startOfMarketplaceToday,
  type MarketplaceDateRangeValue,
} from "../lib/marketplaceDates";
import { useMarketplaceFavorites } from "../lib/marketplaceFavorites";
import { getApiError } from "../lib/getApiError";
import { savePendingMarketplaceInquiry } from "../lib/marketplacePendingInquiry";
import { trackMarketplaceEventOnce } from "../lib/marketplaceEventTracking";
import type {
  MarketplaceAvailabilityResponse,
  MarketplaceAvailabilitySummary,
  MarketplaceNearbyResponse,
  MarketplacePointDetail,
  MarketplacePointHighlight,
} from "../types/marketplace";

type MarketplacePointPageProps = {
  slug: string;
};

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function readInitialRange(): MarketplaceDateRangeValue {
  const params = new URLSearchParams(window.location.search);
  const from = parseMarketplaceDate(params.get("startDate"));
  const to = parseMarketplaceDate(params.get("endDate"));
  if (from && to && from.getTime() > to.getTime())
    return { from: to, to: from };
  return { from, to };
}

function pointDisplayName(point: MarketplacePointDetail) {
  return (
    point.name ||
    [point.subcategory, point.location.district || point.location.city]
      .filter(Boolean)
      .join(" · ") ||
    "Ponto de mídia"
  );
}

function fullAddress(point: MarketplacePointDetail) {
  const street = [point.address.street, point.address.number]
    .filter(Boolean)
    .join(", ");
  return [
    street,
    point.address.district,
    point.address.city,
    point.address.state,
    point.address.country,
  ]
    .filter(Boolean)
    .join(" — ");
}

function normalizeOrientation(value: string | null | undefined) {
  if (!value) return "Não informado";
  const labels: Record<string, string> = {
    FLUXO: "Fluxo",
    CONTRA_FLUXO: "Contrafluxo",
    DUPLO_FLUXO: "Fluxo duplo",
    HORIZONTAL: "Horizontal",
    VERTICAL: "Vertical",
  };
  return (
    labels[value] ||
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

function defaultHighlights(
  point: MarketplacePointDetail,
): MarketplacePointHighlight[] {
  const items: MarketplacePointHighlight[] = [];
  if (point.dailyImpressions) {
    items.push({
      title: "Alto impacto diário",
      description: `Estimativa de ${point.dailyImpressions.toLocaleString("pt-BR")} pessoas impactadas por dia.`,
      icon: "users",
    });
  }
  if (point.location.city || point.location.district) {
    items.push({
      title: "Localização estratégica",
      description: `Ponto localizado em ${[point.location.district, point.location.city].filter(Boolean).join(", ")}.`,
      icon: "location",
    });
  }
  const unit = point.units[0];
  if (unit?.widthM && unit?.heightM) {
    items.push({
      title: "Formato de grande presença visual",
      description: `${unit.widthM} m × ${unit.heightM} m para campanhas com ampla exposição.`,
      icon: "format",
    });
  }
  items.push({
    title: "Planejamento flexível",
    description:
      "Consulte períodos bisemanais, mensais ou condições personalizadas.",
    icon: "calendar",
  });
  return items;
}

function highlightIcon(icon: string | null | undefined) {
  const key = String(icon || "").toLowerCase();
  if (key.includes("location") || key.includes("map")) return MapPin;
  if (key.includes("user") || key.includes("impact")) return Users;
  if (key.includes("format") || key.includes("dimension")) return Maximize2;
  if (key.includes("flow") || key.includes("traffic")) return MoveHorizontal;
  return Sparkles;
}

function MarketplacePointSkeleton() {
  return (
    <div
      className="marketplace-point-detail-skeleton"
      aria-label="Carregando detalhes do ponto"
    >
      <span className="marketplace-point-detail-skeleton__title" />
      <span className="marketplace-point-detail-skeleton__gallery" />
      <div className="marketplace-point-detail-skeleton__grid">
        <div>
          <span />
          <span />
          <span />
          <span />
        </div>
        <aside>
          <span />
          <span />
        </aside>
      </div>
    </div>
  );
}

export default function MarketplacePointPage({
  slug,
}: MarketplacePointPageProps) {
  const navigate = useNavigation();
  const { isAuthenticated, account } = useMarketplaceAuth();
  const { isFavorite, toggleFavorite } = useMarketplaceFavorites();
  const [detail, setDetail] = useState<MarketplacePointDetail | null>(null);
  const [calendarAvailability, setCalendarAvailability] =
    useState<MarketplaceAvailabilityResponse | null>(null);
  const [selectedAvailability, setSelectedAvailability] =
    useState<MarketplaceAvailabilitySummary | null>(null);
  const [nearby, setNearby] = useState<MarketplaceNearbyResponse | null>(null);
  const [selectedRange, setSelectedRange] =
    useState<MarketplaceDateRangeValue>(readInitialRange);
  const [campaignType, setCampaignType] = useState<MarketplaceCampaignType>("");
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  const calendarWindow = useMemo(() => {
    const startDate = startOfMarketplaceToday();
    return { startDate, endDate: addMarketplaceDays(startDate, 180) };
  }, []);

  const selectedKey = `${formatMarketplaceDate(selectedRange.from)}:${formatMarketplaceDate(selectedRange.to)}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMarketplacePoint(
      slug,
      {
        startDate: formatMarketplaceDate(selectedRange.from) || undefined,
        endDate: formatMarketplaceDate(selectedRange.to) || undefined,
      },
      controller.signal,
    )
      .then((response) => {
        setDetail(response);
        setSelectedAvailability(response.availability);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[marketplace] Falha ao carregar detalhe:", requestError);
        setError(
          "Não foi possível carregar este ponto de mídia. Ele pode não estar mais publicado.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // A disponibilidade selecionada é consultada separadamente, sem recarregar toda a página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, retryVersion]);

  useEffect(() => {
    const controller = new AbortController();
    setCalendarLoading(true);
    fetchMarketplaceAvailability(
      slug,
      {
        startDate: formatMarketplaceDate(calendarWindow.startDate),
        endDate: formatMarketplaceDate(calendarWindow.endDate),
      },
      controller.signal,
    )
      .then(setCalendarAvailability)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error(
          "[marketplace] Falha ao carregar calendário:",
          requestError,
        );
        setCalendarError(
          "Não foi possível carregar todo o calendário. Tente novamente em instantes.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCalendarLoading(false);
      });
    return () => controller.abort();
  }, [calendarWindow, retryVersion, slug]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMarketplaceNearby(
      slug,
      {
        startDate: formatMarketplaceDate(selectedRange.from) || undefined,
        endDate: formatMarketplaceDate(selectedRange.to) || undefined,
        radiusKm: 100,
        limit: 8,
      },
      controller.signal,
    )
      .then(setNearby)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted)
          console.error(
            "[marketplace] Falha ao carregar pontos próximos:",
            requestError,
          );
      });
    return () => controller.abort();
  }, [selectedKey, slug]);

  useEffect(() => {
    if (!selectedRange.from || !selectedRange.to) {
      setSelectedAvailability(detail?.availability || null);
      setAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);
    setCalendarError(null);
    fetchMarketplaceAvailability(
      slug,
      {
        startDate: formatMarketplaceDate(selectedRange.from),
        endDate: formatMarketplaceDate(selectedRange.to),
      },
      controller.signal,
    )
      .then((response) => {
        setSelectedAvailability(response);
        if (response.status === "OCCUPIED") {
          setCalendarError(
            "Este ponto está totalmente ocupado em pelo menos parte do período selecionado.",
          );
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error(
          "[marketplace] Falha ao verificar período:",
          requestError,
        );
        setCalendarError(
          "Não foi possível confirmar a disponibilidade deste período.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });
    return () => controller.abort();
  }, [
    detail?.availability,
    selectedKey,
    selectedRange.from,
    selectedRange.to,
    slug,
  ]);

  useEffect(() => {
    if (!detail) return;
    document.title =
      detail.seo?.title || `${pointDisplayName(detail)} | OneMedia`;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description && detail.seo?.description)
      description.content = detail.seo.description;
  }, [detail]);

  useEffect(() => {
    if (detail?.slug) trackMarketplaceEventOnce(detail.slug, "DETAIL_VIEW");
  }, [detail?.slug]);

  const updateRange = useCallback((range: MarketplaceDateRangeValue) => {
    setCalendarError(null);
    setActionMessage(null);
    setSelectedRange(range);
    const url = new URL(window.location.href);
    const start = formatMarketplaceDate(range.from);
    const end = formatMarketplaceDate(range.to);
    if (start) url.searchParams.set("startDate", start);
    else url.searchParams.delete("startDate");
    if (end) url.searchParams.set("endDate", end);
    else url.searchParams.delete("endDate");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  const handleCampaignType = (value: MarketplaceCampaignType) => {
    setCampaignType(value);
    setActionMessage(null);
    if (!selectedRange.from || value === "ON_REQUEST" || !value) return;
    const days = value === "BIWEEKLY" ? 14 : 29;
    updateRange({
      from: selectedRange.from,
      to: addMarketplaceDays(selectedRange.from, days),
    });
  };

  const handleShare = async () => {
    if (!detail) return;
    const shareData = {
      title: detail.seo?.title || pointDisplayName(detail),
      text:
        detail.description.short || "Confira este ponto de mídia na OneMedia.",
      url: detail.seo?.canonicalUrl || window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage("Link copiado");
        window.setTimeout(() => setShareMessage(null), 2500);
      }
      trackMarketplaceEventOnce(detail.slug, "SHARE");
    } catch (shareError) {
      if ((shareError as DOMException)?.name !== "AbortError")
        setShareMessage("Não foi possível compartilhar");
    }
  };

  const handleFavorite = () => {
    const wasFavorite = isFavorite(detail.slug);
    toggleFavorite(detail.slug);
    if (!wasFavorite) trackMarketplaceEventOnce(detail.slug, "FAVORITE");
  };

  const handleRequest = async () => {
    if (!selectedRange.from || !selectedRange.to || !campaignType) {
      setActionMessage("Selecione o período e o tipo de campanha.");
      return;
    }
    if (selectedAvailability?.status === "OCCUPIED") {
      setActionMessage("O ponto está ocupado no período escolhido.");
      return;
    }

    const returnUrl = `${window.location.pathname}${window.location.search}`;
    const inquiry = {
      slug: detail.slug,
      startDate: formatMarketplaceDate(selectedRange.from),
      endDate: formatMarketplaceDate(selectedRange.to),
      campaignType:
        campaignType === "ON_REQUEST" ? ("CUSTOM" as const) : campaignType,
      returnUrl,
    };

    if (!isAuthenticated) {
      savePendingMarketplaceInquiry(inquiry);
      navigate(
        `/marketplace/cadastro?intent=inquiry&returnUrl=${encodeURIComponent(returnUrl)}&campaignType=${campaignType}`,
      );
      return;
    }

    try {
      setActionMessage("Enviando solicitação…");
      await createMarketplaceCustomerInquiry({
        slug: inquiry.slug,
        startDate: inquiry.startDate,
        endDate: inquiry.endDate,
        campaignType: inquiry.campaignType,
      });
      navigate("/marketplace/solicitacoes?enviada=1");
    } catch (requestError) {
      setActionMessage(
        getApiError(
          requestError,
          "Não foi possível enviar a solicitação. Tente novamente.",
        ).message,
      );
    }
  };

  const handleMessage = () => {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    if (isAuthenticated) {
      navigate(
        `/marketplace/mensagens?point=${encodeURIComponent(detail.slug)}`,
      );
      return;
    }
    navigate(
      `/marketplace/cadastro?intent=message&returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  const occupiedSet = useMemo(
    () =>
      new Set(
        (calendarAvailability?.days || [])
          .filter((day) => day.status === "OCCUPIED")
          .map((day) => day.date),
      ),
    [calendarAvailability?.days],
  );

  const rangeIncludesOccupiedDay = useMemo(() => {
    if (!selectedRange.from || !selectedRange.to) return false;
    return enumerateMarketplaceDates(selectedRange.from, selectedRange.to).some(
      (date) => occupiedSet.has(formatMarketplaceDate(date)),
    );
  }, [occupiedSet, selectedRange.from, selectedRange.to]);

  useEffect(() => {
    if (rangeIncludesOccupiedDay)
      setCalendarError(
        "O período selecionado contém um ou mais dias totalmente ocupados.",
      );
  }, [rangeIncludesOccupiedDay]);

  if (loading && !detail) {
    return (
      <MarketplaceShell pageTitle="Detalhes do ponto">
        <div className="marketplace-container">
          <MarketplacePointSkeleton />
        </div>
      </MarketplaceShell>
    );
  }

  if (error || !detail) {
    return (
      <MarketplaceShell pageTitle="Ponto não encontrado">
        <section className="marketplace-point-detail-state" role="alert">
          <AlertCircle aria-hidden="true" />
          <h1>Não conseguimos abrir este ponto</h1>
          <p>{error || "O ponto solicitado não está disponível."}</p>
          <div>
            <button
              type="button"
              className="marketplace-button"
              onClick={() => navigate("/buscar")}
            >
              <ArrowLeft aria-hidden="true" /> Voltar para a busca
            </button>
            <button
              type="button"
              className="marketplace-button marketplace-button--primary"
              onClick={() => setRetryVersion((version) => version + 1)}
            >
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        </section>
      </MarketplaceShell>
    );
  }

  const title = pointDisplayName(detail);
  const address =
    fullAddress(detail) || "Localização informada pelo responsável do ponto.";
  const primaryUnit = detail.units[0] || null;
  const dimensions =
    primaryUnit?.widthM && primaryUnit?.heightM
      ? `${primaryUnit.widthM} m × ${primaryUnit.heightM} m`
      : "Sob consulta";
  const highlights = detail.highlights.length
    ? detail.highlights
    : defaultHighlights(detail);
  const campaignUseCases = detail.campaignUseCases.length
    ? detail.campaignUseCases
    : [
        "Reconhecimento de marca",
        "Lançamento de produto ou serviço",
        "Campanhas promocionais",
        "Varejo local",
      ];
  const currentAvailability = selectedAvailability || detail.availability;
  const favorite = isFavorite(detail.slug);

  return (
    <MarketplaceShell pageTitle={title}>
      <article className="marketplace-point-detail">
        <div className="marketplace-container">
          <div className="marketplace-point-detail__topline">
            <button
              type="button"
              onClick={() => navigate("/buscar")}
              className="marketplace-point-detail__back"
            >
              <ArrowLeft aria-hidden="true" /> Voltar
            </button>
            <div className="marketplace-point-detail__actions">
              <button type="button" onClick={handleShare}>
                <Share2 aria-hidden="true" /> Compartilhar
              </button>
              <button
                type="button"
                className={favorite ? "is-active" : ""}
                onClick={handleFavorite}
                aria-pressed={favorite}
              >
                <Heart
                  aria-hidden="true"
                  fill={favorite ? "currentColor" : "none"}
                />{" "}
                {favorite ? "Salvo" : "Salvar"}
              </button>
              {shareMessage && <span role="status">{shareMessage}</span>}
            </div>
          </div>

          <header className="marketplace-point-detail__header">
            <p>
              {[
                detail.type === "DOOH" ? "DOOH Digital" : "OOH Estático",
                detail.subcategory,
                detail.location.city,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h1>{title}</h1>
          </header>

          <MarketplaceGallery items={detail.gallery} pointName={title} />

          <div className="marketplace-point-detail__core-grid">
            <div className="marketplace-point-detail__content">
              <section className="marketplace-point-detail__intro">
                <p className="marketplace-point-detail__lead">
                  {detail.description.short}
                </p>
                <div className="marketplace-point-detail__specs">
                  <div>
                    <Layers3 aria-hidden="true" />
                    <span>
                      <strong>Categoria</strong>
                      {detail.subcategory || detail.type}
                    </span>
                  </div>
                  <div>
                    <Monitor aria-hidden="true" />
                    <span>
                      <strong>Tipo de mídia</strong>
                      {detail.type === "DOOH" ? "DOOH Digital" : "OOH Estático"}
                    </span>
                  </div>
                  <div>
                    <Ruler aria-hidden="true" />
                    <span>
                      <strong>Dimensão</strong>
                      {dimensions}
                    </span>
                  </div>
                  <div>
                    <Compass aria-hidden="true" />
                    <span>
                      <strong>Orientação</strong>
                      {normalizeOrientation(primaryUnit?.orientation)}
                    </span>
                  </div>
                  <div>
                    <Users aria-hidden="true" />
                    <span>
                      <strong>Impacto diário</strong>
                      {detail.dailyImpressions
                        ? `${compactNumber.format(detail.dailyImpressions)} pessoas`
                        : "Sob consulta"}
                    </span>
                  </div>
                  <div
                    className={`marketplace-point-detail__status marketplace-point-detail__status--${currentAvailability.status.toLowerCase()}`}
                  >
                    <Check aria-hidden="true" />
                    <span>
                      <strong>Status</strong>
                      {currentAvailability.label}
                    </span>
                  </div>
                </div>
              </section>

              <section className="marketplace-point-detail__section">
                <h2>Por que anunciar neste ponto?</h2>
                <div className="marketplace-point-detail__highlights">
                  {highlights.map((highlight, index) => {
                    const Icon = highlightIcon(highlight.icon);
                    return (
                      <article key={`${highlight.title}-${index}`}>
                        <Icon aria-hidden="true" />
                        <div>
                          <h3>{highlight.title}</h3>
                          {highlight.description && (
                            <p>{highlight.description}</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="marketplace-point-detail__section marketplace-point-detail__about">
                <h2>Sobre este ponto de mídia</h2>
                <p>{detail.description.long || detail.description.short}</p>
                <h3>Ideal para campanhas de:</h3>
                <ul>
                  {campaignUseCases.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" /> {item}
                    </li>
                  ))}
                </ul>
              </section>

              <MarketplaceAvailabilityCalendar
                days={calendarAvailability?.days || []}
                selectedRange={selectedRange}
                loading={calendarLoading}
                error={calendarError}
                onRangeChange={updateRange}
                onInvalidRange={setCalendarError}
              />
            </div>

            <aside className="marketplace-point-detail__aside">
              <div className="marketplace-point-detail__sticky">
                <MarketplaceBookingCard
                  priceBiweekly={detail.price.amount}
                  priceMonthly={detail.price.monthlyAmount}
                  selectedRange={selectedRange}
                  campaignType={campaignType}
                  availability={currentAvailability}
                  availabilityLoading={availabilityLoading}
                  message={actionMessage}
                  onRangeChange={updateRange}
                  onCampaignTypeChange={handleCampaignType}
                  onRequest={handleRequest}
                />
                <button
                  type="button"
                  className="marketplace-point-detail__report"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag aria-hidden="true" /> Denunciar este anúncio
                </button>
                <MarketplacePartnerCard
                  partner={detail.partner}
                  onMessage={handleMessage}
                />
              </div>
            </aside>
          </div>

          <section className="marketplace-point-detail__location">
            <div className="marketplace-detail-section-heading">
              <div>
                <span className="marketplace-detail-section-heading__icon">
                  <MapPin aria-hidden="true" />
                </span>
                <div>
                  <h2>Onde o ponto está localizado</h2>
                  <p>{address}</p>
                </div>
              </div>
            </div>
            <MarketplaceLocationMap
              latitude={detail.coordinates.latitude}
              longitude={detail.coordinates.longitude}
              title={title}
              address={address}
            />
            <p className="marketplace-point-detail__location-note">
              A localização foi informada pelo proprietário do ponto e pode
              passar por validação da OneMedia.
            </p>
          </section>

          <MarketplaceKnowMore />
        </div>

        <section className="marketplace-point-detail__nearby">
          <div className="marketplace-container">
            <div className="marketplace-detail-section-heading">
              <div>
                <span className="marketplace-detail-section-heading__icon">
                  <Images aria-hidden="true" />
                </span>
                <div>
                  <h2>Outros pontos disponíveis na região</h2>
                  <p>Compare alternativas próximas ao endereço deste ponto.</p>
                </div>
              </div>
            </div>
            {nearby?.items.length ? (
              <div className="marketplace-point-detail__nearby-list">
                {nearby.items.map((point) => (
                  <MarketplacePointCard key={point.id} point={point} />
                ))}
              </div>
            ) : (
              <p className="marketplace-point-detail__nearby-empty">
                Ainda não há outros pontos publicados próximos a esta
                localização.
              </p>
            )}
          </div>
        </section>
        <MarketplaceReportDialog
          open={reportOpen}
          slug={detail.slug}
          pointName={title}
          initialEmail={account?.email}
          onClose={() => setReportOpen(false)}
        />
      </article>
    </MarketplaceShell>
  );
}
