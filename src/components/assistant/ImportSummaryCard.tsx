import type { AssistantImportSession } from "../../types/assistant";
import { ImportAssetStagingPanel } from "./ImportAssetStagingPanel";
import { ImportGeocodingReviewPanel } from "./ImportGeocodingReviewPanel";
import { ImportProximityReviewPanel } from "./ImportProximityReviewPanel";

export function ImportSummaryCard({
  session,
  showWorkflowDetails = true,
}: {
  session: AssistantImportSession;
  showWorkflowDetails?: boolean;
}) {
  const summary = session.summary;
  return (
    <>
      <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-xs">
        <b>Revisão da importação · versão {session.version}</b>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <span>Detectados: {summary.total}</span>
          <span>Selecionados: {summary.selected}</span>
          <span>Válidos: {summary.valid}</span>
          <span>Com avisos: {summary.warnings}</span>
          <span>Inválidos: {summary.invalid}</span>
          <span>Duplicidades: {summary.possibleDuplicates}</span>
          <span>Sem coordenadas: {summary.withoutGeocoding}</span>
          <span>Com imagem: {summary.withImage}</span>
        </div>
        <div className="mt-2 text-slate-500">
          Sessão temporária até{" "}
          {new Date(session.expiresAt).toLocaleTimeString("pt-BR")}.
        </div>
      </div>
      {showWorkflowDetails && session.importType === "media_points" && (
        <ImportGeocodingReviewPanel session={session} />
      )}
      {showWorkflowDetails && session.importType === "media_points" && (
        <ImportProximityReviewPanel session={session} />
      )}
      {showWorkflowDetails &&
        ["media_points", "media_units"].includes(session.importType) && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-white p-2 text-xs">
            <summary className="cursor-pointer font-medium text-slate-700">
              Adicionar fotos (opcional)
            </summary>
            <p className="mt-1 text-slate-500">
              Use somente para associar uma foto a um ponto ou unidade já
              cadastrado e escolhido explicitamente.
            </p>
            <ImportAssetStagingPanel session={session} />
          </details>
        )}
    </>
  );
}
