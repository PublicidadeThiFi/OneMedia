export const getAssistantStorageKey = (userId?:string|null) => userId ? `onemedia-assistant-state-v2:${userId}` : 'onemedia-assistant-state-v2:guest';
export function readAssistantLocalState<T>(key:string):T|null { try { const raw=window.localStorage.getItem(key); return raw?JSON.parse(raw) as T:null; } catch { return null; } }
export function writeAssistantLocalState(key:string,value:unknown){try{window.localStorage.setItem(key,JSON.stringify(value));}catch{/* storage is best effort */}}
export function removeAssistantLocalState(key:string){try{window.localStorage.removeItem(key);}catch{/* storage is best effort */}}
