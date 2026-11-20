/** Visual-only timezone adapter: emits the existing ISO-8601-with-offset DTO.
 * Ambiguous / nonexistent daylight-saving wall times fail closed instead of silently shifting schedules.
 */
const wall = (input: string, timeZone: string): string | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(input));
    const get = (kind: string) => parts.find(part => part.type === kind)?.value;
    const date = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) ? date : null;
  } catch { return null; }
};
export function doohUxLocalFromIso(iso: string, zone: string): string {
  return iso && Number.isFinite(Date.parse(iso)) ? (wall(iso, zone) ?? '') : '';
}
export function doohUxIsoWithOffset(local: string, zone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const asUtc = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(asUtc)) return null;
  const matches: { time: number; offset: number }[] = [];
  // Check quarter-hour UTC offsets across all IANA regions; reject DST ambiguity.
  for (let offset = -12 * 60; offset <= 14 * 60; offset += 15) {
    const time = asUtc - offset * 60_000;
    if (wall(new Date(time).toISOString(), zone) === local) matches.push({ time, offset });
    if (matches.length > 1) return null;
  }
  if (matches.length !== 1) return null;
  const { offset } = matches[0];
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${local}:00${sign}${hours}:${minutes}`;
}
