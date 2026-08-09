import type { AssistantMediaPlan } from '../../types/assistant';
import { MediaFaceCard } from './MediaFaceCard';
import { MediaPlanLimitationsCard } from './MediaPlanLimitationsCard';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');

export function MediaPlanSummaryCard({ plan }: { plan: AssistantMediaPlan }) {
  return <section className="mt-3 space-y-3" aria-label="Plano de mídia recomendado">
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Recomendação somente leitura</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{plan.briefing.client.label} · {plan.briefing.city}/{plan.briefing.state}</div>
      <div className="mt-1 text-xs text-slate-600">{date(plan.briefing.startDate)} a {date(plan.briefing.endDate)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div>Faces <strong>{plan.recommendedCount}</strong></div><div>Regiões <strong>{plan.geographicCoverage.regions.length}</strong></div><div>Valor <strong>{money(plan.totalValue)}</strong></div><div>Saldo <strong>{money(plan.remainingBudget)}</strong></div></div>
      <div className="mt-2 text-xs text-slate-600">Orçamento utilizado: {plan.budgetUsedPercent.toLocaleString('pt-BR')}%</div>
      <div className="mt-1 text-xs text-slate-600">Alcance total: {plan.estimatedReachTotal == null ? 'não calculado com os dados atuais' : plan.estimatedReachTotal.toLocaleString('pt-BR')}</div>
    </div>
    {plan.recommended.map(face => <MediaFaceCard key={face.mediaUnitId} face={face} />)}
    {plan.alternatives.length ? <details className="rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Alternativas ({plan.alternatives.length})</summary><div className="mt-3 space-y-3">{plan.alternatives.map(face => <MediaFaceCard key={face.mediaUnitId} face={face} />)}</div></details> : null}
    <MediaPlanLimitationsCard limitations={plan.limitations} alerts={plan.alerts} />
    <p className="text-xs text-slate-500">{plan.nextStep}<br />Nenhuma proposta, reserva ou campanha foi criada.</p>
  </section>;
}
