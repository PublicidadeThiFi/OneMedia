import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui/button';

/**
 * F13: confirmation inside the page instead of the browser's own dialog.
 * `ask(text)` resolves true only when the person presses "Confirmar"; Cancel, Escape or unmount resolve false.
 */
export function useInlineConfirm(): { ask: (text: string, confirmLabel?: string) => Promise<boolean>; confirmUi: ReactNode } {
  const [pending, setPending] = useState<{ text: string; confirmLabel: string } | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const finish = useCallback((value: boolean) => {
    resolver.current?.(value); resolver.current = null; setPending(null);
  }, []);
  const ask = useCallback((text: string, confirmLabel = 'Confirmar') => new Promise<boolean>(resolve => {
    resolver.current?.(false);
    resolver.current = resolve;
    setPending({ text, confirmLabel });
  }), []);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, finish]);
  const confirmUi = pending ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) finish(false); }}>
    <div role="alertdialog" aria-modal="true" aria-label="Confirmar ação" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-sm text-gray-900 shadow-xl">
      <p className="whitespace-pre-line leading-6">{pending.text}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => finish(false)}>Cancelar</Button>
        <Button type="button" autoFocus onClick={() => finish(true)}>{pending.confirmLabel}</Button>
      </div>
    </div>
  </div> : null;
  return { ask, confirmUi };
}
