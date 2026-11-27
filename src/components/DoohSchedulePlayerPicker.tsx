import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { parseDoohPlayerInventoryResponse, type DoohPlayerInventoryItem } from '../lib/doohPlayerInventoryContract';

/** UX04: name-based destination lookup. Cas payload and server validation remain unchanged. */
export function DoohSchedulePlayerPicker({ companyId, value, onChange, disabled }: {
  companyId: string; value: string; onChange: (id: string) => void; disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ items: DoohPlayerInventoryItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setResult(null); setError('');
    const controller = new AbortController(); setLoading(true);
    void apiClient.get<unknown>('/dooh/players', {
      params: { page: 1, pageSize: 20, ...(query ? { q: query } : {}) }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const parsed = parseDoohPlayerInventoryResponse(data);
      if (!parsed || parsed.meta.page !== 1 || parsed.meta.pageSize !== 20) {
        setError('Não foi possível carregar as telas. Tente de novo em instantes.'); return;
      }
      setResult({ items: parsed.items.filter(item => item.lifecycleStatus === 'ACTIVE'), total: parsed.meta.total });
    }).catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar as telas.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, query]);
  function search(event: FormEvent) { event.preventDefault(); onChange(''); setQuery(text.trim().slice(0, 160)); }
  return <div className="space-y-2 md:col-span-2">
    <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={search}>
      <label className="min-w-0 flex-1 text-sm">Buscar tela pelo nome
        <input className="mt-1 w-full rounded-md border p-2" maxLength={160} value={text} disabled={disabled}
          placeholder="Nome da tela ou plataforma" onChange={event => setText(event.target.value)} />
      </label>
      <button type="submit" className="min-h-10 rounded-lg border px-4 py-2 text-sm font-medium text-indigo-700" disabled={disabled || loading}>Buscar</button>
    </form>
    <label className="block text-sm">Tela (aparelho)
      <select aria-label="Escolher dispositivo pelo nome" className="mt-1 w-full rounded-md border p-2" value={value} disabled={disabled || loading || !result}
        onChange={event => onChange(event.target.value)}>
        <option value="">Selecione a tela cadastrada</option>
        {(result?.items ?? []).map(item => <option key={item.id} value={item.id}>
          {item.name || 'Aparelho sem nome'}{item.currentAssignment?.mediaUnit.label ? ` · ${item.currentAssignment.mediaUnit.label}` : ''} · {item.online ? 'conectado' : 'sem conexão'}
        </option>)}
      </select>
    </label>
    {loading && <p role="status" className="text-xs text-gray-600">Carregando telas…</p>}
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {result && result.total > 20 && <p className="text-xs text-amber-800">Mostrando 20. Busque pelo nome para encontrar outras.</p>}
    {result && !result.items.length && <p className="text-xs text-gray-600">Nenhuma tela com aparelho ativo. Conecte um aparelho em Telas antes de agendar.</p>}
  </div>;
}
