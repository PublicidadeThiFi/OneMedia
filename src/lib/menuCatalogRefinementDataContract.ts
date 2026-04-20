export type MenuCatalogRefinementStage2BackendGap =
  | 'lastInventoryChangeAt'
  | 'mediaGallery'
  | 'mediaKind'
  | 'orderedMediaCollection';

export type MenuCatalogRefinementStage2ReadyBlock =
  | 'token'
  | 'company'
  | 'heroMetrics'
  | 'aboutText'
  | 'generatedAt'
  | 'points'
  | 'units'
  | 'coordinates'
  | 'availability'
  | 'selectionFlow'
  | 'cartFlow';

export type MenuCatalogRefinementStage2ContractReview = {
  sourceOfTruth: readonly ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'];
  stage: 2;
  endpoint: '/api/public/media-kit';
  heroBackgroundAssetDeferredUntilFinalVisualStage: true;
  readyBlocks: readonly MenuCatalogRefinementStage2ReadyBlock[];
  mapPreviewReadyWithCurrentPayload: true;
  selectionAndCartCanReuseCurrentFlow: true;
  requiredBackendGaps: readonly MenuCatalogRefinementStage2BackendGap[];
};

/**
 * Etapa 2 do refinamento final: revisão técnica do contrato de dados.
 *
 * Este arquivo documenta o que o frontend já pode consumir hoje com segurança
 * no endpoint público do cardápio e o que ainda depende de reforço do backend
 * para sustentar a experiência final (última atualização real + galeria com
 * tipo de mídia e ordenação explícita).
 */
export const MENU_CATALOG_REFINEMENT_STAGE2_CONTRACT_REVIEW: MenuCatalogRefinementStage2ContractReview = {
  sourceOfTruth: ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'],
  stage: 2,
  endpoint: '/api/public/media-kit',
  heroBackgroundAssetDeferredUntilFinalVisualStage: true,
  readyBlocks: [
    'token',
    'company',
    'heroMetrics',
    'aboutText',
    'generatedAt',
    'points',
    'units',
    'coordinates',
    'availability',
    'selectionFlow',
    'cartFlow',
  ],
  mapPreviewReadyWithCurrentPayload: true,
  selectionAndCartCanReuseCurrentFlow: true,
  requiredBackendGaps: ['lastInventoryChangeAt', 'mediaGallery', 'mediaKind', 'orderedMediaCollection'],
};


export type MenuCatalogRefinementStage3ReadyBlock =
  | 'lastInventoryChangeAt'
  | 'generatedAtFallback';

export type MenuCatalogRefinementStage3ContractReview = {
  sourceOfTruth: readonly ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'];
  stage: 3;
  endpoint: '/api/public/media-kit';
  deliveredBlocks: readonly MenuCatalogRefinementStage3ReadyBlock[];
  remainingBackendGaps: readonly Exclude<MenuCatalogRefinementStage2BackendGap, 'lastInventoryChangeAt'>[];
  fallbackRule: 'frontend-may-fall-back-to-generatedAt-when-lastInventoryChangeAt-is-null';
};

/**
 * Etapa 3 do refinamento final: o frontend passa a reconhecer um campo
 * dedicado de última alteração real do inventário. Enquanto a cobertura não
 * for total em todos os ambientes, a UI ainda pode usar generatedAt como
 * fallback sem quebrar a exibição pública.
 */
export const MENU_CATALOG_REFINEMENT_STAGE3_CONTRACT_REVIEW: MenuCatalogRefinementStage3ContractReview = {
  sourceOfTruth: ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'],
  stage: 3,
  endpoint: '/api/public/media-kit',
  deliveredBlocks: ['lastInventoryChangeAt', 'generatedAtFallback'],
  remainingBackendGaps: ['mediaGallery', 'mediaKind', 'orderedMediaCollection'],
  fallbackRule: 'frontend-may-fall-back-to-generatedAt-when-lastInventoryChangeAt-is-null',
};


export type MenuCatalogRefinementStage4ReadyBlock =
  | 'mediaGallery'
  | 'mediaKind'
  | 'orderedMediaCollection'
  | 'legacyFallbackFields';

export type MenuCatalogRefinementStage4ContractReview = {
  sourceOfTruth: readonly ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'];
  stage: 4;
  endpoint: '/api/public/media-kit';
  deliveredBlocks: readonly MenuCatalogRefinementStage4ReadyBlock[];
  pointCollectionIncludesPointAndUnitMedia: true;
  frontendFallbackRule: 'frontend-may-fall-back-to-legacy-image-video-fields-when-mediaGallery-is-empty';
};

/**
 * Etapa 4 do refinamento final: o frontend passa a reconhecer uma galeria
 * pública estruturada por card, mantendo fallback para os campos legados
 * enquanto as etapas visuais e interativas ainda não consomem o carrossel.
 */
export const MENU_CATALOG_REFINEMENT_STAGE4_CONTRACT_REVIEW: MenuCatalogRefinementStage4ContractReview = {
  sourceOfTruth: ['Refinamento_Novo_Cardapio_Etapas.pdf', 'Mídia Kit.pdf'],
  stage: 4,
  endpoint: '/api/public/media-kit',
  deliveredBlocks: ['mediaGallery', 'mediaKind', 'orderedMediaCollection', 'legacyFallbackFields'],
  pointCollectionIncludesPointAndUnitMedia: true,
  frontendFallbackRule: 'frontend-may-fall-back-to-legacy-image-video-fields-when-mediaGallery-is-empty',
};
