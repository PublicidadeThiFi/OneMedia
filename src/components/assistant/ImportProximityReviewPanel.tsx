import { useRef, useState } from "react";
import apiClient from "../../lib/apiClient";
import type { AssistantImportSession } from "../../types/assistant";

export function ImportProximityReviewPanel({
  session,
}: {
  session: AssistantImportSession;
}) {
  const [error, setError] = useState(""),
    busy = useRef(false),
    rows = session.rows.filter(
      (row) =>
        !row.deleted &&
        row.duplicateCandidates.some(
          (candidate) => candidate.kind === "geographic_proximity",
        ),
    );
  if (!rows.length) return null;
  const confirm = async (rowId: string) => {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      await apiClient.post("/assistant/imports/proximity/distinct", {
        sessionId: session.sessionId,
        rowId,
      });
      window.location.reload();
    } catch {
      setError(
        "Não foi possível registrar a decisão. Recarregue e tente novamente.",
      );
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs">
      <b>Possíveis pontos próximos</b>
      <p className="mt-1 text-slate-600">
        O alerta não mescla, altera ou exclui o ponto existente. Remova a linha
        na revisão ou confirme explicitamente que ela representa um ponto
        distinto.
      </p>
      {rows.map((row) => (
        <div
          key={row.rowId}
          className="mt-2 rounded border border-orange-200 bg-white p-2"
        >
          <div>
            Linha {row.sourceIndex + 1} · raio{" "}
            {row.proximityReview?.radiusMeters ?? 50} m ·{" "}
            {row.proximityReview?.status === "confirmed_distinct"
              ? "ponto distinto confirmado"
              : "revisão obrigatória"}
          </div>
          {row.duplicateCandidates
            .filter((candidate) => candidate.kind === "geographic_proximity")
            .map((candidate) => (
              <div
                key={candidate.candidateReference}
                className="mt-1 text-slate-600"
              >
                {candidate.label} · {candidate.distanceMeters?.toFixed(3)} m ·{" "}
                {(candidate.signals || []).join(", ")}
              </div>
            ))}
          {row.proximityReview?.status !== "confirmed_distinct" && (
            <button
              className="mt-2 rounded bg-orange-600 px-2 py-1 text-white"
              onClick={() => void confirm(row.rowId)}
            >
              Confirmar ponto distinto
            </button>
          )}
        </div>
      ))}
      {error && <div className="mt-2 text-red-700">{error}</div>}
    </div>
  );
}
