import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../lib/apiClient";

type ClientOption = {
  id: string;
  contactName: string;
  companyName?: string | null;
};
type Candidate = {
  mediaUnitId: string;
  eligible: boolean;
  availability: string;
  priceAmountCents: number | null;
  priceSource: string;
  currency: string;
  mediaType: string;
  unitType: string;
  exclusionReasons: string[];
  matchedRestrictions: string[];
  location: {
    city: string | null;
    state: string | null;
    distanceMeters: number | null;
  };
};
type Version = {
  id: string;
  version: number;
  status: "DRAFT" | "READY" | "ARCHIVED";
  briefing: Record<string, unknown>;
  validationIssues: Array<{ field: string; message: string }>;
  candidates: Candidate[];
};
type Plan = {
  id: string;
  clientId: string | null;
  status: "DRAFT" | "READY" | "ARCHIVED";
  currentVersion: number;
  versions: Version[];
};
const enabled =
  String(
    import.meta.env.VITE_ASSISTANT_CAMPAIGN_PLANNER || "",
  ).toLowerCase() === "true";
const idem = () => `campaign-plan-${Date.now()}-${crypto.randomUUID()}`;
const apiError = (error: unknown) =>
  typeof error === "object" && error !== null && "response" in error
    ? String(
        (error as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message || "Revise o briefing.",
      )
    : "Revise o briefing.";

export function CampaignPlannerFoundationPanel() {
  const [plans, setPlans] = useState<Plan[]>([]),
    [clients, setClients] = useState<ClientOption[]>([]),
    [selectedPlan, setSelectedPlan] = useState(""),
    [selectedVersion, setSelectedVersion] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    startDate: "2028-02-01T00:00:00-03:00",
    endDate: "2028-02-07T23:59:59-03:00",
    timezone: "America/Sao_Paulo",
    budgetReais: "",
    currency: "BRL",
    city: "São Paulo",
    state: "SP",
    latitude: "",
    longitude: "",
    radiusMeters: "",
    mediaTypes: ["OOH"] as string[],
    objective: "",
    constraints: "",
    desiredQuantity: "",
  });
  const load = useCallback(async () => {
    if (!enabled) return;
    const [planResponse, clientResponse] = await Promise.all([
      apiClient.get<Plan[]>("/assistant/campaign-plans"),
      apiClient.get("/clients", { params: { page: 1, pageSize: 40 } }),
    ]);
    setPlans(planResponse.data);
    const raw = clientResponse.data as
      ClientOption[] | { data?: ClientOption[] };
    setClients(
      Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [],
    );
  }, []);
  useEffect(() => {
    void load().catch(() =>
      setError("Não foi possível recuperar o planejador."),
    );
  }, [load]);
  const plan = plans.find((item) => item.id === selectedPlan) || plans[0];
  const version = plan?.versions.find(
    (item) => item.version === (selectedVersion ?? plan.currentVersion),
  );
  const briefing = useMemo(
    () => ({
      clientId: form.clientId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      timezone: form.timezone || undefined,
      budgetCents: form.budgetReais
        ? Math.round(Number(form.budgetReais) * 100)
        : undefined,
      currency: form.currency || undefined,
      cities:
        form.city && form.state ? [{ city: form.city, state: form.state }] : [],
      regions: [],
      center:
        form.latitude && form.longitude && form.radiusMeters
          ? {
              latitude: Number(form.latitude),
              longitude: Number(form.longitude),
              radiusMeters: Number(form.radiusMeters),
            }
          : undefined,
      mediaTypes: form.mediaTypes,
      objective: form.objective || undefined,
      constraints: form.constraints
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      desiredQuantity: form.desiredQuantity
        ? Number(form.desiredQuantity)
        : undefined,
    }),
    [form],
  );
  if (!enabled) return null;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = plan
        ? await apiClient.patch<Plan>(`/assistant/campaign-plans/${plan.id}`, {
            idempotencyKey: idem(),
            briefing,
          })
        : await apiClient.post<Plan>("/assistant/campaign-plans", {
            idempotencyKey: idem(),
            briefing,
          });
      setSelectedPlan(response.data.id);
      setSelectedVersion(response.data.currentVersion);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const evaluate = async () => {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/assistant/campaign-plans/${plan.id}/evaluate`);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      data-testid="campaign-planner-foundation"
      className="mb-3 rounded-2xl border border-violet-200 bg-white p-3 text-xs"
    >
      <h3 className="font-semibold">Briefing persistente do planejador</h3>
      <p className="mt-1 text-slate-500">
        Somente candidatos explicáveis; nenhuma campanha, proposta ou reserva
        será criada.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          aria-label="Cliente do briefing"
          className="col-span-2 rounded border p-2"
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        >
          <option value="">Selecione o cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName || c.contactName}
            </option>
          ))}
        </select>
        <input
          aria-label="Início do briefing"
          className="col-span-2 rounded border p-2"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
        <input
          aria-label="Fim do briefing"
          className="col-span-2 rounded border p-2"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
        <input
          aria-label="Timezone do briefing"
          className="col-span-2 rounded border p-2"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        />
        <input
          aria-label="Orçamento em reais"
          type="number"
          min="0"
          step="0.01"
          className="rounded border p-2"
          value={form.budgetReais}
          onChange={(e) => setForm({ ...form, budgetReais: e.target.value })}
        />
        <input
          aria-label="Moeda"
          className="rounded border p-2"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        />
        <input
          aria-label="Cidade"
          className="rounded border p-2"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <input
          aria-label="Estado"
          className="rounded border p-2"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
        />
        <input
          aria-label="Latitude central"
          className="rounded border p-2"
          value={form.latitude}
          onChange={(e) => setForm({ ...form, latitude: e.target.value })}
        />
        <input
          aria-label="Longitude central"
          className="rounded border p-2"
          value={form.longitude}
          onChange={(e) => setForm({ ...form, longitude: e.target.value })}
        />
        <input
          aria-label="Raio em metros"
          className="col-span-2 rounded border p-2"
          value={form.radiusMeters}
          onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
        />
        <div className="col-span-2 flex gap-2">
          {["OOH", "DOOH"].map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={form.mediaTypes.includes(type)}
                onChange={() =>
                  setForm({
                    ...form,
                    mediaTypes: form.mediaTypes.includes(type)
                      ? form.mediaTypes.filter((v) => v !== type)
                      : [...form.mediaTypes, type],
                  })
                }
              />{" "}
              {type}
            </label>
          ))}
        </div>
        <input
          aria-label="Objetivo"
          className="col-span-2 rounded border p-2"
          value={form.objective}
          onChange={(e) => setForm({ ...form, objective: e.target.value })}
        />
        <input
          aria-label="Restrições"
          className="col-span-2 rounded border p-2"
          value={form.constraints}
          onChange={(e) => setForm({ ...form, constraints: e.target.value })}
        />
        <input
          aria-label="Quantidade desejada"
          type="number"
          min="1"
          className="col-span-2 rounded border p-2"
          value={form.desiredQuantity}
          onChange={(e) =>
            setForm({ ...form, desiredQuantity: e.target.value })
          }
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          disabled={busy}
          className="rounded bg-violet-600 px-3 py-2 text-white"
          onClick={() => void save()}
        >
          {plan ? "Criar nova versão" : "Revisar briefing"}
        </button>
        {plan && (
          <button
            disabled={busy}
            className="rounded bg-emerald-600 px-3 py-2 text-white"
            onClick={() => void evaluate()}
          >
            Gerar candidatos
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-red-600">
          {error}
        </p>
      )}
      {plan && (
        <div className="mt-3 rounded border p-2" data-testid="campaign-plan">
          <div className="font-medium">
            {plan.status} · versão atual {plan.currentVersion}
          </div>
          <div className="mt-1 flex gap-1">
            {plan.versions.map((item) => (
              <button
                key={item.version}
                className="rounded border px-2 py-1"
                onClick={() => setSelectedVersion(item.version)}
              >
                v{item.version}
              </button>
            ))}
          </div>
          {version?.validationIssues.map((issue) => (
            <div
              key={`${issue.field}-${issue.message}`}
              className="text-amber-700"
            >
              {issue.field}: {issue.message}
            </div>
          ))}
          <div className="mt-2 space-y-1">
            {version?.candidates.map((candidate) => (
              <div key={candidate.mediaUnitId} className="rounded border p-2">
                <b>{candidate.eligible ? "Elegível" : "Inelegível"}</b> ·{" "}
                {candidate.mediaType}/{candidate.unitType} ·{" "}
                {candidate.availability}
                <div>
                  {candidate.priceAmountCents == null
                    ? "Preço ausente"
                    : `${(candidate.priceAmountCents / 100).toFixed(2)} ${candidate.currency} (${candidate.priceSource})`}
                </div>
                <div>
                  {candidate.exclusionReasons.join(", ") ||
                    candidate.matchedRestrictions.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
