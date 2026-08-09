import { useState } from 'react';
import apiClient from '../../lib/apiClient';
const KEY = 'onemedia-assistant-feedback-v1';
export function AssistantFeedbackControls({ messageId }: { messageId: string }) {
  const initial = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}')[messageId] || null; } catch { return null; } })();
  const [value, setValue] = useState<'helpful' | 'not_helpful' | null>(initial);
  const submit = (next: 'helpful' | 'not_helpful') => { if (value) return; setValue(next); try { const all = JSON.parse(localStorage.getItem(KEY) || '{}'); localStorage.setItem(KEY, JSON.stringify({ ...all, [messageId]: next })); } catch {} void apiClient.post('/assistant/feedback', { messageId, value: next }).catch(() => undefined); };
  if (value) return <div className="mt-2 text-[11px] text-slate-400">Obrigado pelo feedback.</div>;
  return <div className="mt-2 flex gap-2 text-[11px] text-slate-500"><span>Foi útil?</span><button onClick={() => submit('helpful')}>Sim</button><button onClick={() => submit('not_helpful')}>Não</button></div>;
}
