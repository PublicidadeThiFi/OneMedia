import { Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Product, ProductType, PriceType } from '../../types';

interface ProductsGridProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export function ProductsGrid({
  products,
  onEditProduct,
  onDeleteProduct,
}: ProductsGridProps) {
  const getTypeColor = (type: ProductType) => {
    return type === ProductType.PRODUTO 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  const getPriceTypeLabel = (priceType: PriceType) => {
    switch (priceType) {
      case PriceType.UNITARIO:
        return 'Unitário';
      case PriceType.A_PARTIR_DE:
        return 'A partir de';
      case PriceType.PACOTE:
        return 'Pacote';
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum produto/serviço encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <Card key={product.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={getTypeColor(product.type)}>
                    {product.type === ProductType.PRODUTO ? 'Produto' : 'Serviço'}
                  </Badge>
                  {product.isAdditional && (
                    <Badge variant="outline" className="text-xs">
                      Adicional
                    </Badge>
                  )}
                </div>
                <h3 className="text-gray-900 mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                )}
                {product.category && (
                  <p className="text-gray-500 text-xs mb-3">{product.category}</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-900">
                  R$ {product.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-gray-500 text-sm">
                  ({getPriceTypeLabel(product.priceType)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onEditProduct(product)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDeleteProduct(product)}
                aria-label="Excluir produto"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
