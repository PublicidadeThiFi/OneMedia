/** F12: media sent before names were suggested on upload are named after their file id
 * (a UUID, sometimes with an extension). Show a readable label until the owner renames it. */
const ID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{2,5})?$/i;

export function doohMediaDisplayName(name: string, kind?: string | null): string {
  if (!ID_NAME.test(name.trim())) return name;
  const label = kind && /video/i.test(kind) ? 'Vídeo sem nome' : kind && /image/i.test(kind) ? 'Imagem sem nome' : 'Mídia sem nome';
  return `${label} (${name.trim().slice(0, 6)})`;
}
