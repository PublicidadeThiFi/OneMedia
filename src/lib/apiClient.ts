import axios from 'axios';

// ⚠️ AQUI é a base da API. Em dev/produção SEMPRE configure VITE_API_URL.
// Exemplo em .env.local (dev):
// VITE_API_URL=http://localhost:3000/api
// Exemplo em produção (Vercel):
// VITE_API_URL=https://sua-api.vercel.app/api
// Se o BD for instanciado localmente, usa 'http://localhost:3333/api' como fallback lá no .env 
// Se o BD for instanciado remotamente, usa 'http://174.129.69.244:3333/api' como fallback lá no .env -> Sendo usado no momento.
// src/lib/apiClient.ts

const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  
  if (envUrl) {
    // Se a variável existe e começa com /, é uma rota relativa (ideal para Vercel Rewrites)
    if (envUrl.startsWith('/')) {
      return envUrl; 
    }
    // Se for uma URL completa, remove a barra final
    return envUrl.replace(/\/$/, '');
  }
  
  // Se não houver variável, usa o IP fixo como último recurso
  return 'http://174.129.69.244:3333/api';
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
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public client (no auth headers / no auto-redirect on 401). Useful for public pages like Media Kit.
export const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  paramsSerializer: serializeParams,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Attach access token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

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

    // Ajuda de debug para o problema que você viu
    if (error.response?.status === 404 && originalRequest.url?.includes('/signup')) {
      console.error(
        '[apiClient] /signup retornou 404. Verifique se VITE_API_URL aponta para a mesma URL em que o Insomnia está dando 201.'
      );
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
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
