export type MarketplaceDateRangeValue = {
  from: Date | null;
  to: Date | null;
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseMarketplaceDate(
  value: string | null | undefined,
): Date | null {
  const match = String(value || "").match(DATE_ONLY_PATTERN);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMarketplaceDate(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMarketplaceToday() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  );
}

export function addMarketplaceDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
}

export function enumerateMarketplaceDates(from: Date, to: Date) {
  const dates: Date[] = [];
  let cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(to);
  end.setHours(12, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor));
    cursor = addMarketplaceDays(cursor, 1);
  }

  return dates;
}

export function normalizeMarketplaceRange(range: MarketplaceDateRangeValue) {
  if (!range.from || !range.to) return range;
  if (range.from.getTime() <= range.to.getTime()) return range;
  return { from: range.to, to: range.from };
}

export function formatMarketplaceDateRange(range: MarketplaceDateRangeValue) {
  if (!range.from) return "Selecionar datas";
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (!range.to) return formatter.format(range.from).replace(".", "");
  return `${formatter.format(range.from).replace(".", "")} – ${formatter.format(range.to).replace(".", "")}`;
}

export function formatMarketplaceLongDate(
  value: string | Date | null | undefined,
) {
  const date =
    value instanceof Date
      ? value
      : parseMarketplaceDate(String(value || "").slice(0, 10));
  if (!date) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function sameMarketplaceDay(left: Date, right: Date) {
  return formatMarketplaceDate(left) === formatMarketplaceDate(right);
}
