// Utility helpers to extract a user-friendly error message from Axios (or fetch) errors.
// This is especially important for uploads, where upstream proxies (e.g. Nginx) can
// reject the request with an HTML 413 response that never reaches the NestJS backend.

export function getUploadErrorMessage(err: any, fallback: string): string {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;

  // Nginx/Proxy: Request Entity Too Large
  if (status === 413) {
    return (
      'Arquivo grande demais para o servidor (413). ' +
      'Isso geralmente é limite do Nginx/proxy (client_max_body_size). ' +
      'Reduza o tamanho do arquivo ou aumente o limite no servidor.'
    );
  }

  // Our quota errors
  if (status === 402) {
    const reason = data?.reason;
    if (reason === 'STORAGE_EXCEEDED') return 'Armazenamento do plano excedido. Compre mídia extra ou remova arquivos.';
    if (reason === 'TRAFFIC_EXCEEDED') return 'Tráfego mensal do plano excedido. Compre mídia extra ou aguarde o próximo mês.';
  }

  // Common NestJS validation errors
  const rawMsg = data?.message;
  if (Array.isArray(rawMsg)) return rawMsg.join(', ');
  if (typeof rawMsg === 'string' && rawMsg.trim().length > 0) return rawMsg;

  // Upstream HTML error pages (Nginx, etc.)
  if (typeof data === 'string') {
    const s = data.toLowerCase();
    if (s.includes('request entity too large')) {
      return (
        'Arquivo grande demais para o servidor (413). ' +
        'Limite do Nginx/proxy (client_max_body_size).'
      );
    }
  }

  // Generic
  return fallback;
}
