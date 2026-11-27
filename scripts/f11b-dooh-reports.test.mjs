import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doohReportParams, doohReportWindow, parseDoohReportSummary, doohReportDayLabel } from '../src/lib/doohReportsContract.ts';
const company='11111111-1111-4111-8111-111111111111', player='22222222-2222-4222-8222-222222222222';
const zero={PLAYED:0,INTERRUPTED:0,FAILED:0,OTHER:0};
const summary=(over={})=>({schemaVersion:1,companyId:company,reportType:'PLAYBACK_EVENTS_SUMMARY',timeBasis:'PLAYER_STARTED_AT',
  window:{from:'2026-11-27T03:00:00.000Z',to:'2026-11-27T12:00:00.000Z',boundary:'[from,to)'},groupBy:'PLAYER',filters:{},
  metricKind:'PERSISTED_IDEMPOTENT_PLAYBACK_EVENTS',evidenceKind:'PLAYER_REPORTED',physicalDisplayVerified:false,countsTransportAttempts:false,
  retentionMode:'HOLD_NO_PURGE',totalPersisted:12,byResult:{...zero,PLAYED:11,INTERRUPTED:1},
  groups:[{groupKey:player,totalPersisted:12,byResult:{...zero,PLAYED:11,INTERRUPTED:1}}],generatedAt:'2026-11-27T12:00:01.000Z',...over});

test('a consulta respeita o contrato D9B: até 7 dias, terminando agora, pelo horário do aparelho', () => {
  const now=new Date('2026-11-27T12:00:30.500Z');
  const p=doohReportParams('7d','MEDIA_VERSION',now);
  assert.deepEqual(Object.keys(p).sort(),['from','groupBy','reportType','schemaVersion','timeBasis','to']);
  assert.equal(p.schemaVersion,'1');assert.equal(p.reportType,'PLAYBACK_EVENTS_SUMMARY');assert.equal(p.timeBasis,'PLAYER_STARTED_AT');
  assert.equal(p.to,'2026-11-27T12:00:30.000Z');assert.ok(Date.parse(p.to)-Date.parse(p.from)<=7*86400000);
  const today=doohReportWindow('today',now);assert.ok(Date.parse(today.from)<Date.parse(today.to));assert.ok(Date.parse(today.to)-Date.parse(today.from)<=86400000);
});

test('o resumo só é aceito se for da própria empresa e declarado como relato do aparelho', () => {
  const ok=parseDoohReportSummary(summary(),company,'PLAYER');
  assert.equal(ok.total,12);assert.equal(ok.byResult.PLAYED,11);assert.equal(ok.groups[0].groupKey,player);
  assert.equal(parseDoohReportSummary(summary({companyId:'33333333-3333-4333-8333-333333333333'}),company,'PLAYER'),null);
  assert.equal(parseDoohReportSummary(summary({physicalDisplayVerified:true}),company,'PLAYER'),null);
  assert.equal(parseDoohReportSummary(summary(),company,'DAY_UTC'),null,'agrupamento diferente do pedido');
  assert.equal(parseDoohReportSummary(summary({groups:[{groupKey:'x',totalPersisted:1,byResult:zero}]}),company,'PLAYER'),null);
  assert.equal(parseDoohReportSummary(summary({totalPersisted:-1}),company,'PLAYER'),null);
  const days=parseDoohReportSummary(summary({groupBy:'DAY_UTC',groups:[{groupKey:'2026-11-27',totalPersisted:2,byResult:{...zero,PLAYED:2}},{groupKey:'2026-11-26',totalPersisted:1,byResult:{...zero,PLAYED:1}}]}),company,'DAY_UTC');
  assert.deepEqual(days.groups.map(g=>g.groupKey),['2026-11-26','2026-11-27']);assert.equal(doohReportDayLabel('2026-11-27'),'27/11/2026');
});

test('a página de Relatórios usa os dados reais e não mostra mais "em preparação"', () => {
  const page=readFileSync(new URL('../src/components/DoohFoundationPage.tsx',import.meta.url),'utf8');
  assert.match(page,/section === 'reports' && <DoohReportsPanel \/>/);assert.doesNotMatch(page,/em preparação/);
  const panel=readFileSync(new URL('../src/components/DoohReportsPanel.tsx',import.meta.url),'utf8');
  assert.match(panel,/'\/dooh\/reports\/summary'/);assert.match(panel,/não uma verificação física/);
});
