export function MediaPlanLimitationsCard({ limitations, alerts }: { limitations: string[]; alerts: string[] }) {
  const items = [...limitations, ...alerts];
  if (!items.length) return null;
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="text-xs font-semibold text-amber-900">Limitações e alertas</div><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}
