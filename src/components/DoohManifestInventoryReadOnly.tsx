import { useEffect, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import type { DoohPlayerDetailView } from '../lib/doohPlayerDetailContract';
import { canReadManifestInventory, manifestInventoryError, manifestInventorySignals,
  parseDoohManifestInventory, type DoohManifestInventoryView } from '../lib/doohManifestInventoryContract';

/** D16A01 — requested GET only; no manifest payload, signed URL or player command. */
export function DoohManifestInventoryReadOnly({ companyId, player }: { companyId: string; player: DoohPlayerDetailView }) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const moduleAccess = snapshot?.modules.DOOH;
  const allowed = canReadManifestInventory(companyId, user?.companyId, snapshot?.companyId,
    moduleAccess?.granted, moduleAccess?.accessMode, user?.roles ?? []);
  const key = JSON.stringify([companyId, user?.id, [...(user?.roles ?? [])].sort(),
    snapshot?.companyId, moduleAccess?.granted, moduleAccess?.accessMode,
    player.id, player.lifecycleStatus, player.desiredManifestVersion, player.currentManifestVersion]);
  const keyRef = useRef(key); keyRef.current = key;
  const ongoing = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ key: string; value: DoohManifestInventoryView } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    ongoing.current?.abort(); setResult(null); setError(''); setLoading(false);
    return () => ongoing.current?.abort();
  }, [key]);

  async function inspect() {
    if (!allowed || loading) return;
    ongoing.current?.abort();
    const ctl = new AbortController(); ongoing.current = ctl;
    const requestKey = key;
    const active = () => !ctl.signal.aborted && keyRef.current === requestKey;
    setLoading(true); setResult(null); setError('');
    try {
      const { data } = await apiClient.get<unknown>(
        `/dooh/manifests/players/${encodeURIComponent(player.id)}/inventory`, { signal: ctl.signal });
      if (!active()) return;
      const parsed = parseDoohManifestInventory(data, companyId, player);
      if (!parsed) { setError('Resposta incompatível ou revisão diferente. Atualize o detalhe do player.'); return; }
      setResult({ key: requestKey, value: parsed });
    } catch (cause: unknown) { if (active()) setError(manifestInventoryError(cause)); }
    finally { if (ongoing.current === ctl) ongoing.current = null; if (active()) setLoading(false); }
  }

  if (!allowed) return null;
  const current = result?.key === key ? result.value : null;
  return <section aria-label="Inventário de manifests do player" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h5 className="text-sm font-semibold text-gray-900">Inventário de manifests — D16A01</h5>
        <p className="text-xs text-gray-600">Consulta sob demanda de metadados persistidos do player selecionado.</p></div>
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void inspect()}>
        {loading ? 'Consultando…' : 'Consultar manifests'}
      </Button>
    </div>
    <p className="text-xs text-amber-800">Checksum apenas registrado, não recalculado. Versão atual é informação técnica reportada; igualdade entre versões não prova entrega, integridade, exibição ou audiência.</p>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    {current && <div className="space-y-3 text-sm text-gray-700">
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <p>Versão atual: <strong>{current.currentManifestVersion}</strong></p>
        <p>Versão desejada: <strong>{current.desiredManifestVersion}</strong></p>
        <p>Última persistida: <strong>{current.latestRecordedVersion ?? 'Nenhuma'}</strong></p>
      </div>
      <p className="text-xs">Exibindo {current.records.length} versões, limite de 50{current.hasMore ? ' (existem versões anteriores)' : ''}.</p>
      {current.records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <thead><tr><th className="py-2 pr-3">Versão</th><th className="py-2 pr-3">Checksum registrado (prefixo)</th><th className="py-2">Gravado em</th></tr></thead>
        <tbody>{current.records.map((item) => <tr key={item.version} className="border-t"><td className="py-2 pr-3">{item.version}</td>
          <td className="py-2 pr-3 font-mono">{item.checksumShort}</td><td className="py-2">{new Date(item.publishedAt).toLocaleString('pt-BR')}</td></tr>)}</tbody>
      </table></div> : <p className="text-xs">Nenhum manifest registrado na janela de consulta.</p>}
      {manifestInventorySignals(current).length > 0 && <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
        {manifestInventorySignals(current).map((s) => <li key={s}>{s}</li>)}
      </ul>}
    </div>}
  </section>;
}
