import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { parseScreenTimeline, timelineEmptyText, timelineNowText } from '../lib/doohScreenTimelineContract';

/** F13: what the installed programming shows now, in one line. Describes the installed programming, not proof of playback. */
export function DoohScreenNowLine({ screenId, versionKey }: { screenId: string; versionKey: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setText('');
    void apiClient.get<unknown>(`/dooh/operational-screens/${encodeURIComponent(screenId)}/timeline`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseScreenTimeline(data, screenId);
        if (parsed) setText(timelineNowText(parsed) || timelineEmptyText(parsed.state));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [screenId, versionKey]);
  return text ? <p className="truncate text-sm text-gray-700" title={text}>{text}</p> : null;
}
