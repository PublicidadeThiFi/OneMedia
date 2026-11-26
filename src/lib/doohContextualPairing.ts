import { parsePairResult, type PairResult } from './doohPlayerPairingContract.ts';
import { parseOperationalScreen, type OperationalScreen } from './doohOperationalScreenContract.ts';

/** Pair and bind are separate server transactions. Retain a confirmed player on a bind failure. */
export function confirmedPair(data: unknown, name: string): PairResult {
  const player = parsePairResult(data);
  if (!player || player.name !== name) throw new Error('PAIR_RESPONSE_UNCONFIRMED');
  return player;
}
export async function bindConfirmedPlayer(screenId: string, player: PairResult, put: (screenId: string, playerId: string) => Promise<unknown>): Promise<OperationalScreen> {
  if (player.lifecycle !== 'ACTIVE') throw new Error('PLAYER_INACTIVE');
  const screen = parseOperationalScreen(await put(screenId, player.playerId));
  if (!screen || screen.id !== screenId || screen.playerId !== player.playerId) throw new Error('BIND_RESPONSE_UNCONFIRMED');
  return screen;
}
