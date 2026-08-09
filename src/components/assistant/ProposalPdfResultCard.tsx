import type { AssistantDataPoint } from '../../types/assistant';

export function ProposalPdfResultCard({ point }: { point: AssistantDataPoint }) {
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3" aria-label="PDF da proposta">
    <div className="text-xs font-semibold text-emerald-800">PDF gerado para revisão</div>
    <div className="mt-1 text-sm font-medium text-slate-900">{point.value}</div>
    <p className="mt-1 break-all text-xs text-slate-600">{point.description}</p>
    <p className="mt-2 text-xs text-slate-500">O documento não foi enviado e não alterou o status da proposta.</p>
  </section>;
}
