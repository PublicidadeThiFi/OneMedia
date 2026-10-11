import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assertContains = (source, needle, label) => {
  if (!source.includes(needle)) {
    throw new Error(`[product-navigation-static] missing ${label}: ${needle}`);
  }
};

const mainApp = read('src/components/MainApp.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const navigation = read('src/lib/productNavigation.ts');
const doohPage = read('src/components/DoohFoundationPage.tsx');
const app = read('src/App.tsx');

assertContains(mainApp, 'useProductAccess()', 'ProductAccess hook');
assertContains(mainApp, 'hasModule(requestedModule)', 'direct-route entitlement gate');
assertContains(mainApp, 'getProductHomePath(fallbackModule)', 'safe fallback redirect');
assertContains(mainApp, 'requestedModule === "DOOH"', 'DOOH content branch');
assertContains(sidebar, 'availableModules.includes(module)', 'module switch entitlement state');
assertContains(sidebar, 'DOOH_SECTION_LABELS', 'DOOH navigation labels');
assertContains(navigation, "'/app/dooh/screens'", 'DOOH screens route');
assertContains(navigation, "'/app/dooh/library'", 'DOOH library route');
assertContains(navigation, "'/app/dooh/scheduling'", 'DOOH scheduling route');
assertContains(navigation, "'/app/dooh/reports'", 'DOOH reports route');
assertContains(doohPage, 'Estrutura reservada — ainda não operacional', 'non-operational DOOH marker');
assertContains(app, "cleanPath.startsWith('/app/dooh/')", 'DOOH route parsing');

console.log('[product-navigation-static] PASS');
