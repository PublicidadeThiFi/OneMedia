/**
 * Dashboard Service (Etapa 4)
 *
 * Objetivo:
 * - Centralizar chamadas HTTP para as rotas do Dashboard.
 * - Reaproveitar o apiClient principal para manter token Bearer, refresh e base URL iguais ao restante da aplicação.
 */

import axios from 'axios';
import apiClient from '../lib/apiClient';

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
  },
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await apiClient.get<T>(url, {
      signal: opts?.signal,
      headers: {
        Accept: 'application/json',
        ...(opts?.headers || {}),
      },
    });

    return response.data as T;
  } catch (error) {
    throw buildError(error);
  }
}
