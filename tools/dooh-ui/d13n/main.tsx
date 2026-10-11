import React from 'react';
import { createRoot } from 'react-dom/client';
import { DoohPlayerInventoryReadOnly } from '../../../src/components/DoohPlayerInventoryReadOnly';
import { setD13NContext } from './context-stub';

// Test-only window control; real AuthContext and ProductAccessContext are not modified.
Object.assign(window, { __d13nSetContext: setD13NContext });
createRoot(document.getElementById('d13n-root')!).render(
  <React.StrictMode><DoohPlayerInventoryReadOnly /></React.StrictMode>,
);
