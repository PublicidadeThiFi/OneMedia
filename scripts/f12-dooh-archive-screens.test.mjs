import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOperationalScreen, friendlyOperationalScreenError } from '../src/lib/doohOperationalScreenContract.ts';
const id = '11111111-1111-4111-8111-111111111111';
const raw = { id, name: 'TV', orientation: 'LANDSCAPE', fitMode: 'CONTAIN', locationLabel: null, playerId: null, player: null, commercialUnit: null, status: 'WAITING_FOR_PLAYER' };

test('tela arquivada traz a data; resposta antiga sem o campo continua aceita', () => {
  assert.equal(parseOperationalScreen({ ...raw, archivedAt: '2026-11-27T12:00:00.000Z' }).archivedAt, '2026-11-27T12:00:00.000Z');
  assert.equal(parseOperationalScreen({ ...raw, archivedAt: null }).archivedAt, null);
  assert.equal('archivedAt' in parseOperationalScreen(raw), false);
  assert.equal(parseOperationalScreen({ ...raw, archivedAt: 'ontem' }), null);
  assert.equal(parseOperationalScreen({ ...raw, archivedAt: 5 }), null);
});

test('motivos de recusa do arquivamento em linguagem simples', () => {
  const err = code => ({ response: { data: { code } } });
  assert.match(friendlyOperationalScreenError(err('DOOH_OPERATIONAL_SCREEN_ARCHIVE_HAS_PLAYER')), /Desconecte o aparelho/);
  assert.match(friendlyOperationalScreenError(err('DOOH_OPERATIONAL_SCREEN_ARCHIVE_HAS_UNIT')), /Marketplace/);
  assert.match(friendlyOperationalScreenError(err('DOOH_OPERATIONAL_SCREEN_ARCHIVED')), /Restaure/);
});

test('só tela vazia oferece arquivar, com confirmação; arquivadas carregam só quando abertas', () => {
  const panel = readFileSync(new URL('../src/components/DoohOperationalScreensPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /!screen\.player && !screen\.commercialUnit && <button.*>Arquivar tela<\/button>/);
  assert.match(panel, /role="alertdialog" aria-label="Confirmar arquivamento"/);
  assert.match(panel, /\/archive`\)/);
  const archived = readFileSync(new URL('../src/components/DoohArchivedScreens.tsx', import.meta.url), 'utf8');
  assert.match(archived, /if \(!open\) return;/);
  assert.match(archived, /archived: true/);
  assert.match(archived, /\/restore`\)/);
  assert.doesNotMatch(archived, /apiClient\.delete/);
});
