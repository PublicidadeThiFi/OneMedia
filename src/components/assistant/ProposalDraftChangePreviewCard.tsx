import type { AssistantDataPoint } from '../../types/assistant';

export function ProposalDraftChangePreviewCard({ point }: { point: AssistantDataPoint }) {
  return <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-3" aria-label="Prévia das alterações do rascunho">
    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Alterações preparadas</div>
    <div className="mt-1 text-sm font-medium text-slate-900">{point.value}</div>
    {point.description ? <div className="mt-1 text-xs text-slate-600">{point.description}</div> : null}
    <p className="mt-2 text-xs text-slate-500">A atualização só ocorrerá depois da confirmação e de uma nova validação no backend.</p>
  </section>;
}
