import type { AssistantMediaPlanState } from '../../types/assistant';

export function MediaPlanVersionCard({ state }: { state: AssistantMediaPlanState }) {
  return <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
    <div className="font-semibold text-slate-800">Versão {state.version} · {state.status === 'adjusted' ? 'Plano ajustado' : 'Plano inicial'}</div>
    {state.version > 1 ? <div className="mt-1">Comando: {state.command}</div> : null}
    {state.addedFaces.length ? <div className="mt-1 text-emerald-700">Adicionadas: {state.addedFaces.join(', ')}</div> : null}
    {state.removedFaces.length ? <div className="mt-1 text-amber-700">Removidas: {state.removedFaces.join(', ')}</div> : null}
    <div className="mt-1 text-slate-500">Válido até {new Date(state.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>;
}
