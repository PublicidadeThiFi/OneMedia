/** UX01–UX05: switches presentation only; authorization and mutations remain in the existing modules. */
export interface DoohWorkspaceTab<T extends string> { id: T; label: string; description?: string }

export function DoohWorkspaceTabs<T extends string>({ tabs, selected, onSelect, label }: {
  tabs: readonly DoohWorkspaceTab<T>[];
  selected: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  return <nav aria-label={label} className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {tabs.map(tab => <button key={tab.id} type="button" onClick={() => onSelect(tab.id)}
        aria-pressed={selected === tab.id}
        className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${selected === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'}`}>
        {tab.label}
      </button>)}
    </div>
    {tabs.find(tab => tab.id === selected)?.description && <p className="px-3 pb-1 pt-2 text-sm text-gray-600" role="status">{tabs.find(tab => tab.id === selected)?.description}</p>}
  </nav>;
}
