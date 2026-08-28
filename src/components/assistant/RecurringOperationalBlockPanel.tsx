import { useCallback, useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";

type Rule = {
  id: string;
  mediaUnitId: string;
  timezone: string;
  localStartDate: string;
  localStartTime: string;
  localEndTime: string;
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  untilLocalDate: string | null;
  occurrenceCount: number | null;
  exceptions: string[];
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "CANCELLED";
  version: number;
  occurrences: Array<{ localDate: string; startDate: string; endDate: string }>;
  horizonMaximum: number;
};

const enabled =
  String(
    import.meta.env.VITE_ASSISTANT_RECURRING_BLOCKS || "",
  ).toLowerCase() === "true";
const key = () => `recurrence-${Date.now()}-${crypto.randomUUID()}`;
const errorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("response" in error))
    return null;
  const response = (error as { response?: { data?: { message?: unknown } } })
    .response;
  return typeof response?.data?.message === "string"
    ? response.data.message
    : null;
};

export function RecurringOperationalBlockPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    mediaUnitId: "",
    timezone: "America/Sao_Paulo",
    localStartDate: "",
    localStartTime: "09:00",
    localEndTime: "10:00",
    frequency: "DAILY" as "DAILY" | "WEEKLY",
    weekdays: [] as number[],
    occurrenceCount: "",
    untilLocalDate: "",
    exceptions: "",
  });
  const load = useCallback(async () => {
    if (!enabled) return;
    const { data } = await apiClient.get<Rule[]>(
      "/recurring-operational-blocks",
    );
    setRules(data);
  }, []);
  useEffect(() => {
    void load().catch(() =>
      setError("Não foi possível recuperar as recorrências."),
    );
  }, [load]);
  if (!enabled) return null;
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/recurring-operational-blocks", {
        ...form,
        weekdays: form.frequency === "WEEKLY" ? form.weekdays : [],
        occurrenceCount: form.occurrenceCount
          ? Number(form.occurrenceCount)
          : undefined,
        untilLocalDate: form.untilLocalDate || undefined,
        exceptions: form.exceptions
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        idempotencyKey: key(),
      });
      await load();
    } catch (error: unknown) {
      setError(errorMessage(error) || "Revise os campos informados.");
    } finally {
      setBusy(false);
    }
  };
  const act = async (
    rule: Rule,
    action: "confirm" | "pause" | "resume" | "cancel",
  ) => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post(
        `/recurring-operational-blocks/${rule.id}/${action}`,
        { idempotencyKey: key() },
      );
      await load();
    } catch (error: unknown) {
      setError(errorMessage(error) || "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="mb-3 rounded-2xl border border-indigo-200 bg-white p-3 text-xs"
      data-testid="recurrence-panel"
    >
      <h3 className="font-semibold text-slate-900">
        Bloqueio operacional recorrente
      </h3>
      <p className="mt-1 text-slate-500">
        Diário ou semanal, com revisão e confirmação explícita. Intervalos com
        fronteiras inclusivas.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          aria-label="Unidade de mídia"
          className="col-span-2 rounded border p-2"
          placeholder="ID explícito da MediaUnit"
          value={form.mediaUnitId}
          onChange={(e) => setForm({ ...form, mediaUnitId: e.target.value })}
        />
        <input
          aria-label="Timezone IANA"
          className="col-span-2 rounded border p-2"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        />
        <input
          aria-label="Data inicial"
          type="date"
          className="rounded border p-2"
          value={form.localStartDate}
          onChange={(e) => setForm({ ...form, localStartDate: e.target.value })}
        />
        <select
          aria-label="Frequência"
          className="rounded border p-2"
          value={form.frequency}
          onChange={(e) =>
            setForm({
              ...form,
              frequency: e.target.value as "DAILY" | "WEEKLY",
            })
          }
        >
          <option value="DAILY">Diária</option>
          <option value="WEEKLY">Semanal</option>
        </select>
        <input
          aria-label="Hora inicial"
          type="time"
          className="rounded border p-2"
          value={form.localStartTime}
          onChange={(e) => setForm({ ...form, localStartTime: e.target.value })}
        />
        <input
          aria-label="Hora final"
          type="time"
          className="rounded border p-2"
          value={form.localEndTime}
          onChange={(e) => setForm({ ...form, localEndTime: e.target.value })}
        />
        {form.frequency === "WEEKLY" && (
          <div className="col-span-2 flex flex-wrap gap-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
              <label key={index} className="rounded border px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.weekdays.includes(index)}
                  onChange={() =>
                    setForm({
                      ...form,
                      weekdays: form.weekdays.includes(index)
                        ? form.weekdays.filter((v) => v !== index)
                        : [...form.weekdays, index],
                    })
                  }
                />{" "}
                {label}
              </label>
            ))}
          </div>
        )}
        <input
          aria-label="Quantidade de ocorrências"
          type="number"
          min="1"
          className="rounded border p-2"
          placeholder="Quantidade"
          value={form.occurrenceCount}
          onChange={(e) =>
            setForm({ ...form, occurrenceCount: e.target.value })
          }
        />
        <input
          aria-label="Data final"
          type="date"
          className="rounded border p-2"
          value={form.untilLocalDate}
          onChange={(e) => setForm({ ...form, untilLocalDate: e.target.value })}
        />
        <input
          aria-label="Exceções"
          className="col-span-2 rounded border p-2"
          placeholder="Exceções YYYY-MM-DD, separadas por vírgula"
          value={form.exceptions}
          onChange={(e) => setForm({ ...form, exceptions: e.target.value })}
        />
      </div>
      <button
        disabled={busy}
        className="mt-2 rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-50"
        onClick={() => void submit()}
      >
        Revisar recorrência
      </button>
      {error && (
        <p role="alert" className="mt-2 text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 space-y-2">
        {rules.map((rule) => (
          <article
            key={rule.id}
            className="rounded border p-2"
            data-testid="recurrence-rule"
          >
            <div className="font-medium">
              {rule.status} ·{" "}
              {rule.frequency === "DAILY" ? "Diária" : "Semanal"} ·{" "}
              {rule.timezone}
            </div>
            <div>
              {rule.occurrences.length} ocorrência(s) no horizonte de{" "}
              {rule.horizonMaximum}; {rule.localStartTime}–{rule.localEndTime}
            </div>
            <div className="mt-1 max-h-20 overflow-auto text-slate-500">
              {rule.occurrences.map((item) => (
                <div key={item.localDate}>
                  {item.localDate}: {new Date(item.startDate).toISOString()} —{" "}
                  {new Date(item.endDate).toISOString()}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {rule.status === "DRAFT" && (
                <button
                  disabled={busy}
                  className="rounded bg-emerald-600 px-2 py-1 text-white"
                  onClick={() => void act(rule, "confirm")}
                >
                  Confirmar
                </button>
              )}
              {rule.status === "ACTIVE" && (
                <button
                  disabled={busy}
                  className="rounded border px-2 py-1"
                  onClick={() => void act(rule, "pause")}
                >
                  Pausar
                </button>
              )}
              {rule.status === "PAUSED" && (
                <button
                  disabled={busy}
                  className="rounded border px-2 py-1"
                  onClick={() => void act(rule, "resume")}
                >
                  Retomar
                </button>
              )}
              {rule.status !== "CANCELLED" && (
                <button
                  disabled={busy}
                  className="rounded border border-red-200 px-2 py-1 text-red-600"
                  onClick={() => void act(rule, "cancel")}
                >
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
