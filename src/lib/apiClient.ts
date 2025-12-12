import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
  refresh_token: refreshToken,
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
