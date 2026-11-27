import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Button } from './ui/button';
import { validPairingCode, safePairingError, type PairResult } from '../lib/doohPlayerPairingContract';
import { normalizedOperationalName } from '../lib/doohPlayerOperationsContract';
import { friendlyOperationalScreenError, type OperationalScreen } from '../lib/doohOperationalScreenContract';
import { parseDoohPlayerDetail } from '../lib/doohPlayerDetailContract';
import { confirmedPair, bindConfirmedPlayer } from '../lib/doohContextualPairing';

/** This panel is mounted only within the authorized, keyed operational-screen context. */
export function DoohContextualPairing({screen, onLinked, onClose, writable}: {screen: OperationalScreen; onLinked: (screen: OperationalScreen) => void; onClose: () => void; writable: boolean}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState(screen.name);
  const [ack, setAck] = useState(false);
  const [paired, setPaired] = useState<PairResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const attempt = useRef<{code: string; name: string; key: string} | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!writable || busy || pending.current) return;
    const normalized = validPairingCode(code), label = normalizedOperationalName(name);
    if (!paired && (!ack || !normalized || !label || !globalThis.crypto?.randomUUID)) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    let result = paired;
    try {
      if (!result && normalized && label) {
        const previous = attempt.current;
        const key = previous?.code === normalized && previous.name === label ? previous.key : crypto.randomUUID();
        attempt.current = {code: normalized, name: label, key};
        const response = await apiClient.post<unknown>('/dooh/players/pair', {code: normalized, name: label}, {headers: {'Idempotency-Key': key}, signal: controller.signal});
        if (controller.signal.aborted) return;
        result = confirmedPair(response.data, label);
        setPaired(result); setCode('');
      }
      if (!result || controller.signal.aborted) return;
      if (result.lifecycle !== 'ACTIVE') { setError('O aparelho foi pareado, mas não está ativo. Confira a licença em Gerenciar dispositivos. Não gere outro código.'); return; }
      if (!screen.commercialUnit) {
        const detail = await apiClient.get<unknown>(`/dooh/players/${encodeURIComponent(result.playerId)}`, {signal:controller.signal});
        if (controller.signal.aborted) return;
        const verified = parseDoohPlayerDetail(detail.data,result.playerId);
        if (!verified || verified.lifecycleStatus !== 'ACTIVE') {setError('O pareamento foi preservado, mas o aparelho não pôde ser validado. Confira em Gerenciar dispositivos.');return;}
        if (verified.screen) {setError('Este aparelho já está vinculado ao inventário comercial. Escolha outro para a tela independente; o vínculo atual foi preservado.');return;}
      }
      const linked = await bindConfirmedPlayer(screen.id, result, async (screenId, playerId) => (await apiClient.put<unknown>(`/dooh/operational-screens/${encodeURIComponent(screenId)}/player`, {playerId}, {signal: controller.signal})).data);
      if (!controller.signal.aborted) onLinked(linked);
    } catch (cause) {
      if (!controller.signal.aborted) setError(result ? `Pareamento preservado. ${friendlyOperationalScreenError(cause)} Tente apenas conectar o aparelho novamente.` : safePairingError(cause));
    } finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return <form onSubmit={event => void submit(event)} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4" aria-label={`Conectar aparelho à tela ${screen.name}`}>
    <h3 className="font-semibold">Conectar aparelho · {screen.name}</h3>
    {paired ? <p role="status" className="text-sm">Aparelho “{paired.name}” pareado. Não é necessário gerar outro código.</p> : <>
      <p className="text-sm text-gray-700">Abra o Player no aparelho que vai exibir o conteúdo e informe o código mostrado nele.</p>
      <a href="https://player.onemediaap.com.br" target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-indigo-700 underline">Abrir Player Web</a>
      <label className="block text-sm font-medium">Código exibido no aparelho<input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} value={code} disabled={busy || !writable} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" aria-describedby="f13-pair-code-help" className="mt-1 block w-full rounded-lg border-2 border-indigo-200 bg-white p-3 text-center font-mono text-2xl uppercase tracking-widest focus-visible:border-indigo-500 focus-visible:outline-none" required /></label>
      <p id="f13-pair-code-help" className="-mt-2 text-xs text-gray-600">O código aparece na TV quando você abre o Player.</p>
      <label className="block text-sm">Nome do aparelho<input maxLength={120} value={name} disabled={busy || !writable} onChange={e => setName(e.target.value)} className="block w-full rounded-md border bg-white p-2" required /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ack} disabled={busy || !writable} onChange={e => setAck(e.target.checked)} /> Entendo que este aparelho passa a usar uma licença do meu plano.</label>
    </>}
    {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!writable || busy || (paired ? paired.lifecycle !== 'ACTIVE' : !ack || !validPairingCode(code) || !normalizedOperationalName(name))}>{busy ? 'Conectando…' : paired ? 'Tentar conectar novamente' : 'Confirmar e conectar'}</Button><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{paired ? 'Voltar às telas' : 'Cancelar'}</Button></div>
  </form>;
}
