import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Product, ProductType } from '../types';
import { useProducts } from '../hooks/useProducts';
import { ProductFiltersBar } from './products/ProductFiltersBar';
import { ProductsGrid } from './products/ProductsGrid';
import { ProductFormDialog } from './products/ProductFormDialog';
import { toast } from 'sonner';

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { products, loading, error, createProduct, updateProduct, deleteProduct } = useProducts();
// Dialogs
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Estatísticas baseadas em Product
  const stats = useMemo(() => {
    return {
      total: products.length,
      produtos: products.filter(p => p.type === ProductType.PRODUTO).length,
      servicos: products.filter(p => p.type === ProductType.SERVICO).length,
      adicionais: products.filter(p => p.isAdditional).length,
    };
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Busca textual
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      // Filtro de tipo
      let matchesType = true;
      if (typeFilter === ProductType.PRODUTO) {
        matchesType = product.type === ProductType.PRODUTO;
      } else if (typeFilter === ProductType.SERVICO) {
        matchesType = product.type === ProductType.SERVICO;
      } else if (typeFilter === 'adicional') {
        matchesType = product.isAdditional === true;
      }
      
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, typeFilter]);

  // Handlers
  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (editingProduct?.id) {
        await updateProduct(editingProduct.id, productData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await createProduct(productData);
        toast.success('Produto cadastrado com sucesso!');
      }
      setIsFormDialogOpen(false);
      setEditingProduct(null);
    } catch (e) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setIsFormDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      toast.success('Produto excluído com sucesso!');
    } catch {
      toast.error('Erro ao excluir produto');
    } finally {
      setDeletingProduct(null);
    }
  };

  return (
    <div className="p-8">
      {loading && <div>Carregando produtos...</div>}
      {!loading && error && <div>Erro ao carregar produtos.</div>}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">Produtos e Serviços</h1>
          <p className="text-gray-600">Gerencie produtos e serviços adicionais (Product)</p>
        </div>
        
        <Button className="gap-2" onClick={handleNewProduct}>
          <Plus className="w-4 h-4" />
          Novo Produto/Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Total</p>
            <p className="text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter(ProductType.PRODUTO)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Produtos</p>
            <p className="text-gray-900">{stats.produtos}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter(ProductType.SERVICO)}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Serviços</p>
            <p className="text-gray-900">{stats.servicos}</p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter('adicional')}
        >
          <CardContent className="pt-6">
            <p className="text-gray-600 text-sm mb-1">Adicionais</p>
            <p className="text-gray-900">{stats.adicionais}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <ProductFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            typeFilter={typeFilter}
            onTypeChange={(value: string) => setTypeFilter(value)}
          />
        </CardContent>
      </Card>

      {/* Contador de resultados */}
      {(searchQuery || typeFilter !== 'all') && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produto/serviço encontrado' : 'produtos/serviços encontrados'}
          </p>
        </div>
      )}

      {/* Grade de Produtos */}
      <ProductsGrid
        products={filteredProducts}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Dialogs */}
            <ProductFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open: boolean) => {   // 🔧 tipamos o parâmetro
          setIsFormDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open: boolean) => {   // 🔧 idem aqui
          if (!open) setDeletingProduct(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto/serviço <strong>{deletingProduct?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
