import type { ProposalItem } from '../../types';

export interface ProposalFormData {
  // Passo 1
  clientId: string;
  responsibleUserId: string;
  title?: string;
  campaignStartDate?: Date;
  validUntil?: Date;
  conditionsText?: string;
  discountPercent?: number;
  discountAmount?: number;

  // Passo 2 (novo fluxo)
  assemblyMaxDays?: number;

  // Passo 2
  items: ProposalItem[];

  // Calculados
  subtotal: number;
  totalAmount: number;
}
