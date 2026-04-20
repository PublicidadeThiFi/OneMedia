export type MenuCatalogRefinementInteraction =
  | 'media-carousel'
  | 'video-modal'
  | 'map-flip'
  | 'selection-mode'
  | 'add-to-cart'
  | 'view-cart';

export type MenuCatalogRefinementFilter =
  | 'search'
  | 'mediaType'
  | 'city'
  | 'district'
  | 'environment'
  | 'availability'
  | 'sort'
  | 'clear';

export type MenuCatalogRefinementFlowScreen =
  | '/menu'
  | '/menu/detalhe'
  | '/menu/faces'
  | '/menu/carrinho'
  | '/menu/checkout'
  | '/menu/enviado';

export type MenuCatalogRefinementPlan = {
  sourceOfTruth: readonly ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'];
  stage: 1;
  freezeBehaviorInProduction: true;
  preserveBackendContracts: true;
  preserveOwnerScreens: true;
  publicEntryRoute: '/menu';
  heroBackgroundAsset: 'fundo_capa_cardapio_global.png';
  updateLabelStrategy: 'last-relevant-inventory-change';
  requiredInteractions: readonly MenuCatalogRefinementInteraction[];
  requiredFilters: readonly MenuCatalogRefinementFilter[];
  screensToRefineAfterCatalog: readonly MenuCatalogRefinementFlowScreen[];
  selectableStatuses: readonly ['Disponível'];
  blockedStatuses: readonly ['Em negociação', 'Ocupado', 'Ocupada'];
};

/**
 * Etapa 1 do refinamento final: escopo visual e funcional congelado.
 * Este arquivo existe apenas para orientar as próximas implementações.
 */
export const MENU_CATALOG_REFINEMENT_PLAN: MenuCatalogRefinementPlan = {
  sourceOfTruth: ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'],
  stage: 1,
  freezeBehaviorInProduction: true,
  preserveBackendContracts: true,
  preserveOwnerScreens: true,
  publicEntryRoute: '/menu',
  heroBackgroundAsset: 'fundo_capa_cardapio_global.png',
  updateLabelStrategy: 'last-relevant-inventory-change',
  requiredInteractions: ['media-carousel', 'video-modal', 'map-flip', 'selection-mode', 'add-to-cart', 'view-cart'],
  requiredFilters: ['search', 'mediaType', 'city', 'district', 'environment', 'availability', 'sort', 'clear'],
  screensToRefineAfterCatalog: ['/menu', '/menu/detalhe', '/menu/faces', '/menu/carrinho', '/menu/checkout', '/menu/enviado'],
  selectableStatuses: ['Disponível'],
  blockedStatuses: ['Em negociação', 'Ocupado', 'Ocupada'],
};
