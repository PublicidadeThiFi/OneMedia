export type ApiErrorInfo = {
  message: string;
  code?: string;
  status?: number;
  retryAfterSeconds?: number;
};

/**
 * Extrai {message, code, status} de erros do Axios (ou qualquer throw).
 * Mantém compatibilidade com `message` sendo string ou array.
 */
export function getApiError(
  err: unknown,
  fallbackMessage = 'Ocorreu um erro. Tente novamente.'
): ApiErrorInfo {
  const anyErr: any = err as any;
  const status: number | undefined = anyErr?.response?.status;
  const data: any = anyErr?.response?.data;

  const apiMessage = data?.message;
  const message =
    (typeof apiMessage === 'string' && apiMessage.trim())
      ? apiMessage
      : Array.isArray(apiMessage)
        ? apiMessage.filter(Boolean).join('\n')
        : (typeof anyErr?.message === 'string' && anyErr.message.trim())
          ? anyErr.message
          : fallbackMessage;

  const code: string | undefined =
    typeof data?.code === 'string' && data.code.trim() ? data.code : undefined;

  const retryAfterSeconds: number | undefined =
    typeof data?.retryAfterSeconds === 'number'
      ? data.retryAfterSeconds
      : undefined;

  return { message, code, status, retryAfterSeconds };
}
