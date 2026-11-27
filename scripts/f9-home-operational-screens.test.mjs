import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../src/components/${file}`,import.meta.url),'utf8');
test('F9 home reuses the operational panel (F12: no legacy fallback)',()=>{
 const page=read('DoohFoundationPage.tsx');
 assert.match(page,/section === 'home' && <>[\s\S]*?<DoohOverview \/>[\s\S]*?<DoohOperationalScreensPanel/);
 assert.doesNotMatch(page,/DoohGettingStarted|disabledFallback/);
 assert.match(page,/screenTask === 'my-screens' && <>[\s\S]*?<DoohOperationalScreensPanel/);
});
test('F9 connect action preserves the operational screen context',()=>{
 const page=read('DoohFoundationPage.tsx');
 assert.match(read('DoohOperationalScreensPanel.tsx'),/setPairScreenId\(screen.id\)/);
 assert.match(read('DoohOperationalScreensPanel.tsx'),/DoohContextualPairing key=\{screen.id\}/);
 // F12: no separate "Conectar" tab; connecting happens on the screen card.
 assert.doesNotMatch(page,/'connect'/);
});
test('F9 unavailable module shows one plain sentence, not used while loading or on unexpected errors',()=>{
 const panel=read('DoohOperationalScreensPanel.tsx');
 assert.match(panel,/if \(!available \|\| mode === 'disabled'\) return <section/);
 assert.match(panel,/ainda não estão liberadas para a sua empresa/);
 assert.match(panel,/mode === 'loading'.*Carregando telas/);
 assert.match(panel,/mode === 'error'.*role="alert"/);
 assert.match(panel,/const writable = available && snapshot\?\.modules\.DOOH\.accessMode === 'FULL'/);
 assert.match(panel,/controller\.signal\.aborted/);
});
test('F9 sidebar no longer announces the module as a future phase',()=>{
 assert.doesNotMatch(read('Sidebar.tsx'),/Operação de Digital Signage entra nas próximas fases/);
});
