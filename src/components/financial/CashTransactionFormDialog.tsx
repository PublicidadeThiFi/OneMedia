import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { CashTransaction, CashFlowType, PaymentType, PaymentMethod } from '../../types';
import { mockTransactionCategories } from '../../lib/mockDataFinance';
import { parseDateFromHtmlInput } from '../../lib/dateUtils';
import { getMediaPointsForCompany, CURRENT_COMPANY_ID } from '../../lib/mockDataCentral';

interface CashTransactionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (transaction: CashTransaction) => void;
}

export function CashTransactionFormDialog({ open, onClose, onSave }: CashTransactionFormDialogProps) {
  const mediaPoints = getMediaPointsForCompany(CURRENT_COMPANY_ID);
  
  const [formData, setFormData] = useState({
    flowType: CashFlowType.RECEITA,
    date: '',
    dueDate: '', // NOVO: data de vencimento
    amount: '',
    description: '',
    partnerName: '',
    categoryId: '',
    tags: '',
    paymentType: PaymentType.A_VISTA,
    paymentMethod: undefined as PaymentMethod | undefined,
    isPaid: true,
    billingInvoiceId: '',
    mediaPointId: '', // Ponto de mídia vinculado
  });

  const handleSave = () => {
    // Validação básica
    if (!formData.date) {
      alert('Data é obrigatória');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    if (!formData.description.trim()) {
      alert('Descrição é obrigatória');
      return;
    }

    // Criar nova transação
    const newTransaction: CashTransaction = {
      id: `ct_${Date.now()}`,
      companyId: 'c1',
      date: parseDateFromHtmlInput(formData.date),
      description: formData.description,
      partnerName: formData.partnerName || undefined,
      categoryId: formData.categoryId || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      amount: parseFloat(formData.amount),
      flowType: formData.flowType,
      paymentType: formData.paymentType,
      paymentMethod: formData.paymentMethod,
      isPaid: formData.isPaid,
      billingInvoiceId: formData.billingInvoiceId || undefined,
      mediaPointId: formData.mediaPointId && formData.mediaPointId !== 'none' ? formData.mediaPointId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onSave(newTransaction);

    // Resetar formulário
    setFormData({
      flowType: CashFlowType.RECEITA,
      date: '',
      dueDate: '', // NOVO: data de vencimento
      amount: '',
      description: '',
      partnerName: '',
      categoryId: '',
      tags: '',
      paymentType: PaymentType.A_VISTA,
      paymentMethod: undefined,
      isPaid: true,
      billingInvoiceId: '',
      mediaPointId: '',
    });
  };

  const handleCancel = () => {
    onClose();
    // Resetar formulário ao cancelar
    setFormData({
      flowType: CashFlowType.RECEITA,
      date: '',
      dueDate: '', // NOVO: data de vencimento
      amount: '',
      description: '',
      partnerName: '',
      categoryId: '',
      tags: '',
      paymentType: PaymentType.A_VISTA,
      paymentMethod: undefined,
      isPaid: true,
      billingInvoiceId: '',
      mediaPointId: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Transação (CashTransaction)</DialogTitle>
          <DialogDescription>Insira os detalhes da transação financeira.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Transação (flowType) *</Label>
            <Select 
              value={formData.flowType} 
              onValueChange={(value) => setFormData({ ...formData, flowType: value as CashFlowType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CashFlowType.RECEITA}>Receita</SelectItem>
                <SelectItem value={CashFlowType.DESPESA}>Despesa</SelectItem>
                <SelectItem value={CashFlowType.PESSOAS}>Pessoas (Folha)</SelectItem>
                <SelectItem value={CashFlowType.IMPOSTO}>Imposto</SelectItem>
                <SelectItem value={CashFlowType.TRANSFERENCIA}>Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input 
              placeholder="Ex: Pagamento de campanha" 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Parceiro (partnerName)</Label>
            <Input 
              placeholder="Nome do cliente ou fornecedor" 
              value={formData.partnerName}
              onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria (categoryId)</Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {mockTransactionCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input 
                placeholder="Ex: campanha, março, urgente" 
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pagamento (paymentType)</Label>
              <Select 
                value={formData.paymentType} 
                onValueChange={(value) => setFormData({ ...formData, paymentType: value as PaymentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.A_VISTA}>À vista</SelectItem>
                  <SelectItem value={PaymentType.PARCELADO}>Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modo de Pagamento (paymentMethod)</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                  <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                  <SelectItem value={PaymentMethod.CARTAO}>Cartão</SelectItem>
                  <SelectItem value={PaymentMethod.TRANSFERENCIA}>Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isPaid" 
              className="rounded" 
              checked={formData.isPaid}
              onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
            />
            <Label htmlFor="isPaid" className="cursor-pointer">
              Já foi pago (isPaid)
            </Label>
          </div>

          {/* NOVOS CAMPOS: Ponto de Mídia e Data de Vencimento */}
          <div className="p-3 bg-blue-50 rounded-lg space-y-3">
            <p className="text-sm text-blue-900">
              💡 Para despesas de pontos de mídia (energia, taxa DER, aluguel), vincule o ponto e defina o vencimento:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ponto de Mídia (opcional)</Label>
                <Select 
                  value={formData.mediaPointId} 
                  onValueChange={(value) => setFormData({ ...formData, mediaPointId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ponto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {mediaPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Use para despesas como energia, taxa DER, aluguel de área
                </p>
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento (opcional)</Label>
                <Input 
                  type="date" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Data de vencimento da taxa/despesa
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Transação</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}