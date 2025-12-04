/**
 * Utilitários para manipulação de datas locais (sem conversão UTC)
 * 
 * IMPORTANTE: Evite usar new Date(string) ou toISOString() pois causam
 * problemas de timezone (offset de -1 dia em GMT-3).
 */

/**
 * Cria um Date a partir de uma string no formato "yyyy-MM-dd" (input type="date")
 * @param input String no formato "yyyy-MM-dd" (ex: "2024-04-20")
 * @returns Date objeto no timezone local
 */
export function parseDateFromHtmlInput(input: string): Date {
  const [year, month, day] = input.split('-').map(Number);
  return new Date(year, month - 1, day); // ano, monthIndex (0-11), dia
}

/**
 * Cria um Date a partir de uma string no formato "dd/MM/yyyy"
 * @param input String no formato "dd/MM/yyyy" (ex: "20/04/2024")
 * @returns Date objeto no timezone local
 */
export function parseDateFromBr(input: string): Date {
  const [day, month, year] = input.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata um Date para string no formato "yyyy-MM-dd" (para input type="date")
 * @param date Date objeto
 * @returns String no formato "yyyy-MM-dd"
 */
export function formatDateForHtmlInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata um Date para string no formato "dd/MM/yyyy" (padrão brasileiro)
 * @param date Date objeto
 * @returns String no formato "dd/MM/yyyy"
 */
export function formatDateToBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Cria um Date para o início do dia (00:00:00) no timezone local
 * @param year Ano
 * @param month Mês (1-12)
 * @param day Dia (1-31)
 * @returns Date objeto
 */
export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}
