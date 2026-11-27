import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { parseScreenTimeline, timelineContentText, timelineEmptyText, timelineRangeText,
  type ScreenTimeline } from '../lib/doohScreenTimelineContract';

/** F12: collapsed by default; loads only when opened. Describes the installed programming, not proof of playback. */
export function DoohScreenTimeline({ screenId, versionKey }: { screenId: string; versionKey: string }) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState<ScreenTimeline | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError('');
    void apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screenId)}/timeline`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseScreenTimeline(data, screenId);
        if (!parsed) { setError('Não foi possível conferir a programação agora.'); return; }
        setTimeline(parsed);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível conferir a programação agora.'); });
    return () => controller.abort();
  }, [open, screenId, versionKey]);

  const now = new Date();
  return <details className="rounded-lg border border-gray-200 p-3 text-sm" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
    <summary className="cursor-pointer font-medium text-gray-800">Programação das próximas horas</summary>
    <div className="mt-2 space-y-2">
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {open && !timeline && !error && <p className="text-gray-600">Carregando…</p>}
      {timeline && timeline.segments.length === 0 && <p className="text-gray-600">{timelineEmptyText(timeline.state)}</p>}
      {timeline && timeline.segments.length > 0 && <ol className="space-y-1" aria-label="Programação instalada">
        {timeline.segments.map(segment => {
          const current = Date.parse(segment.from) <= now.getTime() && now.getTime() < Date.parse(segment.to);
          return <li key={segment.from} className={`flex flex-wrap gap-x-2 rounded-md px-2 py-1 ${current ? 'bg-indigo-50' : ''}`}>
            <span className="tabular-nums font-medium text-gray-900">{timelineRangeText(segment, now)}</span>
            <span className={segment.status === 'NO_MATCH' ? 'text-gray-500' : 'text-gray-700'}>{timelineContentText(segment)}</span>
          </li>;
        })}
      </ol>}
      {timeline?.windowTo && timeline.segments.length > 0 && <p className="text-xs text-gray-500">Depois das {new Date(timeline.windowTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}, a TV busca a programação seguinte sozinha quando estiver conectada.</p>}
      <p className="text-xs text-gray-500">Esta é a programação instalada no aparelho. Para saber o que realmente passou, veja Relatórios.</p>
    </div>
  </details>;
}
