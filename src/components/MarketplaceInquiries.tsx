import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigation } from "../contexts/NavigationContext";
import { resolveUploadsUrl } from "../lib/format";
import {
  convertMarketplaceOperatorInquiry,
  fetchMarketplaceOperatorInquiries,
  updateMarketplaceOperatorInquiryStatus,
} from "../lib/marketplaceInquiriesApi";
import type {
  MarketplaceInquiryOperatorItem,
  MarketplaceInquiryStatus,
} from "../types/marketplace";

const statusOptions: Array<{
  value: MarketplaceInquiryStatus | "";
  label: string;
}> = [
  { value: "", label: "Todos os status" },
  { value: "SUBMITTED", label: "Enviadas" },
  { value: "UNDER_REVIEW", label: "Em análise" },
  { value: "CONTACTED", label: "Contato realizado" },
  { value: "CONVERTED", label: "Convertidas" },
  { value: "REJECTED", label: "Recusadas" },
  { value: "CANCELED", label: "Canceladas" },
  { value: "CLOSED", label: "Encerradas" },
];

const statusClasses: Record<MarketplaceInquiryStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  CONTACTED: "bg-violet-50 text-violet-700 border-violet-200",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELED: "bg-gray-100 text-gray-700 border-gray-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function campaignLabel(value: string) {
  if (value === "BIWEEKLY") return "Bisemanal";
  if (value === "MONTHLY") return "Mensal";
  return "Sob consulta";
}

function errorMessage(error: unknown) {
  const responseMessage = (error as any)?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  return String(responseMessage || "Não foi possível concluir a ação.");
}

export function MarketplaceInquiries() {
  const navigate = useNavigation();
  const [items, setItems] = useState<MarketplaceInquiryOperatorItem[]>([]);
  const [selected, setSelected] =
    useState<MarketplaceInquiryOperatorItem | null>(null);
  const [status, setStatus] = useState<MarketplaceInquiryStatus | "">("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => setPage(1), [status, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchMarketplaceOperatorInquiries(
      { status, q: debouncedQuery || undefined, page, pageSize: 20 },
      controller.signal,
    )
      .then((response) => {
        setItems(response.items);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages || 1);
        setSelected((current) => {
          if (!current) return response.items[0] || null;
          return (
            response.items.find((item) => item.id === current.id) ||
            response.items[0] ||
            null
          );
        });
      })
      .catch((error) => {
        if ((error as any)?.code === "ERR_CANCELED") return;
        toast.error(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, page, refreshVersion, status]);

  const refresh = useCallback(
    () => setRefreshVersion((value) => value + 1),
    [],
  );

  const performStatus = async (
    item: MarketplaceInquiryOperatorItem,
    nextStatus: "UNDER_REVIEW" | "CONTACTED" | "REJECTED" | "CLOSED",
  ) => {
    let reason: string | undefined;
    if (nextStatus === "REJECTED") {
      const input = window.prompt("Informe o motivo da recusa (opcional):", "");
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setActionId(item.id);
    try {
      const updated = await updateMarketplaceOperatorInquiryStatus(
        item.id,
        nextStatus,
        reason,
      );
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setSelected(updated);
      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const performConversion = async (item: MarketplaceInquiryOperatorItem) => {
    const confirmed = window.confirm(
      "Criar um cliente e uma proposta em rascunho para esta solicitação? Nenhuma reserva será criada agora.",
    );
    if (!confirmed) return;
    setActionId(item.id);
    try {
      const updated = await convertMarketplaceOperatorInquiry(item.id);
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setSelected(updated);
      toast.success("Solicitação convertida em proposta rascunho.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const summary = useMemo(
    () => `${total} ${total === 1 ? "solicitação" : "solicitações"}`,
    [total],
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Marketplace OneMedia
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950">
              Solicitações recebidas
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Analise interessados, atualize o atendimento e converta
              oportunidades em propostas.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Atualizar
          </button>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por cliente, e-mail, ponto ou cidade"
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as MarketplaceInquiryStatus | "")
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="whitespace-nowrap text-sm text-gray-500">
                {summary}
              </span>
            </div>
          </div>
        </section>

        <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-[480px] items-center justify-center text-sm text-gray-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />{" "}
                Carregando solicitações…
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
                <MessageSquareText className="h-10 w-10 text-gray-300" />
                <h2 className="mt-3 text-lg font-semibold text-gray-900">
                  Nenhuma solicitação encontrada
                </h2>
                <p className="mt-1 max-w-md text-sm text-gray-500">
                  Quando um anunciante enviar uma solicitação por um ponto
                  publicado, ela aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const active = selected?.id === item.id;
                  const image =
                    resolveUploadsUrl(item.point.coverUrl) ||
                    item.point.coverUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`flex w-full gap-4 p-4 text-left transition ${active ? "bg-indigo-50/70" : "hover:bg-gray-50"}`}
                    >
                      <div className="h-20 w-24 flex-none overflow-hidden rounded-xl bg-gray-100">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <MapPin className="m-auto mt-7 h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-950">
                              {item.point.name}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-gray-600">
                              {item.customer.name} · {item.customer.email}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[item.status]}`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>
                            {formatDate(item.startDate)} —{" "}
                            {formatDate(item.endDate)}
                          </span>
                          <span>{campaignLabel(item.campaignType)}</span>
                          <span>
                            {item.point.city || "Cidade não informada"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <footer className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={page >= totalPages || loading}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {!selected ? (
              <div className="flex min-h-[480px] items-center justify-center px-6 text-center text-sm text-gray-500">
                Selecione uma solicitação para ver os detalhes.
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[selected.status]}`}
                    >
                      {selected.statusLabel}
                    </span>
                    <h2 className="mt-3 text-xl font-semibold text-gray-950">
                      {selected.point.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />{" "}
                      {[selected.point.city, selected.point.state]
                        .filter(Boolean)
                        .join(" — ") || "Localização não informada"}
                    </p>
                  </div>
                  {selected.point.slug && (
                    <button
                      type="button"
                      onClick={() => navigate(`/pontos/${selected.point.slug}`)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                      title="Abrir anúncio"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-gray-400" />
                    <span>
                      <strong className="block text-gray-900">Período</strong>
                      {formatDate(selected.startDate)} a{" "}
                      {formatDate(selected.endDate)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Send className="mt-0.5 h-4 w-4 text-gray-400" />
                    <span>
                      <strong className="block text-gray-900">Campanha</strong>
                      {campaignLabel(selected.campaignType)}
                    </span>
                  </div>
                </div>

                <section className="space-y-2 border-t border-gray-100 pt-4">
                  <h3 className="font-semibold text-gray-900">Anunciante</h3>
                  <p className="flex items-center gap-2 text-sm text-gray-700">
                    <UserRound className="h-4 w-4 text-gray-400" />{" "}
                    {selected.customer.name}
                  </p>
                  <a
                    href={`mailto:${selected.customer.email}`}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                  >
                    <Mail className="h-4 w-4" /> {selected.customer.email}
                  </a>
                  <a
                    href={`tel:${selected.customer.phone}`}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                  >
                    <Phone className="h-4 w-4" /> {selected.customer.phone}
                  </a>
                </section>

                {selected.notes && (
                  <section className="border-t border-gray-100 pt-4">
                    <h3 className="font-semibold text-gray-900">Observações</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {selected.notes}
                    </p>
                  </section>
                )}

                {selected.conversion.proposal && (
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div>
                        <h3 className="font-semibold text-emerald-900">
                          Proposta criada
                        </h3>
                        <p className="mt-1 text-sm text-emerald-800">
                          {selected.conversion.proposal.title ||
                            "Proposta do marketplace"}{" "}
                          · {selected.conversion.proposal.status}
                        </p>
                        {selected.internalLinks.proposal && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(selected.internalLinks.proposal!)
                            }
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 underline"
                          >
                            <ExternalLink className="h-4 w-4" /> Abrir proposta
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section className="border-t border-gray-100 pt-4">
                  <h3 className="mb-3 font-semibold text-gray-900">Ações</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selected.conversation?.id && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/app/messages?tab=marketplace&marketplaceConversation=${encodeURIComponent(selected.conversation!.id)}`,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
                      >
                        <MessageSquareText className="h-4 w-4" /> Abrir conversa
                      </button>
                    )}
                    {selected.status === "SUBMITTED" && (
                      <button
                        type="button"
                        disabled={actionId === selected.id}
                        onClick={() => performStatus(selected, "UNDER_REVIEW")}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Iniciar análise
                      </button>
                    )}
                    {["SUBMITTED", "UNDER_REVIEW"].includes(
                      selected.status,
                    ) && (
                      <button
                        type="button"
                        disabled={actionId === selected.id}
                        onClick={() => performStatus(selected, "CONTACTED")}
                        className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                      >
                        Marcar contato
                      </button>
                    )}
                    {["SUBMITTED", "UNDER_REVIEW", "CONTACTED"].includes(
                      selected.status,
                    ) && (
                      <button
                        type="button"
                        disabled={actionId === selected.id}
                        onClick={() => performConversion(selected)}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Converter em proposta
                      </button>
                    )}
                    {["SUBMITTED", "UNDER_REVIEW", "CONTACTED"].includes(
                      selected.status,
                    ) && (
                      <button
                        type="button"
                        disabled={actionId === selected.id}
                        onClick={() => performStatus(selected, "REJECTED")}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Recusar
                      </button>
                    )}
                    {!["CLOSED"].includes(selected.status) && (
                      <button
                        type="button"
                        disabled={actionId === selected.id}
                        onClick={() => performStatus(selected, "CLOSED")}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Encerrar
                      </button>
                    )}
                  </div>
                  {actionId === selected.id && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <LoaderCircle className="h-4 w-4 animate-spin" />{" "}
                      Processando…
                    </p>
                  )}
                </section>

                <p className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /> Converter
                  cria cliente e proposta em rascunho. A solicitação não cria
                  reserva, campanha ou cobrança automaticamente.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
