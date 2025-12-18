import { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Product, ProductType } from '../types';

export interface UseProductsParams {
  search?: string;
  type?: ProductType | string; // aceita 'adicional' (UI), mas envia corretamente para API
  category?: string;
  isAdditional?: boolean;
}

// Resposta pode ser um array direto ou um objeto com `data`
type ProductsResponse =
  | Product[]
  | {
      data: Product[];
      total?: number;
    };

function normalizeProduct(p: any): Product {
  return {
    ...p,
    // Prisma Decimal costuma serializar como string no JSON
    basePrice: typeof p.basePrice === 'string' ? parseFloat(p.basePrice) : p.basePrice,
  } as Product;
}

export function useProducts(params: UseProductsParams = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const apiParams = useMemo(() => {
    const p: any = { ...params };

    // UI usa "adicional" como filtro, mas isso não é ProductType no backend
    if (p.type === 'adicional') {
      p.isAdditional = true;
      delete p.type;
    }

    // Se não for um ProductType válido, não envia como `type`
    if (p.type && !Object.values(ProductType).includes(p.type)) {
      delete p.type;
    }

    return p;
  }, [params]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ProductsResponse>('/products', { params: apiParams });
      const responseData = response.data as ProductsResponse;

      const data: Product[] = Array.isArray(responseData) ? responseData : responseData.data;
      setProducts(data.map(normalizeProduct));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (payload: Partial<Product>) => {
    const response = await apiClient.post<Product>('/products', payload);
    const created = normalizeProduct(response.data);
    setProducts((prev: Product[]) => [...prev, created]);
    return created;
  };

  const updateProduct = async (id: string, payload: Partial<Product>) => {
    const response = await apiClient.put<Product>(`/products/${id}`, payload);
    const updated = normalizeProduct(response.data);
    setProducts((prev: Product[]) => prev.map((p: Product) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProduct = async (id: string) => {
    await apiClient.delete(`/products/${id}`);
    setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== id));
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiParams.search, apiParams.type, apiParams.category, apiParams.isAdditional]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
