import { MediaPoint, MediaUnit, MediaPointOwner, MediaPointContract, MediaType, UnitType, Orientation, OwnerRegime, Client, ClientStatus, User, UserStatus, Proposal, ProposalStatus, Product, ProductType, PriceType, ProposalItem, Campaign, CampaignStatus, BillingInvoice, BillingStatus, PaymentMethod, Reservation, CashTransaction, CashFlowType, PaymentType } from '../types';

// Tipo para documentos de cliente (seguindo schema Prisma)
export interface ClientDocument {
  id: string;
  companyId: string;
  clientId: string;
  fileName: string;
  s3Key: string;
  documentType: string;
  uploadedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data para MediaPoints
export const mockMediaPoints: MediaPoint[] = [
  {
    id: 'mp1',
    companyId: 'c1',
    type: MediaType.OOH,
    subcategory: 'OUTDOOR',
    name: 'Outdoor Av. Paulista 1000',
    description: 'Outdoor de frente para o fluxo principal da Avenida Paulista',
    addressZipcode: '01310-100',
    addressStreet: 'Avenida Paulista',
    addressNumber: '1000',
    addressDistrict: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    latitude: -23.561414,
    longitude: -46.655881,
    dailyImpressions: 85000,
    socialClasses: ['A', 'B', 'C'],
    environment: 'Avenida Principal',
    showInMediaKit: true,
    basePriceMonth: 8500,
    basePriceWeek: 2500,
    basePriceDay: 450,
    mainImageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mp2',
    companyId: 'c1',
    type: MediaType.DOOH,
    subcategory: 'PAINEL_LED',
    name: 'Painel Digital Shopping Iguatemi',
    description: 'Painel LED de alta resolução na praça de alimentação',
    addressZipcode: '04544-001',
    addressStreet: 'Avenida Brigadeiro Faria Lima',
    addressNumber: '2232',
    addressDistrict: 'Itaim Bibi',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    latitude: -23.583627,
    longitude: -46.687717,
    dailyImpressions: 120000,
    socialClasses: ['A', 'B'],
    environment: 'Shopping Center',
    showInMediaKit: true,
    basePriceMonth: 12000,
    basePriceWeek: 3500,
    basePriceDay: 650,
    mainImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'mp3',
    companyId: 'c1',
    type: MediaType.OOH,
    subcategory: 'EMPENA',
    name: 'Empena Marginal Tietê',
    description: 'Empena lateral de edifício com visibilidade da Marginal',
    addressStreet: 'Marginal Tietê',
    addressNumber: 'Km 15',
    addressDistrict: 'Barra Funda',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    latitude: -23.520393,
    longitude: -46.662948,
    dailyImpressions: 150000,
    socialClasses: ['A', 'B', 'C', 'D'],
    environment: 'Rodovia',
    showInMediaKit: true,
    basePriceMonth: 15000,
    basePriceWeek: 4200,
    basePriceDay: 750,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Mock data para MediaUnits
export const mockMediaUnits: MediaUnit[] = [
  {
    id: 'mu1',
    companyId: 'c1',
    mediaPointId: 'mp1',
    unitType: UnitType.FACE,
    label: 'Face 1 - Fluxo',
    orientation: Orientation.FLUXO,
    widthM: 9,
    heightM: 3,
    priceMonth: 8500,
    priceWeek: 2500,
    priceDay: 450,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mu2',
    companyId: 'c1',
    mediaPointId: 'mp1',
    unitType: UnitType.FACE,
    label: 'Face 2 - Contra-Fluxo',
    orientation: Orientation.CONTRA_FLUXO,
    widthM: 9,
    heightM: 3,
    priceMonth: 7500,
    priceWeek: 2200,
    priceDay: 400,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mu3',
    companyId: 'c1',
    mediaPointId: 'mp2',
    unitType: UnitType.SCREEN,
    label: 'Tela 1',
    insertionsPerDay: 240,
    resolutionWidthPx: 1920,
    resolutionHeightPx: 1080,
    priceMonth: 12000,
    priceWeek: 3500,
    priceDay: 650,
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'mu4',
    companyId: 'c1',
    mediaPointId: 'mp2',
    unitType: UnitType.SCREEN,
    label: 'Tela 2',
    insertionsPerDay: 240,
    resolutionWidthPx: 1920,
    resolutionHeightPx: 1080,
    priceMonth: 12000,
    priceWeek: 3500,
    priceDay: 650,
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'mu5',
    companyId: 'c1',
    mediaPointId: 'mp3',
    unitType: UnitType.FACE,
    label: 'Face Única',
    orientation: Orientation.FLUXO,
    widthM: 12,
    heightM: 8,
    priceMonth: 15000,
    priceWeek: 4200,
    priceDay: 750,
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Mock data para MediaPointOwners
export const mockMediaPointOwners: MediaPointOwner[] = [
  {
    id: 'mpo1',
    companyId: 'c1',
    mediaPointId: 'mp1',
    ownerName: 'Imóveis Paulista Ltda',
    ownerDocument: '12.345.678/0001-90',
    regime: OwnerRegime.AREA_PARTICULAR,
    rentValue: 3500,
    fixedExpenseDueDay: 10,
    notes: 'Contrato de locação de 24 meses renovável',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mpo2',
    companyId: 'c1',
    mediaPointId: 'mp2',
    ownerName: 'Shopping Iguatemi',
    ownerDocument: '98.765.432/0001-10',
    regime: OwnerRegime.AREA_PARTICULAR,
    rentValue: 5000,
    fixedExpenseDueDay: 5,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'mpo3',
    companyId: 'c1',
    mediaPointId: 'mp3',
    ownerName: 'DER - Departamento de Estradas',
    ownerDocument: '11.222.333/0001-44',
    regime: OwnerRegime.DER,
    derMonthlyFee: 2500,
    fixedExpenseDueDay: 15,
    notes: 'Concessão DER com taxa mensal fixa',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Mock data para MediaPointContracts
export const mockMediaPointContracts: MediaPointContract[] = [
  {
    id: 'mpc1',
    companyId: 'c1',
    mediaPointId: 'mp1',
    fileName: 'contrato-locacao-paulista-1000.pdf',
    s3Key: 'contracts/c1/mp1/contrato-locacao-paulista-1000.pdf',
    signedAt: new Date('2024-01-10'),
    expiresAt: new Date('2026-01-10'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'mpc2',
    companyId: 'c1',
    mediaPointId: 'mp2',
    fileName: 'contrato-shopping-iguatemi.pdf',
    s3Key: 'contracts/c1/mp2/contrato-shopping-iguatemi.pdf',
    signedAt: new Date('2024-01-15'),
    expiresAt: new Date('2025-01-15'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
];

// Helper functions
export const getMediaUnitsForPoint = (mediaPointId: string): MediaUnit[] => {
  return mockMediaUnits.filter(unit => unit.mediaPointId === mediaPointId);
};

export const getOwnersForPoint = (mediaPointId: string): MediaPointOwner[] => {
  return mockMediaPointOwners.filter(owner => owner.mediaPointId === mediaPointId);
};

export const getContractsForPoint = (mediaPointId: string): MediaPointContract[] => {
  return mockMediaPointContracts.filter(contract => contract.mediaPointId === mediaPointId);
};

// Subcategorias por tipo
export const OOH_SUBCATEGORIES = [
  'OUTDOOR',
  'FRONT_LIGHT',
  'TOTEM',
  'EMPENA',
  'PAINEL_RODOVIARIO',
];

export const DOOH_SUBCATEGORIES = [
  'PAINEL_LED',
  'TELA_DIGITAL',
  'PAINEL_ELETRONICO',
];

// Ambientes disponíveis
export const ENVIRONMENTS = [
  'Shopping Center',
  'Rodovia',
  'Avenida Principal',
  'Terminal de Ônibus',
  'Centro Comercial',
  'Bairro Residencial',
  'Aeroporto',
  'Estação de Metrô',
];

// Estados brasileiros
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// Classes sociais
export const SOCIAL_CLASSES = ['A', 'B', 'C', 'D', 'E'];

// Mock data para Users
export const mockUsers: User[] = [
  {
    id: 'u1',
    companyId: 'c1',
    name: 'Carlos Mendes',
    email: 'carlos@empresa.com',
    phone: '(11) 91234-5678',
    isSuperAdmin: false,
    twoFactorEnabled: false,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'u2',
    companyId: 'c1',
    name: 'Ana Paula Silva',
    email: 'ana@empresa.com',
    phone: '(11) 91234-5679',
    isSuperAdmin: false,
    twoFactorEnabled: false,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'u3',
    companyId: 'c1',
    name: 'Roberto Costa',
    email: 'roberto@empresa.com',
    isSuperAdmin: false,
    twoFactorEnabled: false,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock data para Clients
export const mockClients: Client[] = [
  {
    id: 'cl1',
    companyId: 'c1',
    contactName: 'João Silva',
    email: 'joao@techsolutions.com',
    phone: '(11) 98765-4321',
    companyName: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    role: 'Diretor de Marketing',
    addressZipcode: '01310-100',
    addressStreet: 'Av. Paulista',
    addressNumber: '1500',
    addressDistrict: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressCountry: 'Brasil',
    status: ClientStatus.CLIENTE,
    origin: 'Indicação',
    notes: 'Cliente VIP, sempre solicita campanhas de alta visibilidade',
    ownerUserId: 'u1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 'cl2',
    companyId: 'c1',
    contactName: 'Maria Santos',
    email: 'maria@marketingpro.com',
    phone: '(11) 97654-3210',
    companyName: 'Marketing Pro',
    role: 'Gerente de Marketing',
    addressCity: 'Rio de Janeiro',
    addressState: 'RJ',
    status: ClientStatus.PROSPECT,
    origin: 'Website',
    notes: 'Interessada em campanhas DOOH',
    ownerUserId: 'u2',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'cl3',
    companyId: 'c1',
    contactName: 'Carlos Oliveira',
    email: 'carlos@varejoplus.com',
    phone: '(11) 96543-2109',
    companyName: 'Varejo Plus',
    cnpj: '98.765.432/0001-10',
    role: 'CEO',
    addressCity: 'São Paulo',
    addressState: 'SP',
    status: ClientStatus.LEAD,
    origin: 'LinkedIn',
    ownerUserId: 'u1',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'cl4',
    companyId: 'c1',
    contactName: 'Patricia Alves',
    email: 'patricia@fashion.com.br',
    phone: '(21) 99876-5432',
    companyName: 'Fashion Brands Brasil',
    cnpj: '11.222.333/0001-44',
    role: 'Diretora Comercial',
    addressZipcode: '22640-100',
    addressStreet: 'Av. Atlântica',
    addressNumber: '2000',
    addressDistrict: 'Copacabana',
    addressCity: 'Rio de Janeiro',
    addressState: 'RJ',
    addressCountry: 'Brasil',
    status: ClientStatus.CLIENTE,
    origin: 'Evento',
    notes: 'Cliente recorrente, foco em moda e lifestyle',
    ownerUserId: 'u2',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: 'cl5',
    companyId: 'c1',
    contactName: 'Fernando Costa',
    email: 'fernando@autopeças.com',
    phone: '(11) 95432-1098',
    companyName: 'Auto Peças Nacional',
    status: ClientStatus.LEAD,
    origin: 'Indicação',
    ownerUserId: 'u3',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15'),
  },
  {
    id: 'cl6',
    companyId: 'c1',
    contactName: 'Juliana Mendes',
    email: 'juliana@foodcorp.com',
    phone: '(11) 94321-0987',
    companyName: 'Food Corporation',
    cnpj: '55.666.777/0001-88',
    role: 'CMO',
    addressCity: 'Campinas',
    addressState: 'SP',
    status: ClientStatus.INATIVO,
    origin: 'Website',
    notes: 'Cliente inativo desde 2023, não renovou contrato',
    ownerUserId: 'u1',
    createdAt: new Date('2023-05-10'),
    updatedAt: new Date('2023-12-31'),
  },
];

// Mock data para Proposals
export const mockProposals: Proposal[] = [
  {
    id: 'pr1',
    companyId: 'c1',
    clientId: 'cl1',
    responsibleUserId: 'u1',
    title: 'Campanha OOH Av. Paulista - Q1 2024',
    status: ProposalStatus.APROVADA,
    totalAmount: 25500,
    validUntil: new Date('2024-02-15'),
    approvedAt: new Date('2024-01-20'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'pr2',
    companyId: 'c1',
    clientId: 'cl1',
    responsibleUserId: 'u1',
    title: 'Campanha DOOH Shopping - Q2 2024',
    status: ProposalStatus.ENVIADA,
    totalAmount: 36000,
    validUntil: new Date('2024-04-30'),
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'pr3',
    companyId: 'c1',
    clientId: 'cl2',
    responsibleUserId: 'u2',
    title: 'Proposta Inicial - Digital Iguatemi',
    status: ProposalStatus.ENVIADA,
    totalAmount: 12000,
    validUntil: new Date('2024-03-31'),
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: 'pr4',
    companyId: 'c1',
    clientId: 'cl4',
    responsibleUserId: 'u2',
    title: 'Campanha Verão Fashion Brands',
    status: ProposalStatus.APROVADA,
    totalAmount: 45000,
    discountPercent: 10,
    discountAmount: 4500,
    approvedAt: new Date('2024-02-20'),
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 'pr5',
    companyId: 'c1',
    clientId: 'cl1',
    responsibleUserId: 'u1',
    title: 'Empena Marginal - Campanha Institucional',
    status: ProposalStatus.APROVADA,
    totalAmount: 60000,
    approvedAt: new Date('2024-02-05'),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-05'),
  },
];

// Mock data para ClientDocuments
export const mockClientDocuments: ClientDocument[] = [
  {
    id: 'cd1',
    companyId: 'c1',
    clientId: 'cl1',
    fileName: 'contrato-tech-solutions-2024.pdf',
    s3Key: 'documents/c1/cl1/contrato-tech-solutions-2024.pdf',
    documentType: 'CONTRATO',
    uploadedByUserId: 'u1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'cd2',
    companyId: 'c1',
    clientId: 'cl1',
    fileName: 'briefing-campanha-q1.pdf',
    s3Key: 'documents/c1/cl1/briefing-campanha-q1.pdf',
    documentType: 'BRIEFING',
    uploadedByUserId: 'u1',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'cd3',
    companyId: 'c1',
    clientId: 'cl1',
    fileName: 'logo-tech-solutions.png',
    s3Key: 'documents/c1/cl1/logo-tech-solutions.png',
    documentType: 'LOGO',
    uploadedByUserId: 'u1',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'cd4',
    companyId: 'c1',
    clientId: 'cl4',
    fileName: 'contrato-fashion-brands.pdf',
    s3Key: 'documents/c1/cl4/contrato-fashion-brands.pdf',
    documentType: 'CONTRATO',
    uploadedByUserId: 'u2',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
  {
    id: 'cd5',
    companyId: 'c1',
    clientId: 'cl2',
    fileName: 'apresentacao-inicial.pptx',
    s3Key: 'documents/c1/cl2/apresentacao-inicial.pptx',
    documentType: 'APRESENTACAO',
    uploadedByUserId: 'u2',
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date('2024-02-12'),
  },
];

// Helper functions para Clients
export const getDocumentsForClient = (clientId: string): ClientDocument[] => {
  return mockClientDocuments.filter(doc => doc.clientId === clientId);
};

export const getProposalsForClient = (clientId: string): Proposal[] => {
  return mockProposals.filter(proposal => proposal.clientId === clientId);
};

export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(user => user.id === userId);
};

// Mock data para Products
export const mockProducts: Product[] = [
  {
    id: 'prod1',
    companyId: 'c1',
    name: 'Impressão de Lona',
    description: 'Impressão de lona em alta qualidade, resistente a intempéries',
    category: 'Material',
    type: ProductType.PRODUTO,
    priceType: PriceType.UNITARIO,
    basePrice: 45.00,
    isAdditional: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod2',
    companyId: 'c1',
    name: 'Instalação OOH',
    description: 'Serviço completo de instalação de mídia OOH com equipe especializada',
    category: 'Serviço',
    type: ProductType.SERVICO,
    priceType: PriceType.A_PARTIR_DE,
    basePrice: 350.00,
    isAdditional: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'prod3',
    companyId: 'c1',
    name: 'Criação de Arte',
    description: 'Design e criação de peças publicitárias profissionais',
    category: 'Serviço',
    type: ProductType.SERVICO,
    priceType: PriceType.PACOTE,
    basePrice: 800.00,
    isAdditional: false,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
  {
    id: 'prod4',
    companyId: 'c1',
    name: 'Manutenção Preventiva',
    description: 'Serviço de manutenção e limpeza periódica de pontos de mídia',
    category: 'Serviço',
    type: ProductType.SERVICO,
    priceType: PriceType.UNITARIO,
    basePrice: 250.00,
    isAdditional: true,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 'prod5',
    companyId: 'c1',
    name: 'Iluminação LED',
    description: 'Kit de iluminação LED para mídia OOH',
    category: 'Material',
    type: ProductType.PRODUTO,
    priceType: PriceType.UNITARIO,
    basePrice: 1200.00,
    isAdditional: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'prod6',
    companyId: 'c1',
    name: 'Produção de Vídeo',
    description: 'Produção de conteúdo em vídeo para mídia DOOH',
    category: 'Serviço',
    type: ProductType.SERVICO,
    priceType: PriceType.A_PARTIR_DE,
    basePrice: 1500.00,
    isAdditional: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'prod7',
    companyId: 'c1',
    name: 'Estrutura Metálica',
    description: 'Estrutura metálica reforçada para suporte de mídia OOH',
    category: 'Material',
    type: ProductType.PRODUTO,
    priceType: PriceType.UNITARIO,
    basePrice: 2500.00,
    isAdditional: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'prod8',
    companyId: 'c1',
    name: 'Monitoramento Digital',
    description: 'Serviço de monitoramento e relatório de veiculação digital',
    category: 'Serviço',
    type: ProductType.SERVICO,
    priceType: PriceType.PACOTE,
    basePrice: 500.00,
    isAdditional: false,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
];

// Mock data para ProposalItems
export const mockProposalItems: ProposalItem[] = [
  // Itens da proposta pr1
  {
    id: 'pi1',
    companyId: 'c1',
    proposalId: 'pr1',
    mediaUnitId: 'mu1',
    productId: undefined,
    description: 'Face 1 - Outdoor Av. Paulista - 3 meses',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    quantity: 3,
    unitPrice: 8500,
    totalPrice: 25500,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'pi2',
    companyId: 'c1',
    proposalId: 'pr1',
    productId: 'prod1',
    mediaUnitId: undefined,
    description: 'Impressão de Lona - 2 unidades',
    startDate: undefined,
    endDate: undefined,
    quantity: 2,
    unitPrice: 45,
    totalPrice: 90,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  // Itens da proposta pr2
  {
    id: 'pi3',
    companyId: 'c1',
    proposalId: 'pr2',
    mediaUnitId: 'mu3',
    productId: undefined,
    description: 'Tela Digital Shopping - 1 mês',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    quantity: 1,
    unitPrice: 12000,
    totalPrice: 12000,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  // Itens da proposta pr3
  {
    id: 'pi4',
    companyId: 'c1',
    proposalId: 'pr3',
    mediaUnitId: 'mu1',
    productId: undefined,
    description: 'Face 1 - Outdoor Av. Paulista - 1 mês',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-30'),
    quantity: 1,
    unitPrice: 8500,
    totalPrice: 8500,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'pi5',
    companyId: 'c1',
    proposalId: 'pr3',
    mediaUnitId: 'mu2',
    productId: undefined,
    description: 'Face 2 - Outdoor Av. Paulista - 1 mês',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-30'),
    quantity: 1,
    unitPrice: 7500,
    totalPrice: 7500,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'pi6',
    companyId: 'c1',
    proposalId: 'pr3',
    productId: 'prod3',
    mediaUnitId: undefined,
    description: 'Criação de Arte - Pacote completo',
    startDate: undefined,
    endDate: undefined,
    quantity: 1,
    unitPrice: 800,
    totalPrice: 800,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  // Itens da proposta pr4
  {
    id: 'pi7',
    companyId: 'c1',
    proposalId: 'pr4',
    mediaUnitId: 'mu3',
    productId: undefined,
    description: 'Painel Digital Shopping - 3 meses',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-05-31'),
    quantity: 3,
    unitPrice: 12000,
    totalPrice: 36000,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'pi8',
    companyId: 'c1',
    proposalId: 'pr4',
    productId: 'prod6',
    mediaUnitId: undefined,
    description: 'Produção de Vídeo - 2 vídeos',
    startDate: undefined,
    endDate: undefined,
    quantity: 2,
    unitPrice: 1500,
    totalPrice: 3000,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  // Itens da proposta pr5
  {
    id: 'pi9',
    companyId: 'c1',
    proposalId: 'pr5',
    mediaUnitId: 'mu5',
    productId: undefined,
    description: 'Empena Marginal Tietê - 4 meses',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-06-30'),
    quantity: 4,
    unitPrice: 15000,
    totalPrice: 60000,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Mock data para Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: 'camp1',
    companyId: 'c1',
    proposalId: 'pr1',
    clientId: 'cl1',
    name: 'Campanha OOH Av. Paulista - Q1 2024',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    status: CampaignStatus.ATIVA,
    totalAmountCents: 2550000, // R$ 25.500
    approvedAt: new Date('2024-01-25'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'camp2',
    companyId: 'c1',
    proposalId: 'pr5',
    clientId: 'cl1',
    name: 'Empena Marginal - Campanha Institucional',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-06-30'),
    status: CampaignStatus.EM_INSTALACAO,
    totalAmountCents: 6000000, // R$ 60.000
    approvedAt: new Date('2024-02-15'),
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 'camp3',
    companyId: 'c1',
    proposalId: 'pr4',
    clientId: 'cl4',
    name: 'Campanha Verão Fashion Brands',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-05-31'),
    status: CampaignStatus.ATIVA,
    totalAmountCents: 4050000, // R$ 40.500
    approvedAt: new Date('2024-02-25'),
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'camp4',
    companyId: 'c1',
    proposalId: 'pr2',
    clientId: 'cl2',
    name: 'Campanha Digital Shopping Center',
    startDate: new Date('2024-11-15'),
    endDate: new Date('2024-12-30'),
    status: CampaignStatus.ATIVA,
    totalAmountCents: 4500000, // R$ 45.000
    approvedAt: new Date('2024-11-01'),
    createdAt: new Date('2024-10-20'),
    updatedAt: new Date('2024-11-15'),
  },
  {
    id: 'camp5',
    companyId: 'c1',
    proposalId: 'pr3',
    clientId: 'cl2',
    name: 'Campanha Back Light Zona Sul',
    startDate: new Date('2024-11-20'),
    endDate: new Date('2024-12-20'),
    status: CampaignStatus.APROVADA,
    totalAmountCents: 1200000, // R$ 12.000
    approvedAt: new Date('2024-11-27'),
    createdAt: new Date('2024-11-10'),
    updatedAt: new Date('2024-11-27'),
  },
  {
    id: 'camp6',
    companyId: 'c1',
    proposalId: 'pr6',
    clientId: 'cl3',
    name: 'Campanha Totem Digital Aeroporto',
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-31'),
    status: CampaignStatus.AGUARDANDO_MATERIAL,
    totalAmountCents: 3500000, // R$ 35.000
    approvedAt: new Date('2024-11-20'),
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-11-25'),
  },
];

// Mock data para BillingInvoices
export const mockBillingInvoices: BillingInvoice[] = [
  // Faturas pagas (recebido no mês - novembro 2024)
  {
    id: 'bi1',
    companyId: 'c1',
    clientId: 'cl1',
    proposalId: 'pr1',
    campaignId: 'camp1',
    dueDate: new Date('2024-11-15'),
    amount: 25500,
    amountCents: 2550000,
    status: BillingStatus.PAGA,
    paymentMethod: PaymentMethod.PIX,
    generateNf: true,
    paidAt: new Date('2024-11-10'),
    createdAt: new Date('2024-10-20'),
    updatedAt: new Date('2024-11-10'),
  },
  {
    id: 'bi2',
    companyId: 'c1',
    clientId: 'cl4',
    proposalId: 'pr4',
    campaignId: 'camp3',
    dueDate: new Date('2024-11-20'),
    amount: 40500,
    amountCents: 4050000,
    status: BillingStatus.PAGA,
    paymentMethod: PaymentMethod.BOLETO,
    generateNf: true,
    paidAt: new Date('2024-11-18'),
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-11-18'),
  },
  {
    id: 'bi8',
    companyId: 'c1',
    clientId: 'cl2',
    proposalId: 'pr2',
    campaignId: 'camp4',
    dueDate: new Date('2024-11-25'),
    amount: 45000,
    amountCents: 4500000,
    status: BillingStatus.PAGA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    generateNf: true,
    paidAt: new Date('2024-11-22'),
    createdAt: new Date('2024-10-25'),
    updatedAt: new Date('2024-11-22'),
  },
  
  // Faturas abertas (a vencer nos próximos 7 dias)
  {
    id: 'bi3',
    companyId: 'c1',
    clientId: 'cl1',
    proposalId: 'pr5',
    campaignId: 'camp2',
    dueDate: new Date('2024-12-05'),
    amount: 60000,
    amountCents: 6000000,
    status: BillingStatus.ABERTA,
    generateNf: true,
    createdAt: new Date('2024-11-05'),
    updatedAt: new Date('2024-11-05'),
  },
  {
    id: 'bi9',
    companyId: 'c1',
    clientId: 'cl3',
    proposalId: 'pr6',
    campaignId: 'camp6',
    dueDate: new Date('2024-12-03'),
    amount: 35000,
    amountCents: 3500000,
    status: BillingStatus.ABERTA,
    generateNf: true,
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-11-20'),
  },
  
  // Faturas abertas (a faturar - prazo mais longo)
  {
    id: 'bi4',
    companyId: 'c1',
    clientId: 'cl2',
    proposalId: 'pr3',
    campaignId: 'camp5',
    dueDate: new Date('2024-12-20'),
    amount: 12000,
    amountCents: 1200000,
    status: BillingStatus.ABERTA,
    generateNf: true,
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-11-15'),
  },
  
  // Faturas enviadas (aguardando pagamento)
  {
    id: 'bi5',
    companyId: 'c1',
    clientId: 'cl1',
    proposalId: 'pr1',
    campaignId: 'camp1',
    dueDate: new Date('2024-10-30'),
    amount: 15000,
    amountCents: 1500000,
    status: BillingStatus.ENVIADA,
    paymentMethod: PaymentMethod.BOLETO,
    generateNf: true,
    createdAt: new Date('2024-10-10'),
    updatedAt: new Date('2024-10-15'),
  },
  {
    id: 'bi6',
    companyId: 'c1',
    clientId: 'cl2',
    proposalId: 'pr2',
    campaignId: 'camp4',
    dueDate: new Date('2024-11-10'),
    amount: 8500,
    amountCents: 850000,
    status: BillingStatus.ENVIADA,
    paymentMethod: PaymentMethod.PIX,
    generateNf: true,
    createdAt: new Date('2024-10-25'),
    updatedAt: new Date('2024-10-28'),
  },
  
  // Fatura vencida (aguardando pagamento)
  {
    id: 'bi7',
    companyId: 'c1',
    clientId: 'cl3',
    proposalId: 'pr6',
    campaignId: 'camp6',
    dueDate: new Date('2024-10-20'),
    amount: 4300,
    amountCents: 430000,
    status: BillingStatus.VENCIDA,
    paymentMethod: PaymentMethod.BOLETO,
    generateNf: true,
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-21'),
  },
];

// Helper functions para Proposals
export const getItemsForProposal = (proposalId: string): ProposalItem[] => {
  return mockProposalItems.filter(item => item.proposalId === proposalId);
};

export const getCampaignForProposal = (proposalId: string): Campaign | undefined => {
  return mockCampaigns.find(campaign => campaign.proposalId === proposalId);
};

export const getBillingStatusForProposal = (proposalId: string): BillingStatus | undefined => {
  const invoice = mockBillingInvoices.find(invoice => invoice.proposalId === proposalId);
  return invoice?.status;
};

export const getClientById = (clientId: string): Client | undefined => {
  return mockClients.find(client => client.id === clientId);
};

export const getMediaUnitById = (mediaUnitId: string): MediaUnit | undefined => {
  return mockMediaUnits.find(unit => unit.id === mediaUnitId);
};

export const getProductById = (productId: string): Product | undefined => {
  return mockProducts.find(product => product.id === productId);
};

// Helper functions específicos para Campaigns
export const getProposalById = (proposalId: string): Proposal | undefined => {
  return mockProposals.find(proposal => proposal.id === proposalId);
};

export const getCampaignItemsForCampaign = (campaignId: string): any[] => {
  // TODO: quando mockCampaignItems for criado, retornar aqui
  // Por ora, vamos simular alguns items
  return [];
};

export const getReservationsForCampaign = (campaignId: string): any[] => {
  // TODO: implementar quando mockReservations for criado
  return [];
};

export const getBillingInvoicesForCampaign = (campaignId: string): BillingInvoice[] => {
  return mockBillingInvoices.filter(invoice => invoice.campaignId === campaignId);
};

export const getMediaPointByMediaUnit = (mediaUnitId: string): MediaPoint | undefined => {
  const unit = getMediaUnitById(mediaUnitId);
  if (!unit) return undefined;
  return mockMediaPoints.find(point => point.id === unit.mediaPointId);
};

// Mock data para Reservations
export const mockReservations: (Reservation & { estimatedAmount?: number })[] = [
  // Março 2024 - várias reservas
  {
    id: 'res1',
    companyId: 'c1',
    mediaUnitId: 'mu1', // OOH - Outdoor Paulista Face 1
    campaignId: 'camp1',
    proposalId: 'pr1',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 8500,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 'res2',
    companyId: 'c1',
    mediaUnitId: 'mu2', // OOH - Outdoor Paulista Face 2
    proposalId: 'pr1',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 7500,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 'res3',
    companyId: 'c1',
    mediaUnitId: 'mu5', // OOH - Empena Marginal
    campaignId: 'camp2',
    proposalId: 'pr5',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-06-30'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 15000,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'res4',
    companyId: 'c1',
    mediaUnitId: 'mu1',
    proposalId: 'pr2',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-30'),
    status: 'RESERVADA' as const,
    estimatedAmount: 8500,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'res5',
    companyId: 'c1',
    mediaUnitId: 'mu2',
    proposalId: 'pr3',
    startDate: new Date('2024-04-15'),
    endDate: new Date('2024-05-15'),
    status: 'RESERVADA' as const,
    estimatedAmount: 7500,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  },
  // Reservas no meio do mês de março
  {
    id: 'res6',
    companyId: 'c1',
    mediaUnitId: 'mu1',
    proposalId: 'pr4',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-31'),
    status: 'RESERVADA' as const,
    estimatedAmount: 4250,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 'res7',
    companyId: 'c1',
    mediaUnitId: 'mu2',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-04-10'),
    status: 'CANCELADA' as const,
    estimatedAmount: 5000,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-18'),
  },
  // Mais reservas espalhadas
  {
    id: 'res8',
    companyId: 'c1',
    mediaUnitId: 'mu5',
    proposalId: 'pr4',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-29'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 15000,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'res9',
    companyId: 'c1',
    mediaUnitId: 'mu1',
    campaignId: 'camp3',
    proposalId: 'pr4',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-31'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 8500,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-15'),
  },
  {
    id: 'res10',
    companyId: 'c1',
    mediaUnitId: 'mu2',
    startDate: new Date('2024-05-15'),
    endDate: new Date('2024-06-15'),
    status: 'RESERVADA' as const,
    estimatedAmount: 7500,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-01'),
  },
  // Algumas no dia 15 de março para testar
  {
    id: 'res11',
    companyId: 'c1',
    mediaUnitId: 'mu1',
    proposalId: 'pr2',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-15'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 450,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'res12',
    companyId: 'c1',
    mediaUnitId: 'mu5',
    proposalId: 'pr3',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-20'),
    status: 'RESERVADA' as const,
    estimatedAmount: 3750,
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date('2024-03-12'),
  },
  // Mais algumas para volume
  {
    id: 'res13',
    companyId: 'c1',
    mediaUnitId: 'mu2',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-30'),
    status: 'RESERVADA' as const,
    estimatedAmount: 7500,
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2024-05-20'),
  },
  {
    id: 'res14',
    companyId: 'c1',
    mediaUnitId: 'mu5',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-31'),
    status: 'RESERVADA' as const,
    estimatedAmount: 15000,
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'res15',
    companyId: 'c1',
    mediaUnitId: 'mu1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    status: 'CONFIRMADA' as const,
    estimatedAmount: 8500,
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2023-12-20'),
  },
];

// Helper functions para Reservations
export const getReservationsForMonth = (companyId: string, month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startOfMonth = new Date(year, monthIndex, 1);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return mockReservations.filter(res => {
    if (res.companyId !== companyId) return false;
    
    // Verifica se há interseção de datas com o mês
    const resStart = new Date(res.startDate);
    const resEnd = new Date(res.endDate);
    
    return resStart <= endOfMonth && resEnd >= startOfMonth;
  });
};

export const getReservationsForDay = (
  companyId: string,
  date: Date,
  statusFilter?: 'RESERVADA' | 'CONFIRMADA' | 'CANCELADA' | 'ALL'
) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return mockReservations.filter(res => {
    if (res.companyId !== companyId) return false;
    
    // Filtrar por status
    if (statusFilter && statusFilter !== 'ALL' && res.status !== statusFilter) {
      return false;
    }

    // Verifica se a reserva intersecta o dia
    const resStart = new Date(res.startDate);
    const resEnd = new Date(res.endDate);
    
    return resStart <= dayEnd && resEnd >= dayStart;
  });
};

export const getReservationSummaryForMonth = (companyId: string, month: Date) => {
  const reservations = getReservationsForMonth(companyId, month);
  
  const activeCount = reservations.filter(
    res => res.status === 'RESERVADA' || res.status === 'CONFIRMADA'
  ).length;
  
  const confirmedCount = reservations.filter(
    res => res.status === 'CONFIRMADA'
  ).length;
  
  const totalAmount = reservations
    .filter(res => res.status !== 'CANCELADA')
    .reduce((sum, res) => sum + (res.estimatedAmount || 0), 0);

  return {
    activeCount,
    confirmedCount,
    totalAmount,
  };
};

export const getDaysWithReservations = (companyId: string, month: Date): Set<number> => {
  const reservations = getReservationsForMonth(companyId, month);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysSet = new Set<number>();

  reservations.forEach(res => {
    const resStart = new Date(res.startDate);
    const resEnd = new Date(res.endDate);
    
    // Iterar sobre todos os dias entre start e end que estão no mês
    let current = new Date(Math.max(resStart.getTime(), new Date(year, monthIndex, 1).getTime()));
    const endLimit = new Date(Math.min(resEnd.getTime(), new Date(year, monthIndex + 1, 0).getTime()));
    
    while (current <= endLimit) {
      if (current.getMonth() === monthIndex && current.getFullYear() === year) {
        daysSet.add(current.getDate());
      }
      current.setDate(current.getDate() + 1);
    }
  });

  return daysSet;
};

export const getAmountForReservation = (reservation: Reservation & { estimatedAmount?: number }): number => {
  // TODO: No backend, buscar do ProposalItem ou calcular baseado em período + priceMonth da MediaUnit
  return reservation.estimatedAmount || 0;
};

// Mock data para CashTransactions
export const mockCashTransactions: CashTransaction[] = [
  {
    id: 'ct1',
    companyId: 'c1',
    clientId: 'cl1',
    campaignId: 'camp1',
    proposalId: 'pr1',
    mediaUnitId: 'mu1',
    productId: undefined,
    description: 'Pagamento de Face 1 - Outdoor Av. Paulista - 3 meses',
    transactionDate: new Date('2024-02-10'),
    amount: 25500,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'ct2',
    companyId: 'c1',
    clientId: 'cl4',
    campaignId: 'camp3',
    proposalId: 'pr4',
    mediaUnitId: 'mu3',
    productId: undefined,
    description: 'Pagamento de Painel Digital Shopping - 3 meses',
    transactionDate: new Date('2024-03-12'),
    amount: 36000,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date('2024-03-12'),
  },
  {
    id: 'ct3',
    companyId: 'c1',
    clientId: 'cl1',
    campaignId: 'camp2',
    proposalId: 'pr5',
    mediaUnitId: 'mu5',
    productId: undefined,
    description: 'Pagamento de Empena Marginal Tietê - 4 meses',
    transactionDate: new Date('2024-03-20'),
    amount: 60000,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: 'ct4',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: 'mu1',
    productId: undefined,
    description: 'Pagamento de Face 1 - Outdoor Av. Paulista - 1 mês',
    transactionDate: new Date('2024-04-10'),
    amount: 8500,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'ct5',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: 'mu2',
    productId: undefined,
    description: 'Pagamento de Face 2 - Outdoor Av. Paulista - 1 mês',
    transactionDate: new Date('2024-04-10'),
    amount: 7500,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'ct6',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: undefined,
    productId: 'prod3',
    description: 'Pagamento de Criação de Arte - Pacote completo',
    transactionDate: new Date('2024-04-10'),
    amount: 800,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'ct7',
    companyId: 'c1',
    clientId: 'cl1',
    campaignId: 'camp1',
    proposalId: 'pr1',
    mediaUnitId: 'mu1',
    productId: 'prod1',
    description: 'Pagamento de Impressão de Lona - 2 unidades',
    transactionDate: new Date('2024-02-10'),
    amount: 90,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'ct8',
    companyId: 'c1',
    clientId: 'cl4',
    campaignId: 'camp3',
    proposalId: 'pr4',
    mediaUnitId: 'mu3',
    productId: 'prod6',
    description: 'Pagamento de Produção de Vídeo - 2 vídeos',
    transactionDate: new Date('2024-03-12'),
    amount: 3000,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date('2024-03-12'),
  },
  {
    id: 'ct9',
    companyId: 'c1',
    clientId: 'cl1',
    campaignId: 'camp2',
    proposalId: 'pr5',
    mediaUnitId: 'mu5',
    productId: 'prod7',
    description: 'Pagamento de Estrutura Metálica - 1 unidade',
    transactionDate: new Date('2024-03-20'),
    amount: 2500,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: 'ct10',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: 'mu1',
    productId: 'prod2',
    description: 'Pagamento de Instalação OOH - 1 unidade',
    transactionDate: new Date('2024-04-10'),
    amount: 350,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'ct11',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: 'mu2',
    productId: 'prod4',
    description: 'Pagamento de Manutenção Preventiva - 1 unidade',
    transactionDate: new Date('2024-04-10'),
    amount: 250,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.BOLETO,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'ct12',
    companyId: 'c1',
    clientId: 'cl2',
    campaignId: undefined,
    proposalId: 'pr3',
    mediaUnitId: undefined,
    productId: 'prod8',
    description: 'Pagamento de Monitoramento Digital - 1 unidade',
    transactionDate: new Date('2024-04-10'),
    amount: 500,
    cashFlowType: CashFlowType.ENTRADA,
    paymentType: PaymentType.PIX,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
  },
];

// Helper functions para CashTransactions
export const getTransactionsForCampaign = (campaignId: string): CashTransaction[] => {
  return mockCashTransactions.filter(tx => tx.campaignId === campaignId);
};

export const getTransactionsForProposal = (proposalId: string): CashTransaction[] => {
  return mockCashTransactions.filter(tx => tx.proposalId === proposalId);
};

export const getTransactionsForClient = (clientId: string): CashTransaction[] => {
  return mockCashTransactions.filter(tx => tx.clientId === clientId);
};

export const getTransactionsForMediaUnit = (mediaUnitId: string): CashTransaction[] => {
  return mockCashTransactions.filter(tx => tx.mediaUnitId === mediaUnitId);
};

export const getTransactionsForProduct = (productId: string): CashTransaction[] => {
  return mockCashTransactions.filter(tx => tx.productId === productId);
};

export const getTransactionsForDateRange = (startDate: Date, endDate: Date): CashTransaction[] => {
  return mockCashTransactions.filter(tx => {
    const txDate = new Date(tx.transactionDate);
    return txDate >= startDate && txDate <= endDate;
  });
};

export const getTransactionsSummaryForDateRange = (startDate: Date, endDate: Date) => {
  const transactions = getTransactionsForDateRange(startDate, endDate);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

export const getTransactionsSummaryForCampaign = (campaignId: string) => {
  const transactions = getTransactionsForCampaign(campaignId);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

export const getTransactionsSummaryForProposal = (proposalId: string) => {
  const transactions = getTransactionsForProposal(proposalId);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

export const getTransactionsSummaryForClient = (clientId: string) => {
  const transactions = getTransactionsForClient(clientId);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

export const getTransactionsSummaryForMediaUnit = (mediaUnitId: string) => {
  const transactions = getTransactionsForMediaUnit(mediaUnitId);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

export const getTransactionsSummaryForProduct = (productId: string) => {
  const transactions = getTransactionsForProduct(productId);
  
  const totalIncome = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.ENTRADA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = transactions
    .filter(tx => tx.cashFlowType === CashFlowType.SAIDA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
  };
};

// ========================================
// Helper functions para MediaKit
// ========================================

// Constante para a empresa atual (em produção, viria do contexto/session)
export const CURRENT_COMPANY_ID = 'c1';

/**
 * Retorna apenas os MediaPoints que devem aparecer no Mídia Kit
 * (showInMediaKit === true)
 */
export const getMediaPointsForMediaKit = (companyId: string = CURRENT_COMPANY_ID): MediaPoint[] => {
  return mockMediaPoints.filter(
    point => point.companyId === companyId && point.showInMediaKit === true
  );
};

/**
 * Verifica se um MediaPoint está disponível (sem reservas ativas hoje)
 * ou ocupado (tem pelo menos uma reserva ativa)
 */
export const checkMediaPointAvailability = (mediaPointId: string): 'Disponível' | 'Ocupado' => {
  // Pegar todas as MediaUnits deste ponto
  const units = getMediaUnitsForPoint(mediaPointId);
  const unitIds = units.map(u => u.id);

  // Data de hoje para comparação
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Verificar se existe alguma reserva ativa (CONFIRMADA ou RESERVADA) para qualquer unidade deste ponto
  const hasActiveReservation = mockReservations.some(reservation => {
    // Considerar apenas reservas das unidades deste ponto
    if (!unitIds.includes(reservation.mediaUnitId)) {
      return false;
    }

    // Considerar apenas reservas confirmadas ou reservadas (não canceladas)
    if (reservation.status === 'CANCELADA') {
      return false;
    }

    // Verificar se a data de hoje está entre startDate e endDate
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
  });

  return hasActiveReservation ? 'Ocupado' : 'Disponível';
};