import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { BillingInvoice, BillingStatus, PaymentMethod } from '../../types';
import { formatDateForHtmlInput, parseDateFromHtmlInput } from '../../lib/dateUtils';

interface BillingInvoiceEditDialogProps {
  open: boolean;
  invoice: BillingInvoice | null;
  onClose: () => void;
  onSave: (updated: BillingInvoice) => void;
}

export function BillingInvoiceEditDialog({ open, invoice, onClose, onSave }: BillingInvoiceEditDialogProps) {
  const [formData, setFormData] = useState({
    dueDate: '',
    status: BillingStatus.ABERTA,
    paymentMethod: undefined as PaymentMethod | undefined,
    gatewayInvoiceId: '',
    generateNf: false,
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        dueDate: formatDateForHtmlInput(invoice.dueDate),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        gatewayInvoiceId: invoice.gatewayInvoiceId || '',
        generateNf: invoice.generateNf,
      });
    }
  }, [invoice]);

  const handleSave = () => {
    if (!invoice) return;

    // Validação básica
    if (!formData.dueDate) {
      alert('Data de vencimento é obrigatória');
      return;
    }

    if (!formData.paymentMethod) {
      alert('Método de pagamento é obrigatório');
      return;
    }

    // Criar invoice atualizada
    const updatedInvoice: BillingInvoice = {
      ...invoice,
      dueDate: parseDateFromHtmlInput(formData.dueDate),
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      gatewayInvoiceId: formData.gatewayInvoiceId || undefined,
      generateNf: formData.generateNf,
      paidAt: formData.status === BillingStatus.PAGA ? new Date() : undefined,
      updatedAt: new Date(),
    };

    onSave(updatedInvoice);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cobrança (BillingInvoice)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm mb-1">Cliente</p>
            <p className="text-gray-900">{invoice.client?.companyName || invoice.client?.contactName || 'Cliente não identificado'}</p>
            <p className="text-gray-600 text-sm mt-2 mb-1">Valor</p>
            <p className="text-gray-900">R$ {invoice.amount.toLocaleString('pt-BR')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vencimento (dueDate) *</Label>
              <Input 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value as BillingStatus })}
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
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
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
              onChange={(e) => setFormData({ ...formData, gatewayInvoiceId: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="generateNf" 
              className="rounded" 
              checked={formData.generateNf}
              onChange={(e) => setFormData({ ...formData, generateNf: e.target.checked })}
            />
            <Label htmlFor="generateNf" className="cursor-pointer">
              Gerar NF (generateNf)
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}