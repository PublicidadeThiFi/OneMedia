import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useInlineConfirm } from './DoohInlineConfirm';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { DoohSchedulePlayerPicker } from './DoohSchedulePlayerPicker';
import { parseDoohPlayerInventoryResponse } from '../lib/doohPlayerInventoryContract';
import { parseDoohSchedule, parseDoohScheduleTargets,
  type DoohScheduleSummary, type DoohScheduleTargetInventory,
  type DoohScheduleTargetType } from '../lib/doohScheduleCatalogContract';
import { buildScheduleTargetsCas, canWriteScheduleTargets, doohScheduleTargetWriteError,
  parseScheduleTargetsCasReceipt, targetsSnapshotMatches,
  type TargetEdit } from '../lib/doohScheduleTargetsCasContract';

interface Props { companyId: string; summary: DoohScheduleSummary; inventory: DoohScheduleTargetInventory; onChanged: () => void; }
const targetText = { PLAYER: 'Tela', GROUP: 'Grupo', MEDIA_UNIT: 'Tela do Marketplace', MEDIA_POINT: 'Ponto do Marketplace' } as const;
/** D15D-02 — uma alteração confirmada por vez, integralmente conferida no servidor. */
export function DoohScheduleTargetsCasEditor({ companyId, summary, inventory, onChanged }: Props) {
  const { ask, confirmUi } = useInlineConfirm();
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
  // F13: only TI sees target types other than a screen and the raw identifier fields.
  const isTechnical = (user?.roles ?? []).some(role => role === 'TI');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!inventory.targets.some(t => t.targetType === 'PLAYER')) return;
    const controller = new AbortController();
    void apiClient.get<unknown>('/dooh/players', { params: { page: 1, pageSize: 100 }, signal: controller.signal })
      .then(({ data }) => { const parsed = parseDoohPlayerInventoryResponse(data); if (parsed && !controller.signal.aborted) setPlayerNames(Object.fromEntries(parsed.items.map(item => [item.id, item.name]))); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [companyId, inventory]);
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
    if (!await ask(`${label}\nEsta operação altera apenas os destinos do rascunho e não publica conteúdo.`)) return;
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
        setError('Alguém alterou esta agenda há pouco. Atualize e confira antes de salvar.'); return;
      }
      if (liveContext.current !== contextKey) { setError('Empresa, sessão ou acesso alterados. Atualize e tente novamente.'); return; }
      const response = await apiClient.put<unknown>(`/dooh/schedules/${encodeURIComponent(summary.id)}/targets/cas`, candidate);
      if (liveContext.current !== contextKey) return;
      if (!parseScheduleTargetsCasReceipt(response.data, summary.id, candidate.targets.length)) {
        setError('Não conseguimos confirmar se a alteração foi salva. Atualize para conferir.'); return;
      }
      setUuidInput(''); setAssociationId(''); setNotice('Edição confirmada. Recarregando o catálogo.');
      onChanged();
    } catch (requestError: unknown) {
      if (liveContext.current === contextKey) setError(doohScheduleTargetWriteError(requestError));
    } finally { setBusy(false); }
  }

  if (!writable) return <p className="mt-2 text-xs text-gray-600">Seu perfil não pode alterar as telas desta agenda.</p>;
  if (summary.status !== 'DRAFT') return <p className="mt-2 text-xs text-gray-600">As telas só podem ser alteradas enquanto a agenda estiver em rascunho.</p>;
  return <section aria-label="Onde exibir" className="mt-3 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/30 p-3">
    <h5 className="text-sm font-semibold text-gray-900">Onde essa agenda será exibida?</h5>
    <p className="text-xs text-gray-600">Escolha as telas pelo nome. Adicionar uma tela aqui ainda não começa a exibição.</p>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="block">Operação</span>
        <select aria-label="Operação de destino" className="w-full rounded-md border p-2" value={operation} disabled={busy}
          onChange={(event) => { setOperation(event.target.value as 'add' | 'remove'); setError(''); }}>
          <option value="add">Adicionar uma tela</option><option value="remove">Remover uma tela</option>
        </select>
      </label>
      {operation === 'add' ? <>
        {isTechnical && <label className="space-y-1 text-sm"><span className="block">Tipo de destino</span>
          <select aria-label="Tipo de destino" className="w-full rounded-md border p-2" value={type} disabled={busy}
            onChange={(event) => { setType(event.target.value as DoohScheduleTargetType); setUuidInput(''); }}>
            {Object.entries(targetText).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>
        </label>}
        {type === 'PLAYER' && <div className="md:col-span-2 space-y-2">
          <DoohSchedulePlayerPicker companyId={companyId} value={uuidInput} onChange={setUuidInput} disabled={busy} />
          {isTechnical && <details className="rounded-md bg-white p-2 text-xs text-gray-600"><summary className="cursor-pointer">Selecionar pelo identificador (suporte)</summary>
            <label className="mt-2 block">UUID do dispositivo
              <input aria-label="UUID do destino" className="mt-1 w-full rounded-md border p-2 font-mono" maxLength={36} value={uuidInput}
                onChange={e => setUuidInput(e.target.value)} disabled={busy} />
            </label>
          </details>}
        </div>}
        {isTechnical && type !== 'PLAYER' && <label className="space-y-1 text-sm"><span className="block">Identificador do destino</span>
          <input aria-label="UUID do destino" className="w-full rounded-md border p-2" placeholder="UUID de grupo, tela ou ponto"
            value={uuidInput} maxLength={36} disabled={busy} onChange={(event) => setUuidInput(event.target.value)} />
        </label>}
      </> : <label className="space-y-1 text-sm md:col-span-2"><span className="block">Tela a remover</span>
        <select aria-label="Destino para remover" className="w-full rounded-md border p-2" value={associationId} disabled={busy}
          onChange={(event) => setAssociationId(event.target.value)}>
          <option value="">Selecione</option>
          {inventory.targets.map((item) => <option key={item.id} value={item.id}>{targetText[item.targetType]} · {playerNames[item.targetId] ?? `código ${item.targetId.slice(0, 8)}`}</option>)}
        </select>
      </label>}
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!candidate || busy}>{busy ? 'Conferindo…' : operation === 'add' ? 'Adicionar' : 'Remover'}</Button>
        <span className="text-xs text-gray-600">Até 100 telas por agenda. Só dá para mudar as telas enquanto a agenda estiver em rascunho.</span>
      </div>
    </form>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {confirmUi}
  </section>;
}
