import type { AssistantDataPoint } from '../../types/assistant';

export function ProposalSendErrorCard({ point }: { point: AssistantDataPoint }) {
  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-3" aria-label="Envio da proposta bloqueado">
    <div className="text-xs font-semibold text-amber-900">Envio não executado</div><div className="mt-1 text-sm font-medium text-slate-900">{point.value}</div>
    <p className="mt-1 text-xs leading-5 text-amber-800">{point.description}</p><p className="mt-2 text-xs text-slate-500">Nenhuma face foi reservada. Nenhuma campanha ou faturamento foi criado.</p>
  </section>;
}
