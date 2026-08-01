import type { AssistantMediaCandidate } from '../../types/assistant';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const availabilityLabel = { available: 'Disponibilidade confirmada', unavailable: 'Indisponível', partially_available: 'Disponibilidade parcial', unknown: 'Disponibilidade não confirmada', invalid: 'Cadastro inválido' } as const;

export function MediaFaceCard({ face }: { face: AssistantMediaCandidate }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-3">
    {face.photoUrl ? <img src={face.photoUrl} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" /> : null}
    <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-semibold text-slate-900">{face.displayName}</div><div className="text-xs text-slate-500">{face.code} · {face.mediaType}</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium">Score {face.score?.total ?? '—'}</span></div>
    <p className="mt-2 text-xs text-slate-600">{[face.address, face.region, face.city && face.state ? `${face.city}/${face.state}` : face.city].filter(Boolean).join(' · ') || 'Localização detalhada indisponível'}</p>
    <div className="mt-2 text-xs font-medium text-slate-700">{availabilityLabel[face.availability]}</div>
    <p className="mt-1 text-xs text-slate-500">{face.availabilityReason}</p>
    <div className="mt-2 text-sm font-semibold text-slate-900">{face.price == null ? 'Preço não informado' : money(face.price)}{face.priceEstimated ? ' (estimado)' : ''}</div>
    <div className="mt-1 text-xs text-slate-500">Alcance: {face.estimatedReach == null ? 'não disponível' : `${face.estimatedReach.toLocaleString('pt-BR')} impressões/dia`}</div>
    {face.recommendationReasons.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">{face.recommendationReasons.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
    {[...face.alerts, ...face.missingData.map(item => `Dado ausente: ${item}`)].length ? <p className="mt-2 text-xs text-amber-700">{[...face.alerts, ...face.missingData.map(item => `Dado ausente: ${item}`)].join(' · ')}</p> : null}
  </article>;
}
