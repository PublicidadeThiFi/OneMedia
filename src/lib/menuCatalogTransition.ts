import type { MenuCatalogLegacyRoute } from './menuCatalogScope';

export type MenuCatalogTargetComponent =
  | 'MenuCatalogPage'
  | 'MenuCatalogHero'
  | 'MenuCatalogAbout'
  | 'MenuCatalogActions'
  | 'MenuCatalogFilters'
  | 'MenuCatalogResults'
  | 'MenuCatalogGrid'
  | 'MenuCatalogCard';

export type MenuCatalogLegacyScreen = {
  route: MenuCatalogLegacyRoute;
  sourceFile: string;
  role: 'region-selection' | 'point-list' | 'point-detail' | 'unit-selection' | 'cart' | 'checkout' | 'request-status';
  keepDuringHomologation: true;
};

export type MenuCatalogTransitionPlan = {
  sourceOfTruth: string;
  stage: 2;
  strategy: 'parallel-build';
  entryRoute: '/menu';
  legacyFallbackEnabled: true;
  legacyScreens: readonly MenuCatalogLegacyScreen[];
  targetComponents: readonly {
    name: MenuCatalogTargetComponent;
    file: string;
    purpose: string;
  }[];
  existingDataDependencies: readonly string[];
  notes: readonly string[];
};

/**
 * Etapa 2: inventário técnico + estratégia de transição.
 * Não altera comportamento em produção; apenas registra a arquitetura aprovada
 * para a construção paralela do novo catálogo do cardápio.
 */
export const MENU_CATALOG_TRANSITION_PLAN: MenuCatalogTransitionPlan = {
  sourceOfTruth: 'Novo_Cardapio_Etapas.pdf',
  stage: 2,
  strategy: 'parallel-build',
  entryRoute: '/menu',
  legacyFallbackEnabled: true,
  legacyScreens: [
    {
      route: '/menu/uf',
      sourceFile: 'src/pages/menu-uf.tsx',
      role: 'region-selection',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/cidades',
      sourceFile: 'src/pages/menu-cidades.tsx',
      role: 'region-selection',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/pontos',
      sourceFile: 'src/pages/menu-pontos.tsx',
      role: 'point-list',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/detalhe',
      sourceFile: 'src/pages/menu-detalhe.tsx',
      role: 'point-detail',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/faces',
      sourceFile: 'src/pages/menu-faces.tsx',
      role: 'unit-selection',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/carrinho',
      sourceFile: 'src/pages/menu-carrinho.tsx',
      role: 'cart',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/checkout',
      sourceFile: 'src/pages/menu-checkout.tsx',
      role: 'checkout',
      keepDuringHomologation: true,
    },
    {
      route: '/menu/enviado',
      sourceFile: 'src/pages/menu-enviado.tsx',
      role: 'request-status',
      keepDuringHomologation: true,
    },
  ],
  targetComponents: [
    {
      name: 'MenuCatalogPage',
      file: 'src/components/menu/catalog/MenuCatalogPage.tsx',
      purpose: 'Página raiz do novo catálogo unificado.',
    },
    {
      name: 'MenuCatalogHero',
      file: 'src/components/menu/catalog/MenuCatalogHero.tsx',
      purpose: 'Hero com capa, logo e última atualização.',
    },
    {
      name: 'MenuCatalogAbout',
      file: 'src/components/menu/catalog/MenuCatalogAbout.tsx',
      purpose: 'Bloco institucional “Sobre nós”.',
    },
    {
      name: 'MenuCatalogActions',
      file: 'src/components/menu/catalog/MenuCatalogActions.tsx',
      purpose: 'Área de ações rápidas e compartilhamento.',
    },
    {
      name: 'MenuCatalogFilters',
      file: 'src/components/menu/catalog/MenuCatalogFilters.tsx',
      purpose: 'Filtros locais do catálogo.',
    },
    {
      name: 'MenuCatalogResults',
      file: 'src/components/menu/catalog/MenuCatalogResults.tsx',
      purpose: 'Resumo do resultado filtrado.',
    },
    {
      name: 'MenuCatalogGrid',
      file: 'src/components/menu/catalog/MenuCatalogGrid.tsx',
      purpose: 'Grade visual dos pontos.',
    },
    {
      name: 'MenuCatalogCard',
      file: 'src/components/menu/catalog/MenuCatalogCard.tsx',
      purpose: 'Card individual do ponto.',
    },
  ],
  existingDataDependencies: [
    'src/hooks/usePublicMediaKit.ts',
    'src/lib/publicMediaKit.ts',
    'src/lib/menuFlow.ts',
    'src/App.tsx',
  ],
  notes: [
    'O funil legado continua sendo a rota operacional até a etapa de integração.',
    'O novo /menu só deve substituir a entrada atual quando o catálogo estiver visualmente homologado.',
    'Nenhuma exclusão de rota ou arquivo deve acontecer nesta etapa.',
  ],
};
