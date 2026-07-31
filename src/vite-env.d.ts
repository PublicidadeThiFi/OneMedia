/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_ENTERPRISE_SIGNUP_ENABLED?: string;
  // adicione outras variáveis VITE_ se quiser
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
