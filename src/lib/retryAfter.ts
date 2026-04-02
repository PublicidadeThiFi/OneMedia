export function formatRetryAfterLabel(retryAfterSeconds?: number | null): string | null {
  const value = Number(retryAfterSeconds ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (value < 60) return `${Math.ceil(value)}s`;

  const minutes = Math.ceil(value / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.ceil(minutes / 60);
  return `${hours}h`;
}

export function appendRetryAfter(message: string, retryAfterSeconds?: number | null): string {
  const label = formatRetryAfterLabel(retryAfterSeconds);
  if (!label) return message;
  return `${message} Aguarde ${label} antes de tentar novamente.`;
}
