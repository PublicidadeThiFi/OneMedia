import { useEffect, useMemo, useState } from 'react';
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

const PAGE_SIZE = 40;

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    return {
      search: searchQuery,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      page,
      pageSize: PAGE_SIZE,
    };
  }, [searchQuery, typeFilter, page]);

  const {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    total,
    totalPages,
    stats,
  } = useProducts(params);

  // Dialogs
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Sempre que busca/filtro mudar, volta para a primeira página
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter]);

  // Se o filtro reduzir totalPages, mantém a página em um valor válido
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

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
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setTypeFilter('all')}
        >
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

      {/* Contador de resultados (considera filtros server-side) */}
      {(searchQuery || typeFilter !== 'all') && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {total} {total === 1 ? 'produto/serviço encontrado' : 'produtos/serviços encontrados'}
          </p>
        </div>
      )}

      {/* Grade de Produtos */}
      <ProductsGrid products={products} onEditProduct={handleEditProduct} onDeleteProduct={handleDeleteProduct} />

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mt-6">
          <p className="text-sm text-gray-600">
            Mostrando {startIdx}-{endIdx} de {total} • Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ProductFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsFormDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open: boolean) => {
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
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
