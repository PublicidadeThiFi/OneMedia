/** D13N: test-only provider stand-ins. Never imported by production entrypoints. */
import { useSyncExternalStore } from 'react';

type Mode = 'FULL' | 'READ_ONLY' | 'NONE';
type StubState = { companyId: string | null; snapshotCompanyId: string | null; roles: string[]; mode: Mode };
let current: StubState = { companyId: 'D13N-A', snapshotCompanyId: 'D13N-A', roles: ['TI'], mode: 'READ_ONLY' };
const listeners = new Set<() => void>();
function subscribe(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; }
function snapshot() { return current; }
export function setD13NContext(next: Partial<StubState>) {
  current = { ...current, ...next };
  for (const listener of listeners) listener();
}
export function useAuth() {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { user: state.companyId ? { companyId: state.companyId, roles: state.roles } : null };
}
export function useProductAccess() {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { snapshot: state.snapshotCompanyId ? { companyId: state.snapshotCompanyId,
    modules: { DOOH: { granted: state.mode !== 'NONE', accessMode: state.mode } } } : null };
}
