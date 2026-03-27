import type { TutorialDefinition, TutorialModuleKey, TutorialSession, TutorialStep } from './types';

function step(step: TutorialStep): TutorialStep {
  return step;
}

function createTutorial(definition: TutorialDefinition): TutorialDefinition {
  const orderedSteps = [...definition.steps].sort((a, b) => a.order - b.order);

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  for (const step of orderedSteps) {
    if (seenIds.has(step.id)) {
      console.warn(`[tutorial] passo duplicado em ${definition.moduleKey}: ${step.id}`);
    }
    if (seenOrders.has(step.order)) {
      console.warn(`[tutorial] ordem duplicada em ${definition.moduleKey}: ${step.order}`);
    }
    seenIds.add(step.id);
    seenOrders.add(step.order);
  }

  return {
    ...definition,
    steps: orderedSteps,
  };
}

export const tutorialDefinitions: Record<TutorialModuleKey, TutorialDefinition> = {
  home: createTutorial({
    moduleKey: 'home',
    title: 'Página Inicial',
    version: 2,
    steps: [
      step({
        id: 'home-welcome',
        order: 1,
        title: 'Bem-vindo à Página Inicial',
        description:
          'Esta é a nova tela de entrada do aplicativo após o login. Ela foi criada para receber o usuário de forma mais amigável.',
        target: '[data-tour="home-welcome"]',
        placement: 'bottom',
      }),
      step({
        id: 'home-news-center',
        order: 2,
        title: 'Central de notícias',
        description:
          'Aqui ficará a futura central de notícias, comunicados, novidades e destaques importantes do sistema.',
        target: '[data-tour="home-news-center"]',
        placement: 'bottom',
      }),
      step({
        id: 'home-sidebar-navigation',
        order: 3,
        title: 'Navegação pelos módulos',
        description:
          'Use o menu lateral para acessar os módulos do sistema. Cada módulo poderá ter seu próprio tutorial guiado.',
        target: '[data-tour="home-sidebar-navigation"]',
        placement: 'right',
      }),
      step({
        id: 'home-get-started',
        order: 4,
        title: 'Por onde começar',
        description:
          'A Página Inicial será o ponto de partida para notícias e orientações. A partir daqui, você pode seguir para os módulos operacionais do sistema.',
        target: '[data-tour="home-get-started"]',
        placement: 'top',
      }),
    ],
  }),
  dashboard: createTutorial({
    moduleKey: 'dashboard',
    title: 'Dashboard',
    version: 2,
    steps: [
      step({
        id: 'dashboard-overview',
        order: 1,
        title: 'Visão geral do dashboard',
        description:
          'Aqui você acompanha um panorama consolidado da operação, com indicadores para leitura rápida do negócio.',
        target: '[data-tour="dashboard-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'dashboard-filters',
        order: 2,
        title: 'Filtros e período',
        description:
          'Use os filtros para refinar o intervalo e analisar os dados de acordo com o contexto desejado.',
        target: '[data-tour="dashboard-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'dashboard-kpis',
        order: 3,
        title: 'Cards e KPIs',
        description:
          'Os cards destacam os principais números do módulo e ajudam a identificar tendências, alertas e oportunidades.',
        target: '[data-tour="dashboard-kpis"]',
        placement: 'bottom',
      }),
      step({
        id: 'dashboard-sections',
        order: 4,
        title: 'Abas e segmentos internos',
        description:
          'Navegue pelas abas ou blocos internos para aprofundar a leitura por área, como comercial, financeiro, operações e inventário.',
        target: '[data-tour="dashboard-sections"]',
        placement: 'bottom',
      }),
      step({
        id: 'dashboard-reading',
        order: 5,
        title: 'Leitura gerencial',
        description:
          'Use o dashboard como uma visão executiva para acompanhar o desempenho geral e direcionar decisões.',
        target: '[data-tour="dashboard-reading"]',
        placement: 'top',
      }),
    ],
  }),
  inventory: createTutorial({
    moduleKey: 'inventory',
    title: 'Inventário',
    version: 2,
    steps: [
      step({
        id: 'inventory-overview',
        order: 1,
        title: 'Gestão do inventário',
        description:
          'Este módulo concentra os pontos de mídia cadastrados no sistema e organiza a base que será usada comercialmente.',
        target: '[data-tour="inventory-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'inventory-filters',
        order: 2,
        title: 'Busca e filtros',
        description:
          'Filtre a lista para encontrar rapidamente pontos de mídia por critérios relevantes da operação.',
        target: '[data-tour="inventory-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'inventory-list',
        order: 3,
        title: 'Lista de pontos',
        description:
          'Aqui você visualiza os pontos cadastrados e pode abrir cada item para consultar ou editar detalhes.',
        target: '[data-tour="inventory-list"]',
        placement: 'bottom',
      }),
      step({
        id: 'inventory-create',
        order: 4,
        title: 'Cadastrar novo ponto',
        description:
          'Use esta ação para criar um novo ponto de mídia e iniciar o preenchimento dos dados principais.',
        target: '[data-tour="inventory-create"]',
        placement: 'left',
      }),
      step({
        id: 'inventory-details',
        order: 5,
        title: 'Detalhes do ponto',
        description:
          'Ao abrir um ponto, você pode consultar dados completos, editar informações e manter o cadastro atualizado.',
        target: '[data-tour="inventory-details"]',
        placement: 'right',
      }),
      step({
        id: 'inventory-faces',
        order: 6,
        title: 'Faces do ponto',
        description:
          'As faces representam as unidades comercializáveis do ponto e fazem parte da lógica de disponibilidade e venda.',
        target: '[data-tour="inventory-faces"]',
        placement: 'right',
      }),
      step({
        id: 'inventory-commercial-usage',
        order: 7,
        title: 'Uso comercial',
        description:
          'O inventário alimenta módulos como Propostas, Reservas e Mídia Map, servindo de base para a operação comercial.',
        target: '[data-tour="inventory-commercial-usage"]',
        placement: 'top',
      }),
    ],
  }),
  mediamap: createTutorial({
    moduleKey: 'mediamap',
    title: 'Mídia Map',
    version: 3,
    steps: [
      step({
        id: 'mediamap-overview',
        order: 1,
        title: 'Visão geral do mapa',
        description:
          'O Mídia Map permite explorar os pontos de mídia em uma visualização geográfica e operacional.',
        target: '[data-tour="mediamap-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-navigation',
        order: 2,
        title: 'Navegação no mapa',
        description:
          'Use zoom, arraste e seleção para navegar pela área desejada e localizar os pontos com mais precisão.',
        target: '[data-tour="mediamap-navigation"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-filters',
        order: 3,
        title: 'Filtros do mapa',
        description:
          'Aplique filtros para reduzir a visualização aos pontos mais relevantes para a sua análise.',
        target: '[data-tour="mediamap-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-point-details',
        order: 4,
        title: 'Detalhes de um ponto',
        description:
          'Ao clicar em um ponto, você pode abrir informações detalhadas e aprofundar o contexto operacional ou comercial.',
        target: '[data-tour="mediamap-point-details"]',
        placement: 'right',
      }),
      step({
        id: 'mediamap-create',
        order: 5,
        title: 'Criar ponto pelo mapa',
        description:
          'Este fluxo ajuda a cadastrar novos pontos já partindo da posição geográfica desejada.',
        target: '[data-tour="mediamap-create"]',
        placement: 'left',
      }),
      step({
        id: 'mediamap-move',
        order: 6,
        title: 'Mover ponto no mapa',
        description:
          'Quando necessário, ajuste a localização de um ponto diretamente pelo mapa para manter a base consistente.',
        target: '[data-tour="mediamap-move"]',
        placement: 'left',
      }),
      step({
        id: 'mediamap-proposals',
        order: 7,
        title: 'Integração com propostas',
        description:
          'O mapa também apoia a seleção comercial de pontos, ajudando na montagem e contextualização das propostas.',
        target: '[data-tour="mediamap-proposals"]',
        placement: 'top',
      }),
    ],
  }),
  clients: createTutorial({
    moduleKey: 'clients',
    title: 'Clientes',
    version: 2,
    steps: [
      step({
        id: 'clients-overview',
        order: 1,
        title: 'Base de clientes',
        description:
          'Este módulo organiza os clientes do sistema e serve de apoio para o fluxo comercial.',
        target: '[data-tour="clients-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'clients-filters',
        order: 2,
        title: 'Busca e filtros',
        description:
          'Use os filtros para localizar clientes rapidamente e manter a operação comercial organizada.',
        target: '[data-tour="clients-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'clients-create',
        order: 3,
        title: 'Cadastrar cliente',
        description:
          'Crie um novo cliente para registrar a base comercial e dar suporte à geração de propostas e campanhas.',
        target: '[data-tour="clients-create"]',
        placement: 'left',
      }),
      step({
        id: 'clients-details',
        order: 4,
        title: 'Detalhes do cliente',
        description:
          'Abra o registro do cliente para consultar dados, histórico e informações complementares.',
        target: '[data-tour="clients-details"]',
        placement: 'right',
      }),
      step({
        id: 'clients-commercial-flow',
        order: 5,
        title: 'Uso no fluxo comercial',
        description:
          'Os clientes cadastrados se conectam a módulos como Propostas e Campanhas para sustentar a operação.',
        target: '[data-tour="clients-commercial-flow"]',
        placement: 'top',
      }),
    ],
  }),
  products: createTutorial({
    moduleKey: 'products',
    title: 'Produtos e Serviços',
    version: 2,
    steps: [
      step({
        id: 'products-overview',
        order: 1,
        title: 'Lista de produtos e serviços',
        description:
          'Aqui ficam os itens adicionais que podem ser usados para compor propostas e ofertas comerciais.',
        target: '[data-tour="products-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'products-create',
        order: 2,
        title: 'Cadastrar novo item',
        description:
          'Use esta ação para criar um novo produto ou serviço e disponibilizá-lo no fluxo comercial.',
        target: '[data-tour="products-create"]',
        placement: 'left',
      }),
      step({
        id: 'products-pricing',
        order: 3,
        title: 'Preço e tipo de cobrança',
        description:
          'Defina valores e critérios de cobrança para refletir corretamente a lógica comercial do item.',
        target: '[data-tour="products-pricing"]',
        placement: 'bottom',
      }),
      step({
        id: 'products-edit',
        order: 4,
        title: 'Edição do item',
        description:
          'Itens já cadastrados podem ser ajustados sempre que houver atualização de preço, descrição ou regra comercial.',
        target: '[data-tour="products-edit"]',
        placement: 'right',
      }),
      step({
        id: 'products-proposals',
        order: 5,
        title: 'Uso nas propostas',
        description:
          'Os produtos e serviços cadastrados podem ser adicionados às propostas para complementar a oferta comercial.',
        target: '[data-tour="products-proposals"]',
        placement: 'top',
      }),
    ],
  }),
  proposals: createTutorial({
    moduleKey: 'proposals',
    title: 'Propostas',
    version: 2,
    steps: [
      step({
        id: 'proposals-overview',
        order: 1,
        title: 'Lista de propostas',
        description:
          'Este módulo reúne as propostas comerciais e centraliza o acompanhamento do fluxo de negociação.',
        target: '[data-tour="proposals-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposals-filters',
        order: 2,
        title: 'Filtros e status',
        description:
          'Use os filtros para localizar propostas por etapa, responsável, cliente ou outros critérios relevantes.',
        target: '[data-tour="proposals-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposals-create',
        order: 3,
        title: 'Criar proposta',
        description:
          'A criação de uma proposta inicia o principal fluxo comercial do sistema, combinando mídias e itens adicionais.',
        target: '[data-tour="proposals-create"]',
        placement: 'left',
      }),
      step({
        id: 'proposals-details',
        order: 4,
        title: 'Detalhes e acompanhamento',
        description:
          'Abra uma proposta para consultar itens, status, versões e demais informações que sustentam a negociação.',
        target: '[data-tour="proposals-details"]',
        placement: 'right',
      }),
      step({
        id: 'proposals-sharing',
        order: 5,
        title: 'Envio e compartilhamento',
        description:
          'Depois de estruturada, a proposta pode ser compartilhada para análise, revisão e aprovação.',
        target: '[data-tour="proposals-sharing"]',
        placement: 'top',
      }),
    ],
  }),
  campaigns: createTutorial({
    moduleKey: 'campaigns',
    title: 'Campanhas',
    version: 2,
    steps: [
      step({
        id: 'campaigns-overview',
        order: 1,
        title: 'Lista de campanhas',
        description:
          'Este módulo concentra as campanhas e ajuda a acompanhar sua execução ao longo do tempo.',
        target: '[data-tour="campaigns-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'campaigns-filters',
        order: 2,
        title: 'Filtros e status',
        description:
          'Filtre as campanhas para acompanhar diferentes fases, contextos ou recortes operacionais.',
        target: '[data-tour="campaigns-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'campaigns-create',
        order: 3,
        title: 'Criar campanha',
        description:
          'Use este fluxo para registrar uma nova campanha e organizar sua execução dentro do sistema.',
        target: '[data-tour="campaigns-create"]',
        placement: 'left',
      }),
      step({
        id: 'campaigns-tracking',
        order: 4,
        title: 'Acompanhamento da campanha',
        description:
          'A campanha pode ser monitorada para garantir visibilidade sobre andamento, operação e entregas.',
        target: '[data-tour="campaigns-tracking"]',
        placement: 'right',
      }),
      step({
        id: 'campaigns-reports',
        order: 5,
        title: 'Operação e relatórios',
        description:
          'Use este módulo para consolidar a visão operacional e o histórico de execução das campanhas.',
        target: '[data-tour="campaigns-reports"]',
        placement: 'top',
      }),
    ],
  }),
  reservations: createTutorial({
    moduleKey: 'reservations',
    title: 'Reservas',
    version: 3,
    steps: [
      step({
        id: 'reservations-calendar',
        order: 1,
        title: 'Calendário de reservas',
        description:
          'Aqui você acompanha a ocupação dos períodos e organiza a agenda operacional dos pontos e faces.',
        target: '[data-tour="reservations-calendar"]',
        placement: 'bottom',
      }),
      step({
        id: 'reservations-status',
        order: 2,
        title: 'Legenda e status',
        description:
          'A legenda ajuda a interpretar os diferentes estados das reservas e conflitos de disponibilidade.',
        target: '[data-tour="reservations-status"]',
        placement: 'bottom',
      }),
      step({
        id: 'reservations-filters',
        order: 3,
        title: 'Filtros de visualização',
        description:
          'Use filtros para focar em períodos, pontos ou recortes específicos da agenda.',
        target: '[data-tour="reservations-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'reservations-period',
        order: 4,
        title: 'Abrir data ou período',
        description:
          'Ao selecionar uma data ou período, você pode aprofundar detalhes e tomar decisões sobre ocupação.',
        target: '[data-tour="reservations-period"]',
        placement: 'right',
      }),
      step({
        id: 'reservations-create',
        order: 5,
        title: 'Criar ou editar reserva',
        description:
          'Crie, edite ou revise reservas para manter a agenda alinhada com a operação e com o comercial.',
        target: '[data-tour="reservations-create"]',
        placement: 'left',
      }),
      step({
        id: 'reservations-conflicts',
        order: 6,
        title: 'Conflitos de disponibilidade',
        description:
          'O módulo ajuda a identificar conflitos e ajustar a alocação de forma segura.',
        target: '[data-tour="reservations-conflicts"]',
        placement: 'top',
      }),
    ],
  }),
  financial: createTutorial({
    moduleKey: 'financial',
    title: 'Financeiro',
    version: 2,
    steps: [
      step({
        id: 'financial-overview',
        order: 1,
        title: 'Visão geral do financeiro',
        description:
          'Este módulo reúne informações financeiras do sistema para apoiar controle, leitura e tomada de decisão.',
        target: '[data-tour="financial-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'financial-tabs',
        order: 2,
        title: 'Abas principais',
        description:
          'As seções internas ajudam a navegar entre diferentes perspectivas e rotinas do financeiro.',
        target: '[data-tour="financial-tabs"]',
        placement: 'bottom',
      }),
      step({
        id: 'financial-transactions',
        order: 3,
        title: 'Lançamentos',
        description:
          'Use esta área para controlar registros financeiros e manter a base operacional organizada.',
        target: '[data-tour="financial-transactions"]',
        placement: 'bottom',
      }),
      step({
        id: 'financial-payments',
        order: 4,
        title: 'Recebimentos e pagamentos',
        description:
          'Aqui você acompanha entradas e saídas para entender o fluxo financeiro do negócio.',
        target: '[data-tour="financial-payments"]',
        placement: 'right',
      }),
      step({
        id: 'financial-indicators',
        order: 5,
        title: 'Indicadores',
        description:
          'Os indicadores dão suporte à leitura gerencial e ajudam a identificar o estado financeiro da operação.',
        target: '[data-tour="financial-indicators"]',
        placement: 'top',
      }),
    ],
  }),
  messages: createTutorial({
    moduleKey: 'messages',
    title: 'Mensagens',
    version: 3,
    steps: [
      step({
        id: 'messages-list',
        order: 1,
        title: 'Lista de conversas',
        description:
          'Este módulo centraliza as conversas e organiza o histórico de comunicação dentro do sistema.',
        target: '[data-tour="messages-list"]',
        placement: 'bottom',
      }),
      step({
        id: 'messages-thread',
        order: 2,
        title: 'Conversa aberta',
        description:
          'Ao selecionar uma conversa, você pode acompanhar a thread e o contexto completo das mensagens.',
        target: '[data-tour="messages-thread"]',
        placement: 'right',
      }),
      step({
        id: 'messages-context',
        order: 3,
        title: 'Contexto vinculado',
        description:
          'As mensagens podem se relacionar com outros fluxos do sistema, ajudando a manter a comunicação contextualizada.',
        target: '[data-tour="messages-context"]',
        placement: 'right',
      }),
      step({
        id: 'messages-send',
        order: 4,
        title: 'Envio de mensagem',
        description:
          'Use esta área para responder, registrar e acompanhar a comunicação de forma centralizada.',
        target: '[data-tour="messages-send"]',
        placement: 'top',
      }),
    ],
  }),
  mediakit: createTutorial({
    moduleKey: 'mediakit',
    title: 'Mídia Kit',
    version: 2,
    steps: [
      step({
        id: 'mediakit-overview',
        order: 1,
        title: 'Visão geral do Mídia Kit',
        description:
          'Este módulo organiza a apresentação comercial do inventário e apoia o processo de venda.',
        target: '[data-tour="mediakit-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediakit-filters',
        order: 2,
        title: 'Filtros do catálogo',
        description:
          'Use os filtros para montar uma visualização mais relevante para a necessidade comercial.',
        target: '[data-tour="mediakit-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediakit-list',
        order: 3,
        title: 'Cards e lista de pontos',
        description:
          'Aqui você explora os pontos disponíveis no catálogo e pode comparar diferentes opções.',
        target: '[data-tour="mediakit-list"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediakit-details',
        order: 4,
        title: 'Detalhes do ponto',
        description:
          'Abra um item para ver mais informações, entender o contexto e preparar melhor a oferta comercial.',
        target: '[data-tour="mediakit-details"]',
        placement: 'right',
      }),
      step({
        id: 'mediakit-sharing',
        order: 5,
        title: 'Compartilhamento',
        description:
          'O Mídia Kit pode ser usado como apoio comercial para compartilhar uma seleção de pontos com clientes.',
        target: '[data-tour="mediakit-sharing"]',
        placement: 'left',
      }),
      step({
        id: 'mediakit-sales-usage',
        order: 6,
        title: 'Uso comercial',
        description:
          'Use este módulo para transformar o inventário em uma experiência de apresentação mais clara e vendável.',
        target: '[data-tour="mediakit-sales-usage"]',
        placement: 'top',
      }),
    ],
  }),
  promotions: createTutorial({
    moduleKey: 'promotions',
    title: 'Promoções',
    version: 2,
    steps: [
      step({
        id: 'promotions-list',
        order: 1,
        title: 'Lista de promoções',
        description:
          'Este módulo concentra as promoções cadastradas e ajuda a administrar ofertas especiais.',
        target: '[data-tour="promotions-list"]',
        placement: 'bottom',
      }),
      step({
        id: 'promotions-create',
        order: 2,
        title: 'Criar promoção',
        description:
          'Use esta ação para cadastrar uma nova promoção e definir sua aplicação dentro do sistema.',
        target: '[data-tour="promotions-create"]',
        placement: 'left',
      }),
      step({
        id: 'promotions-validity',
        order: 3,
        title: 'Vigência',
        description:
          'A vigência determina por quanto tempo a promoção estará disponível e em quais períodos ela vale.',
        target: '[data-tour="promotions-validity"]',
        placement: 'bottom',
      }),
      step({
        id: 'promotions-scope',
        order: 4,
        title: 'Escopo da promoção',
        description:
          'Defina o escopo para indicar onde e como a promoção será aplicada.',
        target: '[data-tour="promotions-scope"]',
        placement: 'right',
      }),
      step({
        id: 'promotions-impact',
        order: 5,
        title: 'Impacto nas propostas',
        description:
          'As promoções influenciam a oferta comercial e podem refletir diretamente na montagem das propostas.',
        target: '[data-tour="promotions-impact"]',
        placement: 'top',
      }),
    ],
  }),
  activities: createTutorial({
    moduleKey: 'activities',
    title: 'Atividades',
    version: 2,
    steps: [
      step({
        id: 'activities-feed',
        order: 1,
        title: 'Feed de atividades',
        description:
          'Este módulo exibe o histórico de atividades relevantes do sistema para apoio operacional e auditoria.',
        target: '[data-tour="activities-feed"]',
        placement: 'bottom',
      }),
      step({
        id: 'activities-filters',
        order: 2,
        title: 'Filtros de atividade',
        description:
          'Use os filtros para localizar eventos e recortes específicos do histórico.',
        target: '[data-tour="activities-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'activities-details',
        order: 3,
        title: 'Detalhes do evento',
        description:
          'Ao abrir um evento, você pode entender melhor o que aconteceu e em qual contexto.',
        target: '[data-tour="activities-details"]',
        placement: 'right',
      }),
      step({
        id: 'activities-audit',
        order: 4,
        title: 'Uso para acompanhamento',
        description:
          'O histórico de atividades ajuda na auditoria, no acompanhamento e na rastreabilidade das ações do sistema.',
        target: '[data-tour="activities-audit"]',
        placement: 'top',
      }),
    ],
  }),
  settings: createTutorial({
    moduleKey: 'settings',
    title: 'Configurações',
    version: 2,
    steps: [
      step({
        id: 'settings-company',
        order: 1,
        title: 'Dados da empresa',
        description:
          'Nesta área você pode revisar e ajustar as principais informações da empresa.',
        target: '[data-tour="settings-company"]',
        placement: 'bottom',
      }),
      step({
        id: 'settings-profile',
        order: 2,
        title: 'Perfil do usuário',
        description:
          'As configurações de perfil ajudam a manter seus dados pessoais e preferências alinhados.',
        target: '[data-tour="settings-profile"]',
        placement: 'bottom',
      }),
      step({
        id: 'settings-users',
        order: 3,
        title: 'Usuários e acessos',
        description:
          'Aqui você acompanha usuários da empresa e gerencia permissões dentro da operação.',
        target: '[data-tour="settings-users"]',
        placement: 'bottom',
      }),
      step({
        id: 'settings-subscription',
        order: 4,
        title: 'Assinatura e plano',
        description:
          'Use esta seção para consultar e acompanhar informações relacionadas ao plano contratado.',
        target: '[data-tour="settings-subscription"]',
        placement: 'right',
      }),
      step({
        id: 'settings-preferences',
        order: 5,
        title: 'Preferências',
        description:
          'Ajuste preferências relevantes para o uso contínuo do sistema e da conta.',
        target: '[data-tour="settings-preferences"]',
        placement: 'top',
      }),
    ],
  }),
  superadmin: createTutorial({
    moduleKey: 'superadmin',
    title: 'Super Admin',
    version: 2,
    steps: [
      step({
        id: 'superadmin-overview',
        order: 1,
        title: 'Visão geral do Super Admin',
        description:
          'Este módulo reúne ações administrativas sensíveis e deve ser usado com atenção.',
        target: '[data-tour="superadmin-overview"]',
        placement: 'bottom',
      }),
      step({
        id: 'superadmin-actions',
        order: 2,
        title: 'Ações globais',
        description:
          'Aqui ficam operações de maior alcance dentro do sistema, com impacto mais amplo na plataforma.',
        target: '[data-tour="superadmin-actions"]',
        placement: 'bottom',
      }),
      step({
        id: 'superadmin-sensitive-areas',
        order: 3,
        title: 'Áreas sensíveis',
        description:
          'Revise cuidadosamente esta seção antes de qualquer alteração, pois ela pode afetar dados e rotinas importantes.',
        target: '[data-tour="superadmin-sensitive-areas"]',
        placement: 'right',
      }),
      step({
        id: 'superadmin-impact',
        order: 4,
        title: 'Cuidado com impactos sistêmicos',
        description:
          'Antes de confirmar mudanças, avalie o impacto das ações administrativas sobre a operação como um todo.',
        target: '[data-tour="superadmin-impact"]',
        placement: 'top',
      }),
    ],
  }),
  'proposals-create-flow': createTutorial({
    moduleKey: 'proposals-create-flow',
    scopeModuleKey: 'proposals',
    title: 'Criação de proposta',
    version: 1,
    steps: [
      step({
        id: 'proposal-flow-overview',
        order: 1,
        title: 'Fluxo rápido da proposta',
        description:
          'Este mini tutorial acompanha a criação da proposta em duas etapas: dados gerais primeiro, itens e envio depois.',
        target: '[data-tour="proposal-wizard-header"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposal-flow-client',
        order: 2,
        title: 'Comece pelo cliente',
        description:
          'Selecione o cliente e preencha as informações gerais da proposta. Esses dados sustentam o restante do fluxo.',
        target: '[data-tour="proposal-flow-client"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposal-flow-next',
        order: 3,
        title: 'Avance para os itens',
        description:
          'Quando os dados obrigatórios estiverem prontos, avance para o passo de itens para montar a proposta comercial.',
        target: '[data-tour="proposal-flow-next"]',
        placement: 'top',
      }),
      step({
        id: 'proposal-flow-add-media',
        order: 4,
        title: 'Adicione mídias do inventário',
        description:
          'Inclua faces e unidades do inventário para compor a proposta com disponibilidade e valores calculados.',
        target: '[data-tour="proposal-flow-add-media"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposal-flow-add-product',
        order: 5,
        title: 'Some produtos e serviços',
        description:
          'Use produtos e serviços para complementar a proposta com itens adicionais de produção, instalação ou apoio.',
        target: '[data-tour="proposal-flow-add-product"]',
        placement: 'bottom',
      }),
      step({
        id: 'proposal-flow-submit',
        order: 6,
        title: 'Revise e envie',
        description:
          'No rodapé, você pode salvar como rascunho ou enviar a proposta quando os itens e valores estiverem prontos.',
        target: '[data-tour="proposal-flow-submit"]',
        placement: 'top',
      }),
    ],
  }),
  'mediamap-move-flow': createTutorial({
    moduleKey: 'mediamap-move-flow',
    scopeModuleKey: 'mediamap',
    title: 'Mover ponto no mapa',
    version: 2,
    steps: [
      step({
        id: 'mediamap-move-start',
        order: 1,
        title: 'Modo mover ativado',
        description:
          'Ao entrar nesse modo, o ponto fica pronto para reposicionamento sem sair do mapa.',
        target: '[data-tour="mediamap-move-active"]',
        placement: 'top',
      }),
      step({
        id: 'mediamap-move-pick',
        order: 2,
        title: 'Escolha a nova posição',
        description:
          'Clique no mapa ou arraste o pin azul para ajustar a localização exata do ponto.',
        target: '[data-tour="mediamap-navigation"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-move-confirm',
        order: 3,
        title: 'Confirme a alteração',
        description:
          'Depois de revisar a posição, confirme para salvar as novas coordenadas e atualizar o endereço automaticamente quando possível.',
        target: '[data-tour="mediamap-move-confirm"]',
        placement: 'top',
      }),
      step({
        id: 'mediamap-move-cancel',
        order: 4,
        title: 'Ou cancele sem salvar',
        description:
          'Se precisar desistir ou ajustar depois, cancele o modo mover sem alterar o cadastro atual.',
        target: '[data-tour="mediamap-move-cancel"]',
        placement: 'top',
      }),
    ],
  }),
  'mediamap-create-flow': createTutorial({
    moduleKey: 'mediamap-create-flow',
    scopeModuleKey: 'mediamap',
    title: 'Criar ponto pelo mapa',
    version: 2,
    steps: [
      step({
        id: 'mediamap-create-overview',
        order: 1,
        title: 'Criação a partir do mapa',
        description:
          'Este fluxo começa pela posição escolhida no mapa e já pré-preenche latitude e longitude do novo ponto.',
        target: '[data-tour="mediamap-create"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-create-preview',
        order: 2,
        title: 'Confira endereço e coordenadas',
        description:
          'Revise a prévia de coordenadas e endereço antes de seguir para o cadastro completo do ponto.',
        target: '[data-tour="mediamap-create-preview"]',
        placement: 'bottom',
      }),
      step({
        id: 'mediamap-create-confirm',
        order: 3,
        title: 'Continue para o formulário',
        description:
          'Ao confirmar, o sistema abre o formulário de inventário já preenchido com a localização escolhida.',
        target: '[data-tour="mediamap-create-confirm"]',
        placement: 'top',
      }),
    ],
  }),
  'campaigns-create-flow': createTutorial({
    moduleKey: 'campaigns-create-flow',
    scopeModuleKey: 'campaigns',
    title: 'Fluxo de criação da campanha',
    version: 1,
    steps: [
      step({
        id: 'campaigns-create-source',
        order: 1,
        title: 'A campanha nasce da proposta aprovada',
        description:
          'Neste sistema, a campanha não é criada manualmente aqui: ela surge quando a proposta é aprovada e entra em execução.',
        target: '[data-tour="campaigns-create"]',
        placement: 'bottom',
      }),
      step({
        id: 'campaigns-create-status',
        order: 2,
        title: 'Entenda o ciclo operacional',
        description:
          'Depois da aprovação, a campanha evolui pelos status de instalação, veiculação e encerramento conforme a operação avança.',
        target: '[data-tour="campaigns-reports"]',
        placement: 'bottom',
      }),
      step({
        id: 'campaigns-create-destination',
        order: 3,
        title: 'Onde acompanhar a campanha criada',
        description:
          'As campanhas geradas aparecem nas listas deste módulo para acompanhamento, check-in, faturamento e relatórios.',
        target: '[data-tour="campaigns-create-destination"]',
        placement: 'bottom',
      }),
    ],
  }),
  'reservations-conflicts-flow': createTutorial({
    moduleKey: 'reservations-conflicts-flow',
    scopeModuleKey: 'reservations',
    title: 'Leitura de conflitos em reservas',
    version: 2,
    steps: [
      step({
        id: 'reservations-conflicts-overview',
        order: 1,
        title: 'Comece pelo dia selecionado',
        description:
          'Escolha um dia no calendário para concentrar a análise do período e verificar tudo o que cai naquela data.',
        target: '[data-tour="reservations-conflicts-heading"]',
        placement: 'left',
      }),
      step({
        id: 'reservations-conflicts-filter',
        order: 2,
        title: 'Refine a leitura',
        description:
          'Use a busca para localizar rapidamente ponto, cliente, proposta ou campanha envolvidos na disputa de agenda.',
        target: '[data-tour="reservations-filters"]',
        placement: 'bottom',
      }),
      step({
        id: 'reservations-conflicts-list',
        order: 3,
        title: 'Analise os itens em conflito',
        description:
          'A lista reúne as reservas que tocam o dia selecionado. Abra cada cartão para entender status, cliente e valores.',
        target: '[data-tour="reservations-conflicts"]',
        placement: 'left',
      }),
    ],
  }),
};

// Etapa 8: liberar também os tours complementares previstos no escopo.
const activeTutorialModuleKeys = new Set<TutorialModuleKey>([
  'home',
  'dashboard',
  'inventory',
  'mediamap',
  'clients',
  'products',
  'proposals',
  'campaigns',
  'reservations',
  'financial',
  'messages',
  'mediakit',
  'promotions',
  'activities',
  'settings',
  'superadmin',
  'proposals-create-flow',
  'mediamap-move-flow',
  'mediamap-create-flow',
  'campaigns-create-flow',
  'reservations-conflicts-flow',
]);

export function listTutorialDefinitions(): TutorialDefinition[] {
  return Object.values(tutorialDefinitions).filter((definition) =>
    activeTutorialModuleKeys.has(definition.moduleKey),
  );
}

export function getTutorialDefinition(moduleKey: string | null | undefined): TutorialDefinition | null {
  if (!moduleKey) return null;

  const normalizedModuleKey = moduleKey as TutorialModuleKey;
  if (!activeTutorialModuleKeys.has(normalizedModuleKey)) return null;

  return tutorialDefinitions[normalizedModuleKey] ?? null;
}

export function hasTutorialDefinition(moduleKey: string | null | undefined): boolean {
  return Boolean(getTutorialDefinition(moduleKey));
}

export function buildTutorialSession(
  moduleKey: string | null | undefined,
  options?: Pick<TutorialSession, 'onClose' | 'onComplete'>,
): TutorialSession | null {
  const definition = getTutorialDefinition(moduleKey);
  if (!definition) return null;

  return {
    ...definition,
    onClose: options?.onClose,
    onComplete: options?.onComplete,
  };
}
