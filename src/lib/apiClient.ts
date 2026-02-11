import axios from 'axios';
import { toast } from 'sonner';
import {
  clearAccessState,
  defaultBlockMessage,
  getAccessState,
  setAccessState,
  subscribeAccessState,
} from './accessControl';

function isSafeWhenBlocked(url: string): boolean {
  const u = String(url || '');
  // allow authentication allow-list even when blocked (otherwise user can get stuck on login)
  if (/^\/auth\/(login|refresh|logout|verify-2fa)\b/i.test(u)) return true;
  // allow signup
  if (/^\/signup\b/i.test(u)) return true;
  // allow subscription/renew flows
  if (/^\/platform-subscription\b/i.test(u)) return true;
  return false;
}

// ⚠️ AQUI é a base da API. Em dev/produção SEMPRE configure VITE_API_URL.
// Exemplo em .env.local (dev):
// VITE_API_URL=http://localhost:3000/api
// Exemplo em produção (Vercel):
// VITE_API_URL=https://sua-api.vercel.app/api
// Se o BD for instanciado localmente, usa 'http://localhost:3333/api' como fallback lá no .env 
// Se o BD for instanciado remotamente, usa 'http://174.129.69.244:3333/api' como fallback lá no .env -> Sendo usado no momento.
// src/lib/apiClient.ts

const MISSING_API_BASE_URL = '__MISSING_API_BASE_URL__';

function looksLikeVercelHost(hostname: string): boolean {
  return /(^|\.)vercel\.app$/i.test(hostname);
}

const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  
  if (envUrl) {
    // Se a variável existe e começa com /, é uma rota relativa (ideal para Vercel Rewrites)
    if (envUrl.startsWith('/')) {
      return envUrl; 
    }
    // Se for uma URL completa, remove a barra final
    const normalized = envUrl.replace(/\/$/, '');

    // Ajuda a evitar erro comum: configurar como https://api.seudominio.com (sem /api)
    // Nosso backend expõe /api/* e o frontend usa endpoints relativos (ex.: /signup),
    // então a base deve terminar com /api.
    if (/^https?:\/\//i.test(normalized) && !/\/api$/i.test(normalized)) {
      return `${normalized}/api`;
    }

    return normalized;
  }
  
  // Se não houver variável, em produção só é seguro usar rota relativa (/api)
  // quando existe um proxy/rewrite no MESMO host (ex.: Vercel).
  // No GitHub Pages (ou domínio apontando para Pages), isso não existe e cairia no Pages,
  // causando erros como 405.
  const isDev = (import.meta as any).env?.DEV === true;
  if (isDev) return 'http://localhost:3333/api';

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (looksLikeVercelHost(host)) {
    return '/api';
  }

  // Em produção fora do Vercel, exija VITE_API_URL explícito.
  console.error(
    '[apiClient] VITE_API_URL não configurada. Defina VITE_API_URL (ex.: https://api.seudominio.com/api).'
  );
  return MISSING_API_BASE_URL;
};

const API_BASE_URL = getBaseUrl();

console.info('[apiClient] Base URL configurada para:', API_BASE_URL);

/**
 * Axios por padrão serializa arrays como status[]=A&status[]=B.
 * Como nosso backend (Nest/Express) pode estar usando o parser "simple",
 * preferimos enviar arrays como chaves repetidas: status=A&status=B
 * para manter compatibilidade.
 */
const serializeParams = (params: any): string => {
  const sp = new URLSearchParams();

  const append = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    sp.append(key, String(value));
  };

  Object.entries(params || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => append(key, v));
      return;
    }
    append(key, value);
  });

  return sp.toString();
};


export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  paramsSerializer: serializeParams,
  // IMPORTANT:
  // Do NOT set Content-Type globally.
  // In browsers, sending `Content-Type: application/json` on GET/HEAD requests
  // forces a CORS preflight header list that can be rejected by some CORS configs,
  // which results in the request being blocked (only the OPTIONS appears in Network)
  // and can leave the UI in a "blank" state on hard reload.
  headers: {},
});

// Public client (no auth headers / no auto-redirect on 401). Useful for public pages like Media Kit.
export const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  paramsSerializer: serializeParams,
  headers: {},
});

// Ensure we don't accidentally send Content-Type on GET/HEAD requests for public routes.
publicApiClient.interceptors.request.use((config) => {
  normalizeContentType(config);
  if (API_BASE_URL === MISSING_API_BASE_URL) {
    toast.error('Configuração da API ausente. Defina VITE_API_URL (Actions vars) e faça novo deploy.');
    throw new (axios as any).CanceledError('MISSING_API_BASE_URL');
  }
  return config;
});

function normalizeContentType(config: any) {
  const method = String(config?.method ?? 'get').toLowerCase();
  const hasBody = ['post', 'put', 'patch'].includes(method);

  config.headers = config.headers ?? {};

  // Axios may carry over a default Content-Type to GET in some setups.
  // Remove it for body-less methods to reduce CORS friction.
  if (!hasBody) {
    delete (config.headers as any)['Content-Type'];
    delete (config.headers as any)['content-type'];
    return;
  }

  // For body methods, ensure JSON content-type unless explicitly set.
  const ct = (config.headers as any)['Content-Type'] ?? (config.headers as any)['content-type'];
  if (!ct) {
    (config.headers as any)['Content-Type'] = 'application/json';
  }
}


// Attach access token to all requests
apiClient.interceptors.request.use(
  (config) => {
    normalizeContentType(config);

    if (API_BASE_URL === MISSING_API_BASE_URL) {
      toast.error('Configuração da API ausente. Defina VITE_API_URL (Actions vars) e faça novo deploy.');
      throw new (axios as any).CanceledError('MISSING_API_BASE_URL');
    }

    const access = getAccessState();
    if (access.isBlocked) {
      const method = String(config.method ?? 'get').toLowerCase();
      const url = String(config.url ?? '');
      const isWrite = !['get', 'head', 'options'].includes(method);
      const isDownload = (config as any).responseType === 'blob' || /(\/export|\/download|\/report|\/pdf|\/csv)/i.test(url);
      // Important: never block auth/subscription endpoints, otherwise users can get stuck
      // on the login screen due to a stale local "blocked" state.
      const safe = isSafeWhenBlocked(url);

      if ((isWrite || isDownload) && !safe) {
        const msg = access.message ?? defaultBlockMessage(access.reason);
        toast.error(msg);
        throw new (axios as any).CanceledError('ACCOUNT_BLOCKED');
      }
    }

    const token = localStorage.getItem('access_token');
    const url = String(config.url ?? '');
    // Important: do NOT attach an existing Authorization header to public auth endpoints
    // (login / verify-2fa), otherwise a stale token can make the backend treat the request
    // as authenticated and trigger account-block checks.
    // Treat refresh as public too: it should work even when the access token is expired/invalid.
    const isPublicAuth = /^\/auth\/(login|verify-2fa|refresh)\b/i.test(url);
    if (token && !isPublicAuth) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    } else if (isPublicAuth && config.headers) {
      // defensive: ensure no Authorization header leaks into login
      delete (config.headers as any).Authorization;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

let blockToastShown = false;

// When unblocked, allow showing toast again on a future block
if (typeof window !== 'undefined') {
  subscribeAccessState((st) => {
    if (!st.isBlocked) blockToastShown = false;
  });
}

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  pendingRequests.push(cb);
}

function onRefreshed(newToken: string | null) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

// Handle 401 by attempting refresh and retrying original request once
apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as any;

    // Some browsers/proxies may respond 304 (Not Modified) for XHR when a GET response
    // is cached (ETag/If-None-Match). Axios treats 304 as an error (validateStatus default),
    // which can break boot flows (notably /auth/me on hard refresh), resulting in a blank UI.
    // We retry once with a cache-busting param to force a fresh 200 + body.
    if (
      error.response?.status === 304 &&
      !originalRequest.__retry304 &&
      String(originalRequest.method ?? 'get').toLowerCase() === 'get'
    ) {
      originalRequest.__retry304 = true;

      originalRequest.headers = originalRequest.headers ?? {};
      // Ask intermediaries to revalidate and avoid reusing stale cached entries.
      (originalRequest.headers as any)['Cache-Control'] = 'no-cache';
      (originalRequest.headers as any).Pragma = 'no-cache';
      // Remove conditional headers if present.
      delete (originalRequest.headers as any)['If-None-Match'];
      delete (originalRequest.headers as any)['If-Modified-Since'];

      // Add a cache-busting param while preserving existing params.
      const ts = Date.now();
      if (originalRequest.params && typeof originalRequest.params === 'object') {
        originalRequest.params = { ...(originalRequest.params as any), _ts: ts };
      } else {
        originalRequest.params = { _ts: ts };
      }

      return apiClient.request(originalRequest);
    }

    // Ajuda de debug para o problema que você viu
    if (error.response?.status === 404 && originalRequest.url?.includes('/signup')) {
      console.error(
        '[apiClient] /signup retornou 404. Verifique se VITE_API_URL aponta para a mesma URL em que o Insomnia está dando 201.'
      );
    }

    if (error.response?.status === 402) {
      const data = (error.response?.data ?? {}) as any;
      const reason = (data.reason ?? data.blockReason ?? data.code ?? 'UNKNOWN') as any;
      const msg = String(data.message ?? defaultBlockMessage(reason));
      setAccessState({ isBlocked: true, reason, message: msg });
      if (!blockToastShown) {
        blockToastShown = true;
        toast.error(msg);
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // If token expired, ensure we don't keep a stale blocked state after redirecting.
        clearAccessState();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers = originalRequest.headers ?? {};
              (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
              resolve(apiClient.request(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      try {
        isRefreshing = true;
        const refreshResponse = await apiClient.post('/auth/refresh', {
          refreshToken: refreshToken,
        });

        // Força o TS a entender o formato dos tokens
        const data = refreshResponse.data as {
          access_token?: string;
          accessToken?: string;
          refresh_token?: string;
          refreshToken?: string;
        };

        const newAccessToken: string | undefined =
          data.access_token ?? data.accessToken;
        const newRefreshToken: string | undefined =
          data.refresh_token ?? data.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        onRefreshed(newAccessToken ?? null);
        isRefreshing = false;

        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;
        return apiClient.request(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        onRefreshed(null);
        clearAccessState();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    // Other errors: just propagate
    return Promise.reject(error);
  }
);

export default apiClient;
