import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screenNextStep, contentNextStep } from '../src/lib/doohJourneyGuidance.ts';
import { guidedPublishError } from '../src/lib/doohGuidedPublicationContract.ts';
const screen = status => ({status});
const input = overrides => ({uploadOpen:false, trackingUpload:false, readyCount:0, itemCount:0, unavailableItems:false, orderDirty:false, selectedMedia:false, canAdd:false, busy:false,...overrides});
test('UX12 next screen action follows actual status and access',()=>{
 for(const [status,action] of Object.entries({WAITING_FOR_PLAYER:'connect',PLAYER_INACTIVE:'attention',NO_RECENT_CONTACT:'attention',UPDATE_PENDING:'attention',WAITING_FOR_PROGRAMMING:'content',VERSION_REPORTED:'content'})){
  assert.equal(screenNextStep(screen(status),true).action,action);
  assert.equal(screenNextStep(screen(status),false).action,'view');
 }
 assert.match(screenNextStep(screen('VERSION_REPORTED'),true).text,/não confirma/);
});
test('UX12 content progression uses existing readiness and selected media',()=>{
 assert.equal(contentNextStep(input({})).action,'upload');
 assert.equal(contentNextStep(input({readyCount:1})).action,'select');
 assert.equal(contentNextStep(input({readyCount:1,selectedMedia:true,canAdd:true})).action,'add');
 assert.equal(contentNextStep(input({itemCount:1})).action,'publish');
});
test('UX12 unsaved order, busy and upload take precedence over publication',()=>{
 assert.equal(contentNextStep(input({itemCount:2,orderDirty:true})).action,'save');
 assert.equal(contentNextStep(input({itemCount:2,orderDirty:true,busy:true})).action,'wait');
 assert.equal(contentNextStep(input({itemCount:2,uploadOpen:true})).action,'upload');
 assert.equal(contentNextStep(input({trackingUpload:true,uploadedStatus:'PROCESSING'})).action,'wait');
 assert.equal(contentNextStep(input({itemCount:1,unavailableItems:true})).action,'fix');
});
test('UX12 errors do not expose arbitrary technical codes',()=>{
 assert.doesNotMatch(guidedPublishError({response:{status:409,data:{code:'DOOH_INTERNAL_TEST'}}}),/DOOH_INTERNAL/);
 assert.match(guidedPublishError({response:{status:409}}),/Atualize e revise/);
});
test('UX12 wiring guards order and publication; uploaded selection is contextual',()=>{
 const source=readFileSync(new URL('../src/components/DoohScreenContentWizard.tsx',import.meta.url),'utf8');
 assert.match(source,/if \(!autoProcessing \|\| orderDirty/);
 assert.match(source,/editorBlocked=\{editingBusy\|\|loadingList\|\|orderDirty\|\|uploadOpen\}/);
 assert.match(source,/if \(!selectedMedia\) setSelectedMedia\(uploadedId\)/);
 assert.match(source,/Descartar a ordem ainda não salva/);
 assert.match(source,/onChanged=\{\(mediaId, auto\)/);
});
test('UX12 screen context remount and upload flag are wired',()=>{
 const panel=readFileSync(new URL('../src/components/DoohOperationalScreensPanel.tsx',import.meta.url),'utf8');
 const upload=readFileSync(new URL('../src/components/DoohMediaUpload.tsx',import.meta.url),'utf8');
 assert.match(panel,/OperationalScreensForContext key=\{key\}/);
 assert.match(panel,/writable && \(screenList/);
 assert.match(upload,/pilot.autoProcessingEnabled \? 'Após o envio/);
 assert.doesNotMatch(upload,/sem upload multipart ou processamento automático/);
});
