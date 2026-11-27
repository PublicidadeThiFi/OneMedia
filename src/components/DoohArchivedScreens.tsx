import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Button } from './ui/button';
import { friendlyOperationalScreenError, parseOperationalScreen, parseOperationalScreenPage,
  type OperationalScreen } from '../lib/doohOperationalScreenContract';

type Props = { writable: boolean; disabled: boolean; onRestored: (screen: OperationalScreen) => void };

/** F12: archived screens stay out of the list and counts; they load only when this section is opened. */
export function DoohArchivedScreens({ writable, disabled, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OperationalScreen[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setItems(null); setError('');
    void apiClient.get<unknown>('/dooh/operational-screens', { params: { archived: true, page: 1, pageSize: 100 }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const parsed = parseOperationalScreenPage(data);
        if (!parsed || parsed.items.some(item => !item.archivedAt)) { setError('Não foi possível carregar as telas arquivadas.'); return; }
        setItems(parsed.items); setTotal(parsed.meta.total);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar as telas arquivadas.'); });
    return () => controller.abort();
  }, [open]);

  async function restore(screen: OperationalScreen) {
    if (!writable || busy || disabled) return;
    setBusy(true); setError('');
    try {
      const { data } = await apiClient.post<unknown>(`/dooh/operational-screens/${encodeURIComponent(screen.id)}/restore`);
      const result = parseOperationalScreen(data);
      if (!result || result.id !== screen.id || result.archivedAt) throw Error('Unexpected API response');
      onRestored(result);
    } catch (err: unknown) { setError(friendlyOperationalScreenError(err)); }
    finally { setBusy(false); }
  }

  return <details className="rounded-lg border border-gray-200 p-3 text-sm" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
    <summary className="cursor-pointer font-medium text-gray-800">Telas arquivadas</summary>
    <div className="mt-3 space-y-2">
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {open && !items && !error && <p className="text-gray-600">Carregando…</p>}
      {items?.length === 0 && <p className="text-gray-600">Nenhuma tela arquivada.</p>}
      {items && items.length > 0 && <ul className="divide-y rounded-md border">
        {items.map(screen => <li key={screen.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
          <span><strong>{screen.name}</strong>{screen.locationLabel ? ` · ${screen.locationLabel}` : ''}
            {screen.archivedAt && <span className="text-gray-500"> · arquivada em {new Date(screen.archivedAt).toLocaleDateString('pt-BR')}</span>}</span>
          {writable && <Button type="button" variant="outline" size="sm" disabled={busy || disabled} onClick={() => void restore(screen)}>Restaurar</Button>}
        </li>)}
      </ul>}
      {items && total > items.length && <p className="text-xs text-gray-600">Mostrando as {items.length} mais recentes de {total}.</p>}
    </div>
  </details>;
}
