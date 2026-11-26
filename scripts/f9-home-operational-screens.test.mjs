import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../src/components/${file}`,import.meta.url),'utf8');
test('F9 home reuses the operational panel and preserves the legacy fallback',()=>{
 const page=read('DoohFoundationPage.tsx');
 assert.match(page,/section === 'home' && <DoohOperationalScreensPanel/);
 assert.match(page,/disabledFallback=\{<DoohGettingStarted \/>\}/);
 assert.doesNotMatch(page,/section === 'home' && <DoohGettingStarted/);
 assert.match(page,/screenTask === 'my-screens'.*DoohPlayerInventoryReadOnly/);
});
test('F9 connect action opens the existing pairing tab',()=>{
 const page=read('DoohFoundationPage.tsx');
 assert.match(page,/window\.location\.assign\(`\$\{DOOH_SECTION_PATHS\.screens\}\?ux=connect`\)/);
 assert.match(page,/get\('ux'\) === 'connect'\s*\? 'connect' : 'my-screens'/);
 assert.match(page,/screenTask === 'connect'.*DoohPlayerPairingAndAssignment/);
});
test('F9 fallback is gated, not used while loading or on unexpected errors',()=>{
 const panel=read('DoohOperationalScreensPanel.tsx');
 assert.match(panel,/OperationalScreensForContext key=\{key\}.*disabledFallback=\{disabledFallback\}/);
 assert.match(panel,/if \(!available\) return disabledFallback \?\? null/);
 assert.match(panel,/if \(mode === 'disabled'\) return disabledFallback \?\?/);
 assert.match(panel,/mode === 'loading'.*Carregando telas/);
 assert.match(panel,/mode === 'error'.*role="alert"/);
 assert.match(panel,/const writable = available && snapshot\?\.modules\.DOOH\.accessMode === 'FULL'/);
 assert.match(panel,/controller\.signal\.aborted/);
});
test('F9 sidebar no longer announces the module as a future phase',()=>{
 assert.doesNotMatch(read('Sidebar.tsx'),/Operação de Digital Signage entra nas próximas fases/);
});
