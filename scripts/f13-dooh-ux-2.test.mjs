import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOperationalScreen } from '../src/lib/doohOperationalScreenContract.ts';
import { screenNeedsAttention, summarizeDoohScreens, diagnosticSummaryRows, parseScreenDiagnostic } from '../src/lib/doohScreenDiagnosticContract.ts';
import { parseScreenTimeline, timelineNowText } from '../src/lib/doohScreenTimelineContract.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const id = '11111111-1111-4111-8111-111111111111', playerId = '22222222-2222-4222-8222-222222222222', companyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const t0 = Date.parse('2026-11-27T12:00:00.000Z');
const at = (h) => new Date(t0 + h * 3600000).toISOString();
const noDevice = parseOperationalScreen({ id, name: 'Totem', orientation: 'PORTRAIT', fitMode: 'COVER', locationLabel: null, playerId: null, player: null, commercialUnit: null, status: 'WAITING_FOR_PLAYER' });
const silentRaw = { id, name: 'TV', orientation: 'LANDSCAPE', fitMode: 'CONTAIN', locationLabel: null, playerId, commercialUnit: null, status: 'NO_RECENT_CONTACT',
  player: { id: playerId, name: 'TV', lifecycleStatus: 'ACTIVE', lastSeenAt: at(-1), currentManifestVersion: '2', desiredManifestVersion: '2', credentialActive: true } };
const silent = parseOperationalScreen(silentRaw);

test('tela sem aparelho não conta como atenção, igual na Visão geral e na lista', () => {
  assert.equal(screenNeedsAttention(noDevice), false);
  assert.equal(screenNeedsAttention(silent), true);
  assert.equal(summarizeDoohScreens([noDevice, silent]).attention, 1);
  const panel = read('src/components/DoohOperationalScreensPanel.tsx');
  assert.doesNotMatch(panel, /screenOperationalSummary\(s\)\.attention/);
  assert.match(read('src/components/DoohFoundationPage.tsx'), /<DoohOperationalScreensPanel attentionOnly \/>/);
  assert.match(panel, /Precisa de atenção/);
  assert.match(panel, /Ver todas as telas/);
});

test('linha "Agora" resume o trecho atual e o próximo diferente', () => {
  const tl = parseScreenTimeline({ screenId: id, observedAt: at(0), state: 'INSTALLED', window: { from: at(-2), to: at(20) }, segments: [
    { from: at(-2), to: at(6), status: 'READY', itemCount: 1, items: [{ name: 'Promo Natal', durationMs: 10000 }] },
    { from: at(6), to: at(20), status: 'READY', itemCount: 1, items: [{ name: 'Cardápio', durationMs: 10000 }] }] }, id);
  const text = timelineNowText(tl, new Date(t0));
  assert.match(text, /^Agora: Promo Natal · \d{2}:\d{2} Cardápio$/);
  assert.equal(timelineNowText({ ...tl, segments: [] }, new Date(t0)), '');
});

test('diagnóstico começa por 3 linhas simples e mantém o resto para o suporte', () => {
  const diag = parseScreenDiagnostic({ companyId, screenId: id, observedAt: at(0), scope: 'TECHNICAL_SNAPSHOT_ONLY', player: { id: playerId, lifecycleStatus: 'ACTIVE', lastSeenAt: at(-1), currentManifestVersion: '2', desiredManifestVersion: '2', credentialActive: true, integrity: 'VERIFIED_SERVER_PAYLOAD', window: { from: at(-2), to: at(2) }, manifestPublishedAt: at(-3), scheduleState: 'READY', lastEvent: { result: 'PLAYED', receivedAt: at(-1), startedAt: at(-1) } } }, companyId, silent);
  assert.ok(diag);
  const rows = diagnosticSummaryRows(silent, diag.player, t0);
  assert.deepEqual(rows.map(r => r.label), ['Comunicação', 'Programação instalada', 'Licença']);
  assert.equal(rows[0].ok, false); assert.equal(rows[0].value, 'há 1 h');
  assert.deepEqual([rows[1].value, rows[1].ok], ['a mais recente', true]);
  assert.equal(rows[2].ok, false);
  assert.match(read('src/components/DoohScreenDiagnostic.tsx'), /Detalhes para o suporte/);
});

test('editor: passos, miniaturas, atalhos de tempo e ações secundárias recolhidas', () => {
  const wizard = read('src/components/DoohScreenContentWizard.tsx');
  assert.match(wizard, /'Mídias', 'Ordem', 'Quando exibir'/);
  assert.match(wizard, /role="radiogroup" aria-label="Mídia para a tela"/);
  assert.match(wizard, /DURATION_SHORTCUTS = \['5', '10', '15', '30'\]/);
  assert.match(wizard, /duration\.replace\(',', '\.'\)/);
  assert.match(wizard, /versions\.length > 1 &&/);
  assert.doesNotMatch(wizard, /86400 segundos/);
  const pub = read('src/components/DoohScreenPublicationWizard.tsx');
  assert.match(pub, /<summary className="cursor-pointer font-medium">Mais ações<\/summary>/);
  assert.ok(pub.indexOf('Mais ações') > pub.indexOf("'Publicar alterações'"));
});

test('pareamento com campo de código grande e sem jargão', () => {
  assert.match(read('src/components/DoohContextualPairing.tsx'), /O código aparece na TV quando você abre o Player/);
  assert.doesNotMatch(read('src/components/DoohPlayerPairingAndAssignment.tsx'), /unidade SCREEN|SCREEN validada|papel técnico|lifecycleStatus\}/);
});

test('Mídias: menu ⋯ no card, Nova pasta e área de arrastar', () => {
  const lib = read('src/components/DoohMediaLibraryReadOnly.tsx');
  assert.match(lib, /'Renomear' : action === 'move' \? 'Mover para pasta' : 'Ver versões'/);
  assert.match(lib, /\+ Nova pasta/);
  assert.match(read('src/components/DoohMediaUpload.tsx'), /Arraste o arquivo aqui ou clique para escolher/);
});

test('Várias telas: ações na linha, sem 3º nível de abas, sem digitar PUBLICAR', () => {
  const cat = read('src/components/DoohPlaylistCatalogReadOnly.tsx');
  assert.doesNotMatch(cat, /DoohWorkspaceTabs/);
  assert.match(cat, />Editar<\/Button>/); assert.match(cat, />Publicar<\/Button>/); assert.match(cat, />Versões<\/Button>/);
  for (const f of ['DoohPlaylistPublishQa', 'DoohSchedulePublishQa']) {
    const src = read(`src/components/${f}.tsx`);
    assert.doesNotMatch(src, /Digite PUBLICAR/, f);
    assert.match(src, /await ask\(/, f);
    assert.match(src, /publish-cas/, f);
  }
});
