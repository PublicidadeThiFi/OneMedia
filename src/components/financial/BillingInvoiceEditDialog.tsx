import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { BillingInvoice, BillingStatus, PaymentMethod } from '../../types';
import { formatDateForHtmlInput, parseDateFromHtmlInput } from '../../lib/dateUtils';
import { Checkbox } from '../ui/checkbox';

interface BillingInvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: BillingInvoice | null;
  onSave: (data: Partial<BillingInvoice>) => void;
}

export function BillingInvoiceEditDialog({ open, onOpenChange, invoice, onSave }: BillingInvoiceEditDialogProps) {
  const [formData, setFormData] = useState({
    dueDate: '',
    amount: '',
    status: BillingStatus.ABERTA,
    paymentMethod: undefined as PaymentMethod | undefined,
    gatewayInvoiceId: '',
    generateNf: false,
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        dueDate: formatDateForHtmlInput(invoice.dueDate),
        amount: String(invoice.amount ?? (invoice.amountCents ? invoice.amountCents / 100 : '')),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        gatewayInvoiceId: invoice.gatewayInvoiceId || '',
        generateNf: invoice.generateNf,
      });
    } else {
      setFormData({
        dueDate: '',
        amount: '',
        status: BillingStatus.ABERTA,
        paymentMethod: undefined,
        gatewayInvoiceId: '',
        generateNf: false,
      });
    }
  }, [invoice]);

  const handleSave = () => {
    // Validação básica
    if (!formData.dueDate) {
      alert('Data de vencimento é obrigatória');
      return;
    }
    if (formData.amount && parseFloat(formData.amount) <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    // Montar payload parcial apenas com campos editáveis
    const payload: Partial<BillingInvoice> = {
      dueDate: parseDateFromHtmlInput(formData.dueDate),
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      gatewayInvoiceId: formData.gatewayInvoiceId || undefined,
      generateNf: formData.generateNf,
    };

    if (formData.amount) {
      const amountNumber = parseFloat(formData.amount);
      payload.amount = amountNumber;
      payload.amountCents = Math.round(amountNumber * 100);
    }

    if (formData.status === BillingStatus.PAGA) {
      payload.paidAt = new Date();
    }

    onSave(payload);
  };

  if (!invoice) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vencimento (dueDate) *</Label>
              <Input 
                type="date" 
                value={formData.dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: string) => setFormData({ ...formData, status: value as BillingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BillingStatus.ABERTA}>Aberta</SelectItem>
                  <SelectItem value={BillingStatus.PAGA}>Paga</SelectItem>
                  <SelectItem value={BillingStatus.VENCIDA}>Vencida</SelectItem>
                  <SelectItem value={BillingStatus.CANCELADA}>Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento (paymentMethod)</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value: string) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um método" />
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

          <div className="space-y-2">
            <Label>Gateway Invoice ID (opcional)</Label>
            <Input 
              placeholder="ID do gateway de pagamento" 
              value={formData.gatewayInvoiceId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, gatewayInvoiceId: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              checked={formData.generateNf}
              onCheckedChange={(checked: boolean | 'indeterminate') => setFormData({ ...formData, generateNf: Boolean(checked) })}
            />
            <Label className="cursor-pointer">
              Gerar NF (generateNf)
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cobrança (BillingInvoice)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm mb-1">Cliente</p>
            <p className="text-gray-900">{invoice.client?.companyName || invoice.client?.contactName || 'Cliente não identificado'}</p>
            <p className="text-gray-600 text-sm mt-2 mb-1">Valor</p>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0,00" 
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vencimento (dueDate) *</Label>
              <Input 
                type="date" 
                value={formData.dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: string) => setFormData({ ...formData, status: value as BillingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BillingStatus.ABERTA}>Aberta</SelectItem>
                  <SelectItem value={BillingStatus.PAGA}>Paga</SelectItem>
                  <SelectItem value={BillingStatus.VENCIDA}>Vencida</SelectItem>
                  <SelectItem value={BillingStatus.CANCELADA}>Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de Pagamento (paymentMethod) *</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value: string) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                <SelectItem value={PaymentMethod.CARTAO}>Cartão</SelectItem>
                <SelectItem value={PaymentMethod.TRANSFERENCIA}>Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gateway Invoice ID (opcional)</Label>
            <Input 
              placeholder="ID do gateway de pagamento" 
              value={formData.gatewayInvoiceId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, gatewayInvoiceId: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              checked={formData.generateNf}
              onCheckedChange={(checked: boolean | 'indeterminate') => setFormData({ ...formData, generateNf: Boolean(checked) })}
            />
            <Label className="cursor-pointer">
              Gerar NF (generateNf)
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}