/** D13L — Erros de GET DOOH: mensagens fixas, sem ecoar URL, backend, IDs ou tokens. */
export type DoohReadContext = 'inventory' | 'detail';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function doohPlayerReadFailure(error: unknown, context: DoohReadContext): string {
  const e = asRecord(error);
  const response = asRecord(e?.response);
  const status = response?.status;
  if (status === 401) return 'Sessão não autenticada ou expirada. Entre novamente para consultar o DOOH.';
  if (status === 402 || status === 403) return 'Consulta não autorizada para esta empresa, função ou acesso ao DOOH.';
  if (status === 404) return context === 'detail'
    ? 'Este player não está mais disponível para consulta. Atualize o inventário.'
    : 'A consulta do inventário DOOH não está disponível nesta API.';
  if (status === 429) return 'Consultas temporariamente limitadas. Aguarde e tente novamente.';
  if (typeof status === 'number' && status >= 500 && status <= 599)
    return 'Serviço DOOH temporariamente indisponível. Tente novamente mais tarde.';
  return context === 'detail'
    ? 'Não foi possível consultar o detalhe do player. Confirme a conexão e tente novamente.'
    : 'Não foi possível consultar os players. Confirme a conexão e tente novamente.';
}
