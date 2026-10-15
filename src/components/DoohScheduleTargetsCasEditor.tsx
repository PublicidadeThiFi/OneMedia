import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohSchedule, parseDoohScheduleTargets,
  type DoohScheduleSummary, type DoohScheduleTargetInventory,
  type DoohScheduleTargetType } from '../lib/doohScheduleCatalogContract';
import { buildScheduleTargetsCas, canWriteScheduleTargets, doohScheduleTargetWriteError,
  parseScheduleTargetsCasReceipt, targetsSnapshotMatches,
  type TargetEdit } from '../lib/doohScheduleTargetsCasContract';

interface Props { companyId: string; summary: DoohScheduleSummary; inventory: DoohScheduleTargetInventory; onChanged: () => void; }
const targetText = { PLAYER: 'Player', GROUP: 'Grupo', MEDIA_UNIT: 'Tela SCREEN', MEDIA_POINT: 'Ponto DOOH' } as const;
/** D15D-02 — uma alteração confirmada por vez, integralmente conferida no servidor. */
export function DoohScheduleTargetsCasEditor({ companyId, summary, inventory, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const access = snapshot?.modules.DOOH;
  const writable = user?.companyId === companyId && canWriteScheduleTargets(companyId,
    snapshot?.companyId, access?.granted, access?.accessMode, user?.roles ?? []);
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [type, setType] = useState<DoohScheduleTargetType>('PLAYER');
  const [uuidInput, setUuidInput] = useState('');
  const [associationId, setAssociationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId,
    access?.granted, access?.accessMode, [...(user?.roles ?? [])].sort(), summary.id, summary.updatedAt]);
  const liveContext = useRef(contextKey);
  liveContext.current = contextKey;
  useEffect(() => { setOperation('add'); setUuidInput(''); setAssociationId(''); setError(''); setNotice(''); }, [contextKey]);
  const edit: TargetEdit = operation === 'add' ? { action: 'add', type, id: uuidInput } : { action: 'remove', associationId };
  const candidate = buildScheduleTargetsCas(summary, inventory, edit);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!writable || busy || summary.status !== 'DRAFT' || !candidate) return;
    const selected = inventory.targets.find((t) => t.id === associationId);
    const label = operation === 'add' ? `Adicionar ${targetText[type]} ${uuidInput.trim()} à agenda "${summary.name}"?` :
      `Remover ${selected ? targetText[selected.targetType] : 'destino'} ${selected?.targetId ?? ''} da agenda "${summary.name}"?`;
    if (!window.confirm(`${label}\nEsta operação altera apenas os destinos do rascunho e não publica conteúdo.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const controller = new AbortController();
      const [scheduleResponse, targetResponse] = await Promise.all([
        apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}`, { signal: controller.signal }),
        apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/targets`, { signal: controller.signal }),
      ]);
      const current = parseDoohSchedule(scheduleResponse.data, companyId);
      const fresh = current && parseDoohScheduleTargets(targetResponse.data, companyId, current);
      if (!current || JSON.stringify(current) !== JSON.stringify(summary) || !fresh ||
          !targetsSnapshotMatches(inventory, fresh)) {
        setError('Agenda ou destinos modificados desde a consulta. Atualize o catálogo antes de editar.'); return;
      }
      if (liveContext.current !== contextKey) { setError('Empresa, sessão ou acesso alterados. Atualize e tente novamente.'); return; }
      const response = await apiClient.put<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/targets/cas`, candidate);
      if (liveContext.current !== contextKey) return;
      if (!parseScheduleTargetsCasReceipt(response.data, summary.id, candidate.targets.length)) {
        setError('A API não confirmou exatamente a edição solicitada. Atualize a agenda.'); return;
      }
      setUuidInput(''); setAssociationId(''); setNotice('Edição confirmada. Recarregando o catálogo.');
      onChanged();
    } catch (requestError: unknown) {
      if (liveContext.current === contextKey) setError(doohScheduleTargetWriteError(requestError));
    } finally { setBusy(false); }
  }

  if (!writable) return <p className="mt-2 text-xs text-gray-600">Edição de destinos exige DOOH FULL e função técnica.</p>;
  if (summary.status !== 'DRAFT') return <p className="mt-2 text-xs text-gray-600">Somente agendas em rascunho podem ter destinos alterados.</p>;
  return <section aria-label="Edição CAS de destinos DOOH D15D-02" className="mt-3 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/30 p-3">
    <h5 className="text-sm font-semibold text-gray-900">Editar destinos do rascunho — D15D-02</h5>
    <p className="text-xs text-gray-600">Adicione ou remova um vínculo de cada vez. Informe um UUID já cadastrado: a API verificará se o player, grupo, tela ou ponto pertence à empresa e está disponível. Nenhuma exibição será iniciada.</p>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Operação</span>
        <select aria-label="Operação de destino" className="w-full rounded-md border p-2" value={operation} disabled={busy}
          onChange={(event) => { setOperation(event.target.value as 'add' | 'remove'); setError(''); }}>
          <option value="add">Adicionar destino</option><option value="remove">Remover destino</option>
        </select>
      </label>
      {operation === 'add' ? <>
        <label className="space-y-1 text-sm"><span className="block">Tipo</span>
          <select aria-label="Tipo de destino" className="w-full rounded-md border p-2" value={type} disabled={busy}
            onChange={(event) => setType(event.target.value as DoohScheduleTargetType)}>
            {Object.entries(targetText).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="block">UUID do destino</span>
          <input aria-label="UUID do destino" className="w-full rounded-md border p-2" placeholder="UUID de player, grupo, tela ou ponto"
            value={uuidInput} maxLength={36} disabled={busy} onChange={(event) => setUuidInput(event.target.value)} />
        </label>
      </> : <label className="space-y-1 text-sm md:col-span-2"><span className="block">Vínculo a remover</span>
        <select aria-label="Destino para remover" className="w-full rounded-md border p-2" value={associationId} disabled={busy}
          onChange={(event) => setAssociationId(event.target.value)}>
          <option value="">Selecione um destino existente</option>
          {inventory.targets.map((item) => <option key={item.id} value={item.id}>{targetText[item.targetType]} · {item.targetId}</option>)}
        </select>
      </label>}
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!candidate || busy}>{busy ? 'Conferindo…' : operation === 'add' ? 'Adicionar com confirmação' : 'Remover com confirmação'}</Button>
        <span className="text-xs text-gray-600">Limite: 100 destinos. Agenda comercial protegida, status não-DRAFT ou snapshot obsoleto são bloqueados pelo backend.</span>
      </div>
    </form>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
