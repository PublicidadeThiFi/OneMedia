import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ProposalItem } from '../../types';

interface ProposalItemsEditorProps {
  items: Partial<ProposalItem>[];
  onChange: (items: Partial<ProposalItem>[]) => void;
}

export function ProposalItemsEditor({
  items,
  onChange,
}: ProposalItemsEditorProps) {
  const handleAddItem = () => {
    onChange([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">Itens da Proposta</h3>
        <Button size="sm" onClick={handleAddItem}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhum item adicionado</p>
          <Button variant="link" onClick={handleAddItem} className="mt-2">
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-gray-900">Item {index + 1}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  aria-label="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {/* TODO: Implementar editor de campos do item */}
                {item.description || 'Descrição não informada'}
              </p>
              <p className="text-sm text-gray-900 mt-2">
                Total: R$ {(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex justify-between text-gray-900">
            <span>Subtotal:</span>
            <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
