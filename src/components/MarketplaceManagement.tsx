import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileWarning,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { resolveUploadsUrl } from "../lib/format";
import {
  fetchMarketplaceModerationProfiles,
  fetchMarketplaceModerationReports,
  updateMarketplaceModerationProfile,
  updateMarketplaceModerationReport,
} from "../lib/marketplaceModerationApi";
import type {
  MarketplaceModerationProfileItem,
  MarketplaceModerationReportItem,
  MarketplacePointHighlight,
  MarketplacePointPublicationStatus,
  MarketplaceReportStatus,
} from "../types/marketplace";

const publicationLabels: Record<MarketplacePointPublicationStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  SUSPENDED: "Suspenso",
};

const reportStatusLabels: Record<MarketplaceReportStatus, string> = {
  OPEN: "Aberta",
  REVIEWING: "Em análise",
  RESOLVED: "Resolvida",
  DISMISSED: "Descartada",
};

const reasonLabels: Record<string, string> = {
  INACCURATE_INFORMATION: "Informações incorretas",
  UNAVAILABLE: "Ponto indisponível ou inexistente",
  DUPLICATE: "Anúncio duplicado",
  INAPPROPRIATE_CONTENT: "Conteúdo impróprio",
  FRAUD_OR_SCAM: "Suspeita de fraude ou golpe",
  OTHER: "Outro motivo",
};

function errorMessage(error: unknown) {
  const data = (error as any)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "object" && message?.message) return message.message;
  return String(message || "Não foi possível concluir a ação.");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function highlightLines(items: MarketplacePointHighlight[]) {
  return items
    .map((item) =>
      [item.title, item.description || "", item.icon || ""].join(" | "),
    )
    .join("\n");
}

function parseHighlightLines(value: string): MarketplacePointHighlight[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const [title, description, icon] = line
        .split("|")
        .map((part) => part.trim());
      return {
        title: title || "Diferencial",
        description: description || null,
        icon: icon || null,
      };
    });
}

function ProfileEditor({
  item,
  onSaved,
}: {
  item: MarketplaceModerationProfileItem;
  onSaved: (item: MarketplaceModerationProfileItem) => void;
}) {
  const [status, setStatus] = useState<MarketplacePointPublicationStatus>(
    item.profile?.status || "DRAFT",
  );
  const [shortDescription, setShortDescription] = useState(
    item.profile?.shortDescription || "",
  );
  const [longDescription, setLongDescription] = useState(
    item.profile?.longDescription || "",
  );
  const [featuredRank, setFeaturedRank] = useState(
    item.profile?.featuredRank || 0,
  );
  const [verified, setVerified] = useState(Boolean(item.profile?.verifiedAt));
  const [campaigns, setCampaigns] = useState(
    (item.profile?.campaignUseCases || []).join("\n"),
  );
  const [highlights, setHighlights] = useState(
    highlightLines(item.profile?.highlights || []),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(item.profile?.status || "DRAFT");
    setShortDescription(item.profile?.shortDescription || "");
    setLongDescription(item.profile?.longDescription || "");
    setFeaturedRank(item.profile?.featuredRank || 0);
    setVerified(Boolean(item.profile?.verifiedAt));
    setCampaigns((item.profile?.campaignUseCases || []).join("\n"));
    setHighlights(highlightLines(item.profile?.highlights || []));
  }, [item]);

  const save = async () => {
    try {
      setSaving(true);
      const updated = await updateMarketplaceModerationProfile(
        item.mediaPointId,
        {
          status,
          shortDescription,
          longDescription,
          featuredRank,
          verified,
          campaignUseCases: campaigns
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          highlights: parseHighlightLines(highlights),
        },
      );
      onSaved(updated);
      toast.success("Conteúdo do marketplace atualizado.");
    } catch (error) {
      const missing = (error as any)?.response?.data?.missing;
      toast.error(
        Array.isArray(missing) && missing.length
          ? `Pendências: ${missing.join(", ")}`
          : errorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Edição pública</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">
            {item.point.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {[item.point.city, item.point.state].filter(Boolean).join(" - ") ||
              "Localização não informada"}
          </p>
        </div>
        {item.profile?.slug ? (
          <a
            href={`/pontos/${encodeURIComponent(item.profile.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Eye className="h-4 w-4" /> Ver página
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            Popularidade — 30 dias
          </p>
          <p className="mt-1 text-2xl font-semibold text-indigo-950">
            {item.metrics.popularityScore}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Denúncias abertas
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">
            {item.metrics.openReports}
          </p>
        </div>
        <div
          className={`rounded-xl p-3 ${
            item.readiness.isReady ? "bg-emerald-50" : "bg-red-50"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-700">
            Prontidão
          </p>
          <p className="mt-1 font-semibold text-gray-950">
            {item.readiness.isReady ? "Pronto para publicar" : "Com pendências"}
          </p>
        </div>
      </div>

      {!item.readiness.isReady ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Pendências:</strong> {item.readiness.missing.join(", ")}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Status da publicação
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as MarketplacePointPublicationStatus)
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
          >
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="SUSPENDED">Suspenso</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Prioridade nos destaques
          <input
            type="number"
            min={0}
            max={10000}
            value={featuredRank}
            onChange={(event) =>
              setFeaturedRank(Number(event.target.value || 0))
            }
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-1 text-sm font-medium text-gray-700">
        Descrição curta
        <textarea
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
        />
      </label>

      <label className="mt-4 block space-y-1 text-sm font-medium text-gray-700">
        Descrição completa
        <textarea
          value={longDescription}
          onChange={(event) => setLongDescription(event.target.value)}
          maxLength={6000}
          rows={6}
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
        />
      </label>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Campanhas recomendadas — uma por linha
          <textarea
            value={campaigns}
            onChange={(event) => setCampaigns(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Diferenciais — Título | Descrição | ícone
          <textarea
            value={highlights}
            onChange={(event) => setHighlights(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
          />
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={verified}
          onChange={(event) => setVerified(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
        Marcar conteúdo como revisado pela empresa
      </label>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar conteúdo
        </button>
      </div>
    </section>
  );
}

export function MarketplaceManagement() {
  const [tab, setTab] = useState<"profiles" | "reports">("profiles");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [profileStatus, setProfileStatus] = useState<
    MarketplacePointPublicationStatus | ""
  >("");
  const [reportStatus, setReportStatus] = useState<
    MarketplaceReportStatus | ""
  >("");
  const [profiles, setProfiles] = useState<MarketplaceModerationProfileItem[]>(
    [],
  );
  const [reports, setReports] = useState<MarketplaceModerationReportItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [companyEnabled, setCompanyEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(
    () => setPage(1),
    [debouncedQuery, profileStatus, reportStatus, tab],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const request =
      tab === "profiles"
        ? fetchMarketplaceModerationProfiles(
            {
              q: debouncedQuery || undefined,
              status: profileStatus,
              page,
              pageSize: 20,
            },
            controller.signal,
          ).then((response) => {
            setProfiles(response.items);
            setCompanyEnabled(response.company.marketplaceEnabled);
            setTotal(response.pagination.total);
            setTotalPages(response.pagination.totalPages || 1);
            setSelectedProfileId((current) =>
              response.items.some((item) => item.mediaPointId === current)
                ? current
                : response.items[0]?.mediaPointId || null,
            );
          })
        : fetchMarketplaceModerationReports(
            {
              q: debouncedQuery || undefined,
              status: reportStatus,
              page,
              pageSize: 20,
            },
            controller.signal,
          ).then((response) => {
            setReports(response.items);
            setTotal(response.pagination.total);
            setTotalPages(response.pagination.totalPages || 1);
          });

    request
      .catch((error) => {
        if ((error as any)?.code !== "ERR_CANCELED")
          toast.error(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, page, profileStatus, refreshVersion, reportStatus, tab]);

  const refresh = useCallback(
    () => setRefreshVersion((version) => version + 1),
    [],
  );

  const selectedProfile = useMemo(
    () =>
      profiles.find((item) => item.mediaPointId === selectedProfileId) || null,
    [profiles, selectedProfileId],
  );

  const saveProfile = (updated: MarketplaceModerationProfileItem) => {
    setProfiles((items) =>
      items.map((item) =>
        item.mediaPointId === updated.mediaPointId ? updated : item,
      ),
    );
  };

  const reviewReport = async (
    report: MarketplaceModerationReportItem,
    status: MarketplaceReportStatus,
    suspendPoint = false,
  ) => {
    const note = window.prompt(
      suspendPoint
        ? "Informe o motivo da suspensão do anúncio:"
        : "Observação da análise (opcional):",
      report.resolutionNote || "",
    );
    if (note === null) return;
    if (suspendPoint && !note.trim()) {
      toast.error("Informe o motivo da suspensão.");
      return;
    }
    try {
      setActionId(report.id);
      const updated = await updateMarketplaceModerationReport(report.id, {
        status,
        resolutionNote: note.trim() || undefined,
        suspendPoint,
      });
      setReports((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        suspendPoint
          ? "Anúncio suspenso e denúncia atualizada."
          : "Denúncia atualizada.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Marketplace OneMedia
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950">
              Publicação e moderação
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Controle o conteúdo público, a ordem dos destaques e as denúncias
              recebidas.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </header>

        {!companyEnabled && tab === "profiles" ? (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <strong>Marketplace desabilitado para a empresa.</strong>
              <p className="mt-1">
                Os perfis podem ser preparados, mas nenhum ponto será público
                enquanto a habilitação global estiver desligada.
              </p>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setTab("profiles")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === "profiles"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <Store className="h-4 w-4" /> Conteúdo e publicação
              </button>
              <button
                type="button"
                onClick={() => setTab("reports")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === "reports"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <ShieldAlert className="h-4 w-4" /> Denúncias
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    tab === "profiles"
                      ? "Buscar ponto, cidade ou slug"
                      : "Buscar denúncia ou ponto"
                  }
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              {tab === "profiles" ? (
                <select
                  value={profileStatus}
                  onChange={(event) =>
                    setProfileStatus(
                      event.target.value as
                        | MarketplacePointPublicationStatus
                        | "",
                    )
                  }
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Todos os status</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="SUSPENDED">Suspenso</option>
                </select>
              ) : (
                <select
                  value={reportStatus}
                  onChange={(event) =>
                    setReportStatus(
                      event.target.value as MarketplaceReportStatus | "",
                    )
                  }
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Todos os status</option>
                  <option value="OPEN">Abertas</option>
                  <option value="REVIEWING">Em análise</option>
                  <option value="RESOLVED">Resolvidas</option>
                  <option value="DISMISSED">Descartadas</option>
                </select>
              )}
              <span className="text-sm text-gray-500">{total} registros</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : tab === "profiles" ? (
          profiles.length ? (
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="space-y-3">
                {profiles.map((item) => {
                  const selected = item.mediaPointId === selectedProfileId;
                  return (
                    <button
                      key={item.mediaPointId}
                      type="button"
                      onClick={() => setSelectedProfileId(item.mediaPointId)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                        selected
                          ? "border-indigo-400 ring-2 ring-indigo-100"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-16 overflow-hidden rounded-lg bg-gray-100">
                          {item.point.mainImageUrl ? (
                            <img
                              src={resolveUploadsUrl(item.point.mainImageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-950">
                            {item.point.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {publicationLabels[item.profile?.status || "DRAFT"]}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
                              <BarChart3 className="h-3 w-3" />{" "}
                              {item.metrics.popularityScore}
                            </span>
                            {item.metrics.openReports ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                                <FileWarning className="h-3 w-3" />{" "}
                                {item.metrics.openReports}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                                item.readiness.isReady
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {item.readiness.isReady ? (
                                <BadgeCheck className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {item.readiness.isReady ? "Pronto" : "Pendente"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>
              {selectedProfile ? (
                <ProfileEditor item={selectedProfile} onSaved={saveProfile} />
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
              Nenhum ponto encontrado.
            </div>
          )
        ) : reports.length ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {report.point.imageUrl ? (
                        <img
                          src={resolveUploadsUrl(report.point.imageUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-950">
                          {report.point.name}
                        </h2>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {reportStatusLabels[report.status]}
                        </span>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">
                          {reasonLabels[report.reason] || report.reason}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Recebida em {formatDate(report.createdAt)}
                        {report.email ? ` · ${report.email}` : ""}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                        {report.details ||
                          "Nenhum detalhe adicional informado."}
                      </p>
                      {report.resolutionNote ? (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                          <strong>Nota da análise:</strong>{" "}
                          {report.resolutionNote}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-[440px] lg:justify-end">
                    {report.point.slug ? (
                      <a
                        href={`/pontos/${encodeURIComponent(report.point.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" /> Ver anúncio
                      </a>
                    ) : null}
                    {report.status !== "REVIEWING" ? (
                      <button
                        type="button"
                        disabled={actionId === report.id}
                        onClick={() => reviewReport(report, "REVIEWING")}
                        className="rounded-xl border border-amber-300 px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Iniciar análise
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={actionId === report.id}
                      onClick={() => reviewReport(report, "RESOLVED")}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Resolver
                    </button>
                    <button
                      type="button"
                      disabled={actionId === report.id}
                      onClick={() => reviewReport(report, "DISMISSED")}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                    {report.point.status === "PUBLISHED" ? (
                      <button
                        type="button"
                        disabled={actionId === report.id}
                        onClick={() => reviewReport(report, "RESOLVED", true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-4 w-4" /> Suspender anúncio
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Nenhuma denúncia encontrada.
          </div>
        )}

        {totalPages > 1 ? (
          <footer className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 p-2 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 p-2 disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
