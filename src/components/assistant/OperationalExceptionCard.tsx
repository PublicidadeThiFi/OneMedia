import { useMemo, useState } from 'react';
import type { AssistantOperationalException } from '../../types/assistant';
const KEY = 'onemedia-assistant-exception-state-v1';
type State = Record<string, { readAt?: string; snoozedUntil?: string }>;
function load(): State { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
export function OperationalExceptionCard({ item, onAsk }: { item: AssistantOperationalException; onAsk: (prompt: string) => void }) {
  const [state, setState] = useState<State>(load); const entry = state[item.key] || {};
  const snoozed = useMemo(() => !!entry.snoozedUntil && new Date(entry.snoozedUntil) > new Date(), [entry.snoozedUntil]);
  if (snoozed) return null;
  const update = (next: State[string]) => { const value = { ...state, [item.key]: { ...entry, ...next } }; setState(value); try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {} };
  const tone = item.severity === 'critical' ? 'border-red-200 bg-red-50' : item.severity === 'high' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50';
  return <div className={`mt-2 rounded-xl border p-3 text-xs ${tone}`}><div className="font-semibold">{item.title}</div><div className="mt-1 text-slate-600">{item.summary}</div><div className="mt-2 flex flex-wrap gap-2"><button className="rounded-md bg-white px-2 py-1 shadow-sm" onClick={() => { update({ readAt: new Date().toISOString() }); onAsk(item.suggestedPrompt); }}>Ver detalhes</button><button className="rounded-md bg-white px-2 py-1 shadow-sm" onClick={() => update({ snoozedUntil: new Date(Date.now() + 86_400_000).toISOString() })}>Lembrar amanhã</button>{entry.readAt && <span className="px-1 py-1 text-slate-500">Visto</span>}</div></div>;
}
