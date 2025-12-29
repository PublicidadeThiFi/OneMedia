export type DataChangedTopic = string;

const EVENT_NAME = 'app:data-changed';

export interface DataChangedDetail {
  topic: DataChangedTopic;
  payload?: unknown;
  ts: number;
}

export function emitDataChanged(topic: DataChangedTopic, payload?: unknown) {
  if (typeof window === 'undefined') return;
  const detail: DataChangedDetail = { topic, payload, ts: Date.now() };
  window.dispatchEvent(new CustomEvent<DataChangedDetail>(EVENT_NAME, { detail }));
}

type Subscriber = (detail: DataChangedDetail) => void;

export function subscribeDataChanged(topic: DataChangedTopic | '*', cb: Subscriber) {
  if (typeof window === 'undefined') return () => {};
  const handler: EventListener = (ev) => {
    const e = ev as CustomEvent<DataChangedDetail>;
    if (!e?.detail) return;
    if (topic === '*' || e.detail.topic === topic) cb(e.detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
