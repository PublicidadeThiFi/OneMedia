/**
 * Dashboard Service (Etapa 4)
 *
 * Objetivo:
 * - Centralizar chamadas HTTP para as rotas do Dashboard.
 * - Ser usado pelos hooks do Dashboard.
 *
 * Observações:
 * - Base URL pode ser configurada por env (Vite): VITE_API_BASE_URL
 * - Por padrão, usa mesmo host (base vazia) e caminhos relativos (/api/...).
 * - Retorna JSON e lança erro em caso de falha.
 */

export type DashboardHttpError = {
  status: number;
  message: string;
  details?: unknown;
};

// Vite (import.meta.env) - fallback para base vazia.
const API_BASE_URL: string = ((import.meta as any)?.env?.VITE_API_BASE_URL as string) ?? '';

function joinUrl(base: string, path: string) {
  const b = (base || '').replace(/\/$/, '');
  const p = (path || '').startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function buildError(status: number, bodyText: string): DashboardHttpError {
  // Tenta extrair mensagem do body (JSON ou texto)
  let message = `Erro HTTP ${status}`;
  let details: unknown = undefined;

  const trimmed = (bodyText || '').trim();
  if (trimmed) {
    try {
      const json = JSON.parse(trimmed);
      details = json;
      if (typeof json?.message === 'string' && json.message.trim()) {
        message = json.message.trim();
      } else if (typeof json?.error === 'string' && json.error.trim()) {
        message = json.error.trim();
      }
    } catch {
      // texto simples
      message = trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed;
    }
  }

  return { status, message, details };
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
  const url = joinUrl(API_BASE_URL, path) + (queryString ? `?${queryString}` : '');

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(opts?.headers || {}),
    },
    signal: opts?.signal,
  });

  if (!res.ok) {
    const bodyText = await safeReadText(res);
    throw buildError(res.status, bodyText);
  }

  // Se o endpoint responder 204 (No Content), retornamos undefined (mas tipado como T)
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}
