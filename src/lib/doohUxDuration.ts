/** Visual-only seconds -> existing integer milliseconds API value. No rounding of invalid precision. */
export function doohUxMillisecondsFromSeconds(input: string): number | null {
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(input.trim())) return null;
  const numeric = Number(input.trim());
  const result = numeric * 1000;
  return Number.isFinite(result) && Number.isSafeInteger(Math.round(result)) &&
    Math.abs(result - Math.round(result)) < 0.00001 && result >= 1 && result <= 86400000
    ? Math.round(result) : null;
}
