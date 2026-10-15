import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDoohSchedule } from '../src/lib/doohScheduleCatalogContract.ts';
import { canWriteDoohScheduleDetails, detailsFormFromSchedule, normalizeScheduleDetailsForm,
  buildScheduleDetailsCas, scheduleDetailsEqual, scheduleDetailsFromSummary, scheduleDetailsSnapshotMatches,
  parseScheduleDetailsReceipt, doohScheduleDetailsError } from '../src/lib/doohScheduleDetailsCasContract.ts';
const source = (p) => readFileSync(join(process.cwd(), p), 'utf8');
const COMPANY = '11111111-1111-4111-8111-111111111111';
const ID = '22222222-2222-4222-8222-222222222222';
const VERSION = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const STAMP = '2026-10-15T12:00:00.000Z';
const raw = { id: ID, companyId: COMPANY, playlistVersionId: VERSION, name: 'Operação QA',
  status: 'DRAFT', priority: 'STANDARD', timezone: 'America/Sao_Paulo',
  startsAt: null, endsAt: null, weekdays: [], dailyStartMinute: null, dailyEndMinute: null,
  createdAt: STAMP, updatedAt: STAMP, publishedAt: null, _count: { targets: 0 } };
const s = parseDoohSchedule(raw, COMPANY);
const form = detailsFormFromSchedule(s);
const changed = { ...form, name: 'Operação revisada', priority: 'TAKEOVER' };

test('D15D03-01: somente FULL técnico, grant e tenant correto permitem escrita', () => {
 assert.equal(canWriteDoohScheduleDetails(COMPANY, COMPANY, true, 'FULL', ['TI']), true);
 for (const [c, tenant, grant, mode, roles] of [
   [COMPANY, OTHER, true, 'FULL', ['TI']], [COMPANY, COMPANY, true, 'READ_ONLY', ['TI']],
   [COMPANY, COMPANY, false, 'FULL', ['TI']], [COMPANY, COMPANY, true, 'FULL', ['COMERCIAL']],
 ]) assert.equal(canWriteDoohScheduleDetails(c,tenant,grant,mode,roles), false);
});
test('D15D03-02: formulário inicial reflete rascunho, sem inventar datas ou dias', () => {
 assert.equal(form.name,s.name); assert.deepEqual(form.weekdays,[]);
 assert.equal(form.startsAt,''); assert.equal(form.dailyStart,'');
});
test('D15D03-03: criação converte janela sem limite em null e preserva timezone', () => {
 const dto = normalizeScheduleDetailsForm(form);
 assert.equal(dto.startsAt,null); assert.equal(dto.endsAt,null);
 assert.equal(dto.timezone,'America/Sao_Paulo'); assert.deepEqual(dto.weekdays,[]);
});
test('D15D03-04: horários com offset explícito e dias ISO ordenados', () => {
 const result = normalizeScheduleDetailsForm({ ...form, startsAt: '2026-10-20T10:00:00-03:00',
 endsAt: '2026-10-21T11:00:00-03:00', dailyStart: '08:30', dailyEnd: '24:00', weekdays: [7,3,1] });
 assert.equal(result.dailyStartMinute,510); assert.equal(result.dailyEndMinute,1440);
 assert.deepEqual(result.weekdays,[1,3,7]);
});
test('D15D03-05: rejeita timestamps sem offset, invertidos ou inválidos', () => {
 assert.equal(normalizeScheduleDetailsForm({...form,startsAt:'2026-10-20T10:00:00'}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,startsAt:'2026-10-21T10:00:00Z',endsAt:'2026-10-20T10:00:00Z'}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,startsAt:'not-a-date'}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,startsAt:'2026-02-31T10:00:00Z'}),null);
});
test('D15D03-06: recusa fuso desconhecido, UUID inválido e nome vazio', () => {
 assert.equal(normalizeScheduleDetailsForm({...form,timezone:'BRT'}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,playlistVersionId:'invalid'}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,name:'  '}),null);
});
test('D15D03-07: valida janela diária, pares e limite de horário', () => {
 for (const [a,b] of [['08:00',''], ['12:00','10:00'], ['24:00','24:00'], ['08:00','25:00'], ['08:99','09:00']])
   assert.equal(normalizeScheduleDetailsForm({...form,dailyStart:a,dailyEnd:b}),null);
});
test('D15D03-08: weekdays não podem duplicar nem sair de 1..7', () => {
 assert.equal(normalizeScheduleDetailsForm({...form,weekdays:[1,1]}),null);
 assert.equal(normalizeScheduleDetailsForm({...form,weekdays:[8]}),null);
});
test('D15D03-09: CAS inclui snapshot completo visto pelo operador', () => {
 const body=buildScheduleDetailsCas(s,changed);
 assert.equal(body.expected.updatedAt,STAMP);
 assert.equal(body.expected.playlistVersionId,VERSION);
 assert.deepEqual(body.expected.weekdays,[]);
 assert.equal(body.changes.priority,'TAKEOVER');
});
test('D15D03-10: CAS recusa no-op, não-DRAFT ou formulário inválido', () => {
 assert.equal(buildScheduleDetailsCas(s,form),null);
 assert.equal(buildScheduleDetailsCas({...s,status:'PUBLISHED'},changed),null);
 assert.equal(buildScheduleDetailsCas(s,{...form,timezone:'Invalid'}),null);
});
test('D15D03-11: comparação ignora representação do offset, mas não conteúdo', () => {
 const x=scheduleDetailsFromSummary(s);
 assert.equal(scheduleDetailsEqual(x,{...x,startsAt:'2026-10-20T10:00:00Z'}),false);
 assert.equal(scheduleDetailsSnapshotMatches(s,{...s,name:'modificado'}),false);
});
test('D15D03-12: resposta de criação deve ser DRAFT novo e sem targets', () => {
 const wanted=normalizeScheduleDetailsForm(form);
 assert.ok(parseScheduleDetailsReceipt({...raw,id:OTHER},COMPANY,null,wanted,[ID]));
 assert.equal(parseScheduleDetailsReceipt({...raw,id:ID},COMPANY,null,wanted,[ID]),null);
 assert.equal(parseScheduleDetailsReceipt({...raw,id:OTHER,status:'PUBLISHED'},COMPANY,null,wanted,[]),null);
});
test('D15D03-13: recibo CAS preserva identidade e destinos', () => {
 const wanted=normalizeScheduleDetailsForm(changed);
 assert.ok(parseScheduleDetailsReceipt({...raw,name:wanted.name,priority:wanted.priority},COMPANY,s,wanted));
 assert.equal(parseScheduleDetailsReceipt({...raw,name:wanted.name,priority:wanted.priority,_count:{targets:1}},COMPANY,s,wanted),null);
 assert.equal(parseScheduleDetailsReceipt({...raw,name:wanted.name,priority:wanted.priority,companyId:OTHER},COMPANY,s,wanted),null);
});
test('D15D03-14: mensagens HTTP não expõem dados de backend', () => {
 const result=doohScheduleDetailsError({response:{status:409,data:{token:'DONT_SHOW_SECRET'}}});
 assert.doesNotMatch(result,/DONT_SHOW_SECRET/);
});
test('D15D03-15: UI confirma escrita, apenas POST DRAFT e PATCH details-cas', () => {
 const page=source('src/components/DoohScheduleCatalogReadOnly.tsx');
 const editor=source('src/components/DoohScheduleDetailsCasEditor.tsx');
 assert.match(page,/<DoohScheduleDetailsCasEditor/);
 assert.match(page,/<DoohScheduleTargetsCasEditor/);
 assert.match(editor,/window\.confirm/);
 assert.match(editor,/apiClient\.get<unknown>/);
 assert.match(editor,/apiClient\.post<unknown>\('\/dooh\/schedules'/);
 assert.match(editor,/\/details-cas/);
 assert.doesNotMatch(editor,/\/publish|\/preview|\/manifest|restart|apiClient\.delete/);
});
const backend = '../ooh-manager-api/src/dooh-schedule-core/dooh-schedules.service.ts';
test('D15D03-16: backend CAS serializable, marketplace protegido, sem migration', { skip: !existsSync(join(process.cwd(),backend)) }, () => {
 const s=source(backend);
 assert.match(s,/async updateDetailsCas\(/);
 assert.match(s,/TransactionIsolationLevel\.Serializable/);
 assert.match(s,/marketplaceD12/);
 assert.match(s,/expectedFields/);
 assert.match(s,/updateMany/);
});
