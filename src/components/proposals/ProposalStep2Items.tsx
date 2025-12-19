import { useState } from 'react';
import { Button } from '../ui/button';
import { Plus, Image as ImageIcon, Package, Trash2, Edit } from 'lucide-react';
import { ProposalFormData } from './ProposalFormWizard';
import { ProposalItem } from '../../types';
import { MediaSelectionDrawer } from './MediaSelectionDrawer';
import { ProductSelectionDialog } from './ProductSelectionDialog';
import { ProposalItemEditDialog } from './ProposalItemEditDialog';

interface ProposalStep2ItemsProps {
  formData: ProposalFormData;
  onItemsChange: (items: ProposalItem[]) => void;
}

export function ProposalStep2Items({
  formData,
  onItemsChange,
}: ProposalStep2ItemsProps) {
  const [showMediaDrawer, setShowMediaDrawer] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ProposalItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddMediaItem = (newItem: ProposalItem) => {
    onItemsChange([...formData.items, newItem]);
    setShowMediaDrawer(false);
  };

  const handleAddProductItem = (newItem: ProposalItem) => {
    onItemsChange([...formData.items, newItem]);
    setShowProductDialog(false);
  };

  const handleEditItem = (index: number) => {
    setEditingItem(formData.items[index]);
    setEditingIndex(index);
  };

  const handleSaveEditedItem = (updatedItem: ProposalItem) => {
    if (editingIndex !== null) {
      const newItems = [...formData.items];
      newItems[editingIndex] = updatedItem;
      onItemsChange(newItems);
      setEditingItem(null);
      setEditingIndex(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowMediaDrawer(true)}
          className="gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Adicionar Mídia do Inventário
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowProductDialog(true)}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          Adicionar Produto/Serviço
        </Button>
      </div>

      {/* Tabela de itens */}
      {formData.items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <p className="text-gray-600 mb-4">
              Nenhum item adicionado ainda
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Adicione unidades de mídia do seu inventário ou produtos/serviços para
              compor esta proposta
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMediaDrawer(true)}
                className="gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Adicionar Mídia
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProductDialog(true)}
                className="gap-2"
              >
                <Package className="w-4 h-4" />
                Adicionar Produto
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Item</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Período</th>
                  <th className="text-right px-4 py-3 text-sm text-gray-600">Qtd</th>
                  <th className="text-right px-4 py-3 text-sm text-gray-600">
                    Preço Unit.
                  </th>
                  <th className="text-right px-4 py-3 text-sm text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 text-sm text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {item.mediaUnitId ? (
                          <ImageIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-900">{item.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${item.mediaUnitId
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                          }`}
                      >
                        {item.mediaUnitId ? 'Mídia' : 'Produto'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-right">
                      {formatCurrency(item.totalPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo financeiro */}
          <div className="bg-gray-50 px-4 py-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">{formatCurrency(formData.subtotal)}</span>
            </div>
            {(formData.discountPercent || formData.discountAmount) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Desconto
                  {formData.discountPercent ? ` (${formData.discountPercent}%)` : ''}:
                </span>
                <span className="text-red-600">
                  -{' '}
                  {formatCurrency(
                    formData.discountAmount ||
                    (formData.subtotal * (formData.discountPercent || 0)) / 100
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900">Total da Proposta:</span>
              <span className="text-gray-900">{formatCurrency(formData.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs e Drawers */}
      <MediaSelectionDrawer
        open={showMediaDrawer}
        onOpenChange={setShowMediaDrawer}
        defaultPeriod={{
          startDate: formData.campaignStartDate,
          endDate: formData.campaignEndDate,
        }}
        onAddItem={handleAddMediaItem}
      />


      <ProductSelectionDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        defaultPeriod={{
          startDate: formData.campaignStartDate,
          endDate: formData.campaignEndDate,
        }}
        onAddItem={handleAddProductItem}
      />

      <ProposalItemEditDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setEditingIndex(null);
          }
        }}
        item={editingItem}
        onSave={handleSaveEditedItem}
      />
    </div>
  );
}
