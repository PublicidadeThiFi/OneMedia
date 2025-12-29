export function toNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === 'string' ? Number(value) : (value as any);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function formatMoneyBRL(value: any): string {
  const n = toNumber(value, 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}
