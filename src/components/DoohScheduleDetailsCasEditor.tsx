import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useProductAccess } from '../contexts/ProductAccessContext';
import { Button } from './ui/button';
import { parseDoohSchedule, type DoohSchedulePriority, type DoohScheduleSummary } from '../lib/doohScheduleCatalogContract';
import { buildScheduleDetailsCas, canWriteDoohScheduleDetails, detailsFormFromSchedule,
  doohScheduleDetailsError, normalizeScheduleDetailsForm, parseScheduleDetailsReceipt,
  scheduleDetailsSnapshotMatches, type DoohScheduleDetailsForm } from '../lib/doohScheduleDetailsCasContract';
interface Props {
  companyId: string;
  mode: 'create' | 'edit';
  summary?: DoohScheduleSummary | null;
  existingIds: readonly string[];
  onChanged: () => void;
}
const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
/** D15D-03: create only DRAFT or atomically update a reviewed DRAFT. No publishing. */
export function DoohScheduleDetailsCasEditor({ companyId, mode, summary = null, existingIds, onChanged }: Props) {
  const { user } = useAuth();
  const { snapshot } = useProductAccess();
  const access = snapshot?.modules.DOOH;
  const writable = companyId === user?.companyId && canWriteDoohScheduleDetails(companyId,
    snapshot?.companyId, access?.granted, access?.accessMode, user?.roles ?? []);
  const contextKey = JSON.stringify([user?.id, user?.companyId, snapshot?.companyId, access?.granted,
    access?.accessMode, [...(user?.roles ?? [])].sort(), mode, summary?.id, summary?.updatedAt]);
  const contextRef = useRef(contextKey); contextRef.current = contextKey;
  const controllerRef = useRef<AbortController | null>(null);
  const [form, setForm] = useState<DoohScheduleDetailsForm>(() => detailsFormFromSchedule(summary));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    controllerRef.current?.abort(); controllerRef.current = null;
    setForm(detailsFormFromSchedule(summary)); setBusy(false); setError(''); setNotice('');
    return () => { controllerRef.current?.abort(); };
  }, [contextKey]);
  const update = (field: keyof DoohScheduleDetailsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value })); setError('');
  };
  const normalized = normalizeScheduleDetailsForm(form);
  const mutation = summary ? buildScheduleDetailsCas(summary, form) : null;
  const enabled = writable && !busy && normalized !== null && (mode === 'create' || mutation !== null) &&
    (mode !== 'edit' || summary?.status === 'DRAFT');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!enabled || !normalized) return;
    const original = mode === 'edit' ? summary : null;
    if (mode === 'edit' && (!original || !mutation)) return;
    const message = mode === 'create'
      ? `Criar agenda "${normalized.name}" em DRAFT, usando a versão publicada ${normalized.playlistVersionId}? Nenhuma publicação ou distribuição ocorrerá.`
      : `Salvar alterações em "${original?.name}"? A atualização será recusada se o rascunho tiver sido modificado.`;
    if (!window.confirm(message)) return;
    const controller = new AbortController(); controllerRef.current = controller;
    const initialContext = contextKey;
    const stillValid = () => !controller.signal.aborted && contextRef.current === initialContext;
    setBusy(true); setError(''); setNotice('');
    try {
      let response: { data: unknown };
      if (mode === 'edit' && original && mutation) {
        const { data } = await apiClient.get<unknown>(`/dooh/schedules/${encodeURIComponent(original.id)}`,
          { signal: controller.signal });
        if (!stillValid()) return;
        const fresh = parseDoohSchedule(data, companyId);
        if (!fresh || !scheduleDetailsSnapshotMatches(original, fresh)) {
          setError('A agenda foi alterada. Atualize o catálogo e revise os dados.'); return;
        }
        response = await apiClient.patch<unknown>(`/dooh/schedules/${encodeURIComponent(original.id)}/details-cas`,
          mutation, { signal: controller.signal });
      } else {
        response = await apiClient.post<unknown>('/dooh/schedules', normalized, { signal: controller.signal });
      }
      if (!stillValid()) return;
      const confirmed = parseScheduleDetailsReceipt(response.data, companyId, original, normalized, existingIds);
      if (!confirmed) {
        setError('A API não confirmou exatamente a operação. Consulte o catálogo antes de tentar novamente.'); return;
      }
      setNotice('Agenda registrada como DRAFT. Nenhuma programação foi publicada ou distribuída.');
      onChanged();
      if (mode === 'create') setForm(detailsFormFromSchedule(null));
    } catch (reason: unknown) {
      if (stillValid()) setError(doohScheduleDetailsError(reason));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (stillValid()) setBusy(false);
    }
  }

  if (!writable) return <p className="text-xs text-gray-600">Criar ou editar agendas exige DOOH FULL e função ADMINISTRATIVO ou TI.</p>;
  if (mode === 'edit' && summary?.status !== 'DRAFT') return <p className="text-xs text-gray-600">Apenas agendas DRAFT podem ser editadas.</p>;
  return <section aria-label="Criação e edição CAS de agendas D15D-03" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/20 p-4">
    <h4 className="font-semibold text-gray-900">{mode === 'create' ? 'Criar agenda em rascunho' : 'Editar dados da agenda — CAS'}</h4>
    <p className="text-xs text-gray-600">A versão da playlist precisa estar publicada e pertencer à empresa. Informe datas ISO-8601 com fuso explícito (Z ou ±HH:MM). Datas em branco não limitam a agenda. Nada será publicado, ativado ou distribuído.</p>
    <form onSubmit={(event) => { void submit(event); }} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">Nome da agenda
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Nome da agenda" value={form.name} maxLength={160} disabled={busy} onChange={e => update('name', e.target.value)} />
      </label>
      <label className="text-sm">UUID da versão publicada da playlist
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Versão publicada da playlist" value={form.playlistVersionId} maxLength={36} disabled={busy} onChange={e => update('playlistVersionId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </label>
      <label className="text-sm">Prioridade
        <select className="mt-1 block w-full rounded-md border p-2" aria-label="Prioridade da agenda" value={form.priority} disabled={busy}
          onChange={e => update('priority', e.target.value as DoohSchedulePriority)}>
          <option value="STANDARD">Padrão</option><option value="TAKEOVER">Prioritária</option><option value="FALLBACK">Reserva</option>
        </select>
      </label>
      <label className="text-sm">Timezone IANA
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Timezone IANA" maxLength={64} value={form.timezone} disabled={busy} onChange={e => update('timezone', e.target.value)} placeholder="America/Sao_Paulo" />
      </label>
      <label className="text-sm">Início (ISO-8601 com offset)
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Início ISO" value={form.startsAt} disabled={busy} onChange={e => update('startsAt', e.target.value)} placeholder="2026-10-20T08:00:00-03:00" />
      </label>
      <label className="text-sm">Fim (ISO-8601 com offset)
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Fim ISO" value={form.endsAt} disabled={busy} onChange={e => update('endsAt', e.target.value)} placeholder="2026-10-20T22:00:00-03:00" />
      </label>
      <label className="text-sm">Início da faixa diária (HH:mm)
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Início diário" value={form.dailyStart} maxLength={5} disabled={busy} onChange={e => update('dailyStart', e.target.value)} placeholder="08:00" />
      </label>
      <label className="text-sm">Fim da faixa diária (HH:mm; permite 24:00)
        <input className="mt-1 block w-full rounded-md border p-2" aria-label="Fim diário" value={form.dailyEnd} maxLength={5} disabled={busy} onChange={e => update('dailyEnd', e.target.value)} placeholder="20:00" />
      </label>
      <fieldset className="md:col-span-2 space-y-2">
        <legend className="text-sm font-medium">Dias permitidos (nenhum selecionado = sem restrição semanal)</legend>
        <div className="flex flex-wrap gap-3">{weekdayLabels.map((day, i) => <label key={day} className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={form.weekdays.includes(i + 1)} disabled={busy} onChange={e => {
            setForm(prev => ({ ...prev, weekdays: e.target.checked ? [...prev.weekdays, i + 1].sort() : prev.weekdays.filter(d => d !== i + 1) })); setError('');
          }} />{day}</label>)}</div>
      </fieldset>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!enabled}>{busy ? 'Conferindo…' : mode === 'create' ? 'Criar rascunho com confirmação' : 'Salvar alterações com CAS'}</Button>
        <span className="text-xs text-gray-600">Sem destino, publicação, manifest ou comando de player.</span>
      </div>
    </form>
    {!normalized && <p className="text-xs text-amber-800">Preencha UUID, nome e fuso válidos. As datas precisam de offset; faixa diária deve ter início anterior ao fim.</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
  </section>;
}
