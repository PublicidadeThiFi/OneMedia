import type { PlatformModule } from './platformAccess';

export type DoohFoundationSection =
  | 'home'
  | 'screens'
  | 'library'
  | 'scheduling'
  | 'reports';

export const PRODUCT_HOME_PATHS: Record<PlatformModule, string> = {
  OOH: '/app/home',
  DOOH: '/app/dooh',
};

export const DOOH_SECTION_PATHS: Record<DoohFoundationSection, string> = {
  home: '/app/dooh',
  screens: '/app/dooh/screens',
  library: '/app/dooh/library',
  scheduling: '/app/dooh/scheduling',
  reports: '/app/dooh/reports',
};

export const DOOH_SECTION_LABELS: Record<DoohFoundationSection, string> = {
  home: 'Visão geral',
  screens: 'Telas e Players',
  library: 'Biblioteca',
  scheduling: 'Programação',
  reports: 'Relatórios',
};

export function getProductModuleFromPath(pathname: string): PlatformModule {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/app/dooh' || normalized.startsWith('/app/dooh/')
    ? 'DOOH'
    : 'OOH';
}

export function getProductHomePath(module: PlatformModule): string {
  return PRODUCT_HOME_PATHS[module];
}

export function getDoohSectionFromPath(pathname: string): DoohFoundationSection {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === DOOH_SECTION_PATHS.screens) return 'screens';
  if (normalized === DOOH_SECTION_PATHS.library) return 'library';
  if (normalized === DOOH_SECTION_PATHS.scheduling) return 'scheduling';
  if (normalized === DOOH_SECTION_PATHS.reports) return 'reports';

  return 'home';
}
