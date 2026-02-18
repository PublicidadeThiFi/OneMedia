/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_URL?: string;
  // adicione outras variáveis VITE_ se quiser
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
