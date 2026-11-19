/** A Marketplace URL is not a player URL. Only published profiles may expose a share link. */
export function publicMarketplacePointPath(
  slug: unknown, status: unknown, companyEnabled: boolean,
): string | null {
  if (!companyEnabled || status !== 'PUBLISHED' || typeof slug !== 'string' ||
    slug.length === 0 || slug.length > 160 || slug.trim() !== slug ||
    /[\/\?#\s\x00-\x1f]/.test(slug)) return null;
  return `/pontos/${encodeURIComponent(slug)}`;
}
