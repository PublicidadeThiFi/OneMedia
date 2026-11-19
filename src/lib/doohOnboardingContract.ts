/** P0-07: compact, read-only customer journey summaries. Never treats cache/READY as playback. */
import { parseDoohPlayerInventoryResponse } from './doohPlayerInventoryContract.ts';
import { parseDoohLibraryFolders, parseDoohLibraryMedia } from './doohMediaLibraryContract.ts';
import { parseDoohPlaylistCatalog } from './doohPlaylistCatalogContract.ts';
import { parseDoohScheduleCatalog } from './doohScheduleCatalogContract.ts';

export type DoohJourneyStage = 'screens' | 'library' | 'playlists' | 'schedules';
export type DoohJourneySummary = { state: 'empty' | 'found'; text: string; partial: boolean };

export function parseDoohJourneySummary(stage: DoohJourneyStage, data: unknown, companyId: string,
  foldersInput?: unknown): DoohJourneySummary | null {
  if (stage === 'screens') {
    const response = parseDoohPlayerInventoryResponse(data);
    if (!response || response.meta.page !== 1 || response.meta.pageSize !== 20) return null;
    const n = response.meta.total;
    const activeInPage = response.items.filter(player => player.lifecycleStatus === 'ACTIVE').length;
    return { state: n ? 'found' : 'empty', partial: response.meta.totalPages > 1,
      text: n ? `${n} player(s) cadastrados; ${activeInPage} ativo(s) entre os 20 primeiros.` : 'Nenhum player cadastrado.' };
  }
  if (stage === 'library') {
    const folders = parseDoohLibraryFolders(foldersInput, companyId);
    const media = folders && parseDoohLibraryMedia(data, companyId, 'all', folders);
    if (!media) return null;
    const ready = media.filter(item => item.status === 'READY' &&
      (item.mimeType === 'image/png' || item.mimeType === 'image/jpeg' || item.mimeType === 'video/mp4')).length;
    return { state: ready ? 'found' : 'empty', partial: media.length === 100,
      text: ready ? `${ready} mídia(s) prontas entre os resultados recentes.` : 'Nenhuma mídia pronta nos resultados recentes.' };
  }
  if (stage === 'playlists') {
    const playlists = parseDoohPlaylistCatalog(data, companyId);
    if (!playlists) return null;
    const published = playlists.filter(item => item.currentVersion > 0).length;
    return { state: published ? 'found' : 'empty', partial: playlists.length === 100,
      text: published ? `${published} playlist(s) com versão publicada.` : 'Nenhuma playlist com versão publicada nos resultados.' };
  }
  const schedules = parseDoohScheduleCatalog(data, companyId);
  if (!schedules) return null;
  const published = schedules.filter(item => item.status === 'PUBLISHED' && item.targetCount > 0).length;
  return { state: published ? 'found' : 'empty', partial: schedules.length === 100,
    text: published ? `${published} agenda(s) publicadas com destino.` : 'Nenhuma agenda publicada com destino nos resultados.' };
}
