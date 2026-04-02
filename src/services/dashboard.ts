/**
 * Dashboard Service (Etapa 4)
 *
 * Objetivo:
 * - Centralizar chamadas HTTP para as rotas do Dashboard.
 * - Reaproveitar o apiClient principal para manter token Bearer, refresh e base URL iguais ao restante da aplicação.
 */

import axios from 'axios';
import apiClient from '../lib/apiClient';
import { getDashboardResolvedUrl, isDashboardDiagnosticsEnabled, normalizeDashboardRequestPath, recordDashboardDiagnostic } from '../dashboard/diagnostics';

export type DashboardHttpError = {
  status: number;
  message: string;
  details?: unknown;
};

function buildError(error: unknown): DashboardHttpError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    let message = `Erro HTTP ${status || 0}`;
    if (typeof data === 'string' && data.trim()) {
      message = data.trim();
    } else if (typeof data?.message === 'string' && data.message.trim()) {
      message = data.message.trim();
    } else if (typeof data?.error === 'string' && data.error.trim()) {
      message = data.error.trim();
    } else if (typeof error.message === 'string' && error.message.trim()) {
      message = error.message.trim();
    }

    return {
      status,
      message,
      details: data,
    };
  }

  if (error instanceof Error) {
    return {
      status: 0,
      message: error.message || 'Erro inesperado',
      details: error,
    };
  }

  return {
    status: 0,
    message: 'Erro inesperado',
    details: error,
  };
}

/**
 * GET JSON (genérico)
 */
export async function dashboardGetJson<T>(
  path: string,
  queryString?: string,
  opts?: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    widgetKey?: string;
  },
): Promise<T> {
  const requestPath = normalizeDashboardRequestPath(path);
  const normalizedPath = requestPath.normalizedPath;
  const url = `${normalizedPath}${queryString ? `?${queryString}` : ''}`;
  const requestInfo = getDashboardResolvedUrl(path, queryString);
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  if (isDashboardDiagnosticsEnabled()) {
    if (requestInfo.duplicateApiPrefix) {
      recordDashboardDiagnostic({
        kind: 'warning',
        queryKey: opts?.widgetKey,
        path: normalizedPath,
        url: requestInfo.url,
        message: 'Detectado prefixo /api duplicado entre apiClient e rota do Dashboard; rota normalizada antes do request.',
        details: {
          baseURL: requestInfo.baseURL,
          path: requestInfo.normalizedPath,
        },
      });
    }

    recordDashboardDiagnostic({
      kind: 'request-start',
      queryKey: opts?.widgetKey,
      path: normalizedPath,
      url: requestInfo.url,
      details: {
        baseURL: requestInfo.baseURL,
      },
    });
  }

  try {
    const response = await apiClient.get<T>(url, {
      signal: opts?.signal,
      headers: {
        Accept: 'application/json',
        ...(opts?.headers || {}),
      },
    });

    if (isDashboardDiagnosticsEnabled()) {
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      recordDashboardDiagnostic({
        kind: 'request-success',
        queryKey: opts?.widgetKey,
        path: normalizedPath,
        url: requestInfo.url,
        durationMs: Math.max(0, Math.round(endedAt - startedAt)),
      });
    }

    return response.data as T;
  } catch (error) {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Math.max(0, Math.round(endedAt - startedAt));

    if (opts?.signal?.aborted || axios.isCancel(error)) {
      if (isDashboardDiagnosticsEnabled()) {
        recordDashboardDiagnostic({
          kind: 'request-abort',
          queryKey: opts?.widgetKey,
          path: normalizedPath,
          url: requestInfo.url,
          durationMs,
          message: 'Requisição abortada antes de concluir.',
        });
      }
      throw buildError(error);
    }

    const built = buildError(error);

    if (isDashboardDiagnosticsEnabled()) {
      recordDashboardDiagnostic({
        kind: 'request-error',
        queryKey: opts?.widgetKey,
        path: normalizedPath,
        url: requestInfo.url,
        durationMs,
        message: built.message,
        details: {
          status: built.status,
        },
      });
    }

    throw built;
  }
}
