import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const frontendRoot = resolve(__dirname, '../../..');
const stub = resolve(__dirname, 'context-stub.ts');
export default defineConfig({
  root: __dirname,
  envDir: __dirname, // NEVER load the frontend's .env / production credentials.
  plugins: [react()],
  resolve: { alias: [
    { find: /\/contexts\/AuthContext(?:\.tsx?)?$/, replacement: stub },
    { find: /\/contexts\/ProductAccessContext(?:\.tsx?)?$/, replacement: stub },
    { find: '@radix-ui/react-slot@1.1.2', replacement: '@radix-ui/react-slot' },
    { find: 'class-variance-authority@0.7.1', replacement: 'class-variance-authority' },
  ] },
  server: { host: '127.0.0.1', port: 41741, strictPort: true, open: false,
    fs: { allow: [frontendRoot] },
  },
});
