// Mock data e helpers específicos para o módulo Financeiro
import { 
  BillingInvoice, 
  BillingStatus, 
  PaymentMethod,
  CashTransaction,
  CashFlowType,
  PaymentType,
  TransactionCategory,
  Client 
} from '../types';
import {
  mockBillingInvoices as originalBillingInvoices,
  mockClients,
} from './mockData';

// ========================================
// FINANCEIRO: Helper - getClientById
// ========================================

export const getClientById = (clientId: string): Client | undefined => {
  return mockClients.find(client => client.id === clientId);
};

// ========================================
// FINANCEIRO: TransactionCategories
// ========================================

export const mockTransactionCategories: TransactionCategory[] = [
  {
    id: 'cat1',
    companyId: 'c1',
    name: 'Receita de Campanha',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat2',
    companyId: 'c1',
    name: 'Despesa Fixa',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat3',
    companyId: 'c1',
    name: 'Despesa Variável',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat4',
    companyId: 'c1',
    name: 'Folha de Pagamento',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat5',
    companyId: 'c1',
    name: 'Impostos',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat6',
    companyId: 'c1',
    name: 'Transferência entre Contas',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat7',
    companyId: 'c1',
    name: 'Aluguel de Pontos',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'cat8',
    companyId: 'c1',
    name: 'Manutenção',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ========================================
// FINANCEIRO: Expandir BillingInvoices
// ========================================

// Expandir com mais cobranças variadas
export const mockBillingInvoices: BillingInvoice[] = [
  ...originalBillingInvoices, // Mantém os 4 existentes
  {
    id: 'bi5',
    companyId: 'c1',
    clientId: 'cl1',
    proposalId: 'pr2',
    dueDate: new Date(2024, 3, 25), // 25/04/2024
    amount: 36000,
    status: BillingStatus.ABERTA,
    paymentMethod: PaymentMethod.BOLETO,
    generateNf: true,
    createdAt: new Date(2024, 2, 1), // 01/03/2024
    updatedAt: new Date(2024, 2, 1),
  },
  {
    id: 'bi6',
    companyId: 'c1',
    clientId: 'cl4',
    proposalId: 'pr4',
    dueDate: new Date(2024, 1, 10), // 10/02/2024
    amount: 18000,
    status: BillingStatus.VENCIDA,
    paymentMethod: PaymentMethod.PIX,
    generateNf: false,
    createdAt: new Date(2024, 0, 20), // 20/01/2024
    updatedAt: new Date(2024, 1, 15), // 15/02/2024
  },
  {
    id: 'bi7',
    companyId: 'c1',
    clientId: 'cl2',
    proposalId: 'pr3',
    dueDate: new Date(2024, 0, 30), // 30/01/2024
    amount: 8500,
    status: BillingStatus.CANCELADA,
    generateNf: false,
    createdAt: new Date(2024, 0, 15), // 15/01/2024
    updatedAt: new Date(2024, 0, 25), // 25/01/2024
  },
  {
    id: 'bi8',
    companyId: 'c1',
    clientId: 'cl3',
    dueDate: new Date(2024, 4, 10), // 10/05/2024
    amount: 15000,
    status: BillingStatus.ABERTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    generateNf: true,
    createdAt: new Date(2024, 3, 1), // 01/04/2024
    updatedAt: new Date(2024, 3, 1),
  },
];

// ========================================
// FINANCEIRO: CashTransactions
// ========================================

export const mockCashTransactions: CashTransaction[] = [
  // RECEITAS (vinculadas a BillingInvoices pagas)
  {
    id: 'ct1',
    companyId: 'c1',
    date: new Date(2024, 1, 10), // 10/02/2024
    description: 'Recebimento campanha Tech Solutions - Outdoor Paulista Q1',
    partnerName: 'Tech Solutions Ltda',
    categoryId: 'cat1',
    tags: ['campanha', 'outdoor', 'q1'],
    amount: 25500,
    flowType: CashFlowType.RECEITA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.PIX,
    isPaid: true,
    billingInvoiceId: 'bi1',
    createdAt: new Date(2024, 1, 10),
    updatedAt: new Date(2024, 1, 10),
  },
  {
    id: 'ct2',
    companyId: 'c1',
    date: new Date(2024, 2, 12), // 12/03/2024
    description: 'Recebimento Fashion Brands - Campanha Verão',
    partnerName: 'Fashion Brands Brasil',
    categoryId: 'cat1',
    tags: ['campanha', 'digital', 'fashion'],
    amount: 40500,
    flowType: CashFlowType.RECEITA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    billingInvoiceId: 'bi2',
    createdAt: new Date(2024, 2, 12),
    updatedAt: new Date(2024, 2, 12),
  },
  // DESPESAS - Aluguel de pontos
  {
    id: 'ct3',
    companyId: 'c1',
    date: new Date(2024, 1, 10), // 10/02/2024
    description: 'Aluguel Ponto Av. Paulista 1000',
    partnerName: 'Imóveis Paulista Ltda',
    categoryId: 'cat7',
    tags: ['aluguel', 'fixo', 'paulista'],
    amount: 3500,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    mediaPointId: 'mp1',
    createdAt: new Date(2024, 1, 10),
    updatedAt: new Date(2024, 1, 10),
  },
  {
    id: 'ct4',
    companyId: 'c1',
    date: new Date(2024, 2, 10), // 10/03/2024
    description: 'Aluguel Ponto Av. Paulista 1000',
    partnerName: 'Imóveis Paulista Ltda',
    categoryId: 'cat7',
    tags: ['aluguel', 'fixo', 'paulista'],
    amount: 3500,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    mediaPointId: 'mp1',
    createdAt: new Date(2024, 2, 10),
    updatedAt: new Date(2024, 2, 10),
  },
  {
    id: 'ct5',
    companyId: 'c1',
    date: new Date(2024, 1, 5), // 05/02/2024
    description: 'Aluguel Shopping Iguatemi',
    partnerName: 'Shopping Iguatemi',
    categoryId: 'cat7',
    tags: ['aluguel', 'fixo', 'shopping'],
    amount: 5000,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: true,
    mediaPointId: 'mp2',
    createdAt: new Date(2024, 1, 5),
    updatedAt: new Date(2024, 1, 5),
  },
  {
    id: 'ct6',
    companyId: 'c1',
    date: new Date(2024, 2, 5), // 05/03/2024
    description: 'Aluguel Shopping Iguatemi',
    partnerName: 'Shopping Iguatemi',
    categoryId: 'cat7',
    tags: ['aluguel', 'fixo', 'shopping'],
    amount: 5000,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: true,
    mediaPointId: 'mp2',
    createdAt: new Date(2024, 2, 5),
    updatedAt: new Date(2024, 2, 5),
  },
  {
    id: 'ct7',
    companyId: 'c1',
    date: new Date(2024, 1, 15), // 15/02/2024
    description: 'Taxa DER - Empena Marginal',
    partnerName: 'DER - Departamento de Estradas',
    categoryId: 'cat7',
    tags: ['der', 'fixo', 'concessão'],
    amount: 2500,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    mediaPointId: 'mp3',
    createdAt: new Date(2024, 1, 15),
    updatedAt: new Date(2024, 1, 15),
  },
  // PESSOAS - Folha de pagamento
  {
    id: 'ct8',
    companyId: 'c1',
    date: new Date(2024, 1, 25), // 25/02/2024
    description: 'Folha de Pagamento - Fevereiro 2024',
    partnerName: 'Equipe Operacional',
    categoryId: 'cat4',
    tags: ['folha', 'salários', 'fevereiro'],
    amount: 18000,
    flowType: CashFlowType.PESSOAS,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: true,
    createdAt: new Date(2024, 1, 25),
    updatedAt: new Date(2024, 1, 25),
  },
  {
    id: 'ct9',
    companyId: 'c1',
    date: new Date(2024, 2, 25), // 25/03/2024
    description: 'Folha de Pagamento - Março 2024',
    partnerName: 'Equipe Operacional',
    categoryId: 'cat4',
    tags: ['folha', 'salários', 'março'],
    amount: 18000,
    flowType: CashFlowType.PESSOAS,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: true,
    createdAt: new Date(2024, 2, 25),
    updatedAt: new Date(2024, 2, 25),
  },
  // IMPOSTOS
  {
    id: 'ct10',
    companyId: 'c1',
    date: new Date(2024, 1, 20), // 20/02/2024
    description: 'INSS - Fevereiro 2024',
    partnerName: 'Receita Federal',
    categoryId: 'cat5',
    tags: ['inss', 'imposto', 'fevereiro'],
    amount: 3200,
    flowType: CashFlowType.IMPOSTO,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    createdAt: new Date(2024, 1, 20),
    updatedAt: new Date(2024, 1, 20),
  },
  {
    id: 'ct11',
    companyId: 'c1',
    date: new Date(2024, 2, 20), // 20/03/2024
    description: 'INSS - Março 2024',
    partnerName: 'Receita Federal',
    categoryId: 'cat5',
    tags: ['inss', 'imposto', 'março'],
    amount: 3200,
    flowType: CashFlowType.IMPOSTO,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: true,
    createdAt: new Date(2024, 2, 20),
    updatedAt: new Date(2024, 2, 20),
  },
  // DESPESAS VARIÁVEIS - Manutenção
  {
    id: 'ct12',
    companyId: 'c1',
    date: new Date(2024, 1, 18), // 18/02/2024
    description: 'Manutenção preventiva - Outdoor Paulista',
    partnerName: 'Manutenção Express',
    categoryId: 'cat8',
    tags: ['manutenção', 'outdoor'],
    amount: 850,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.PIX,
    isPaid: true,
    mediaPointId: 'mp1',
    createdAt: new Date(2024, 1, 18),
    updatedAt: new Date(2024, 1, 18),
  },
  {
    id: 'ct13',
    companyId: 'c1',
    date: new Date(2024, 2, 15), // 15/03/2024
    description: 'Manutenção corretiva - Painel LED Shopping',
    partnerName: 'TecLED Serviços',
    categoryId: 'cat8',
    tags: ['manutenção', 'led', 'corretiva'],
    amount: 1200,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.PIX,
    isPaid: true,
    mediaPointId: 'mp2',
    createdAt: new Date(2024, 2, 15),
    updatedAt: new Date(2024, 2, 15),
  },
  // TRANSFERÊNCIA
  {
    id: 'ct14',
    companyId: 'c1',
    date: new Date(2024, 2, 8), // 08/03/2024
    description: 'Transferência entre contas - Reserva',
    partnerName: undefined,
    categoryId: 'cat6',
    tags: ['transferência', 'interna'],
    amount: 10000,
    flowType: CashFlowType.TRANSFERENCIA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: true,
    createdAt: new Date(2024, 2, 8),
    updatedAt: new Date(2024, 2, 8),
  },
  // Transações futuras (isPaid = false)
  {
    id: 'ct15',
    companyId: 'c1',
    date: new Date(2024, 3, 10), // 10/04/2024
    description: 'Aluguel Ponto Av. Paulista 1000',
    partnerName: 'Imóveis Paulista Ltda',
    categoryId: 'cat7',
    tags: ['aluguel', 'fixo', 'paulista'],
    amount: 3500,
    flowType: CashFlowType.DESPESA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.BOLETO,
    isPaid: false,
    mediaPointId: 'mp1',
    createdAt: new Date(2024, 3, 1),
    updatedAt: new Date(2024, 3, 1),
  },
  {
    id: 'ct16',
    companyId: 'c1',
    date: new Date(2024, 3, 25), // 25/04/2024
    description: 'Folha de Pagamento - Abril 2024',
    partnerName: 'Equipe Operacional',
    categoryId: 'cat4',
    tags: ['folha', 'salários', 'abril'],
    amount: 18000,
    flowType: CashFlowType.PESSOAS,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: PaymentMethod.TRANSFERENCIA,
    isPaid: false,
    createdAt: new Date(2024, 3, 1),
    updatedAt: new Date(2024, 3, 1),
  },
];

// ========================================
// FINANCEIRO: Helper Functions
// ========================================

// Helpers para BillingInvoices
export const getBillingInvoicesForCompany = (companyId: string): BillingInvoice[] => {
  return mockBillingInvoices.filter(invoice => invoice.companyId === companyId);
};

export const getBillingSummaryForCompany = (companyId: string) => {
  const invoices = getBillingInvoicesForCompany(companyId);
  
  // Pendente = ABERTA + VENCIDA
  const pendingAmount = invoices
    .filter(inv => inv.status === BillingStatus.ABERTA || inv.status === BillingStatus.VENCIDA)
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  // Apenas ABERTA
  const openAmount = invoices
    .filter(inv => inv.status === BillingStatus.ABERTA)
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  // Receita confirmada = PAGA
  const confirmedAmount = invoices
    .filter(inv => inv.status === BillingStatus.PAGA)
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  // Alertas = VENCIDA
  const alertsCount = invoices.filter(inv => inv.status === BillingStatus.VENCIDA).length;

  return {
    pendingAmount,
    openAmount,
    confirmedAmount,
    alertsCount,
  };
};

// Helpers para CashTransactions
export const getCashTransactionsForMonth = (
  companyId: string,
  year: number,
  month: number, // 0-11 (Janeiro = 0)
  flowTypeFilter?: CashFlowType[]
): CashTransaction[] => {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return mockCashTransactions.filter(tx => {
    if (tx.companyId !== companyId) return false;
    
    const txDate = new Date(tx.date);
    if (txDate < startOfMonth || txDate > endOfMonth) return false;
    
    if (flowTypeFilter && flowTypeFilter.length > 0) {
      return flowTypeFilter.includes(tx.flowType);
    }
    
    return true;
  });
};

export const getCashFlowSummaryForMonth = (
  companyId: string,
  year: number,
  month: number
) => {
  const transactions = getCashTransactionsForMonth(companyId, year, month);
  
  const receiptsTotal = transactions
    .filter(tx => tx.flowType === CashFlowType.RECEITA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const expensesTotal = transactions
    .filter(tx => 
      tx.flowType === CashFlowType.DESPESA ||
      tx.flowType === CashFlowType.PESSOAS ||
      tx.flowType === CashFlowType.IMPOSTO
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const transfersTotal = transactions
    .filter(tx => tx.flowType === CashFlowType.TRANSFERENCIA)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const cashBalance = receiptsTotal - expensesTotal;

  return {
    receiptsTotal,
    expensesTotal,
    transfersTotal,
    cashBalance,
  };
};

export const getCategoryById = (categoryId: string): TransactionCategory | undefined => {
  return mockTransactionCategories.find(cat => cat.id === categoryId);
};

// Helper para integração Cobranças → Fluxo de Caixa
export const createCashTransactionFromInvoice = (
  invoice: BillingInvoice
): CashTransaction => {
  const client = getClientById(invoice.clientId);
  const clientName = client?.companyName || client?.contactName || 'Cliente';
  
  return {
    id: `ct-from-bi-${invoice.id}`,
    companyId: invoice.companyId,
    date: invoice.paidAt || invoice.dueDate,
    description: `Recebimento de cobrança - ${clientName}`,
    partnerName: clientName,
    categoryId: 'cat1', // Receita de Campanha
    tags: ['recebimento', 'campanha'],
    amount: invoice.amount,
    flowType: CashFlowType.RECEITA,
    paymentType: PaymentType.A_VISTA,
    paymentMethod: invoice.paymentMethod,
    isPaid: true,
    billingInvoiceId: invoice.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};