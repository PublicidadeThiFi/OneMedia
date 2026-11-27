/** F13: "hoje às 14:36", "ontem às 09:10", "amanhã às 08:00", "27/11 às 14:36" or "27/11/2025". Full date goes in a tooltip. */
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function doohFullDate(value: string | number | Date): string {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR') : '';
}
export function doohFriendlyDate(value: string | number | Date, now: Date = new Date()): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((dayStart(d) - dayStart(now)) / 86_400_000);
  if (days === 0) return `hoje às ${time}`;
  if (days === -1) return `ontem às ${time}`;
  if (days === 1) return `amanhã às ${time}`;
  if (d.getFullYear() === now.getFullYear()) return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`;
  return d.toLocaleDateString('pt-BR');
}
