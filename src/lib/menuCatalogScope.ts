export type MenuCatalogHeroBlock = 'hero' | 'about' | 'actions' | 'filters' | 'results-summary' | 'point-grid';

export type MenuCatalogLegacyRoute =
  | '/menu/uf'
  | '/menu/cidades'
  | '/menu/pontos'
  | '/menu/detalhe'
  | '/menu/faces'
  | '/menu/carrinho'
  | '/menu/checkout'
  | '/menu/enviado';

export type MenuCatalogFunctionalFilter =
  | 'search'
  | 'mediaType'
  | 'city'
  | 'district'
  | 'environment'
  | 'availability'
  | 'sort';

export type MenuCatalogStagePlan = {
  sourceOfTruth: string;
  entryRoute: '/menu';
  experience: 'single-catalog-page';
  stage: 1;
  preserveOperationalFlow: true;
  enableParallelBuild: true;
  switchProductionRouteNow: false;
  heroBlocks: readonly MenuCatalogHeroBlock[];
  supportedFilters: readonly MenuCatalogFunctionalFilter[];
  legacyRoutesToPreserve: readonly MenuCatalogLegacyRoute[];
};

/**
 * Etapa 1: escopo congelado para guiar as próximas implementações.
 * Ainda não deve alterar o comportamento em produção.
 */
export const MENU_CATALOG_STAGE_PLAN: MenuCatalogStagePlan = {
  sourceOfTruth: 'Novo_Cardapio_Etapas.pdf',
  entryRoute: '/menu',
  experience: 'single-catalog-page',
  stage: 1,
  preserveOperationalFlow: true,
  enableParallelBuild: true,
  switchProductionRouteNow: false,
  heroBlocks: ['hero', 'about', 'actions', 'filters', 'results-summary', 'point-grid'],
  supportedFilters: ['search', 'mediaType', 'city', 'district', 'environment', 'availability', 'sort'],
  legacyRoutesToPreserve: [
    '/menu/uf',
    '/menu/cidades',
    '/menu/pontos',
    '/menu/detalhe',
    '/menu/faces',
    '/menu/carrinho',
    '/menu/checkout',
    '/menu/enviado',
  ],
};
