// Utilitários de data usados no frontend
// Observação: dados vindos da API frequentemente chegam como string ISO.
// Estes helpers aceitam Date OU string e normalizam para evitar crashes no UI.

function isoStringToLocalDatePreservingDay(value: string): Date {
  // Aceita "YYYY-MM-DD" ou ISO ("YYYY-MM-DDTHH:mm:ss.sssZ").
  // Usa o trecho YYYY-MM-DD para evitar shift de timezone.
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    return new Date(year, month, day);
  }
  return new Date(value);
}

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? isoStringToLocalDatePreservingDay(value) : value;
}

export function formatDateForHtmlInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateFromHtmlInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}
