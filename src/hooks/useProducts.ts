import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Product, ProductType } from '../types';
import { emitDataChanged, subscribeDataChanged } from '../lib/appEvents';

export interface UseProductsParams {
  search?: string;
  type?: ProductType | string; // aceita 'adicional' (UI), mas envia corretamente para API
  category?: string;
  isAdditional?: boolean;
}

// Evita que o default parameter `{}` crie um objeto novo a cada render e
// acione effects infinitamente.
const EMPTY_PARAMS: UseProductsParams = {};

// Resposta pode ser um array direto ou um objeto com `data`
type ProductsResponse =
  | Product[]
  | {
      data: Product[];
      total?: number;
    };

type ProductsResponseLoose =
  | ProductsResponse
  | {
      // alguns endpoints podem retornar `items` ao invés de `data`
      items?: Product[];
      total?: number;
    };

function normalizeProduct(p: any): Product {
  return {
    ...p,
    // Prisma Decimal pode vir como string (ou number). Normaliza sempre para number.
    basePrice:
      typeof p?.basePrice === 'string'
        ? parseFloat(p.basePrice)
        : typeof p?.basePrice === 'number'
          ? p.basePrice
          : 0,
  } as Product;
}

export function useProducts(params: UseProductsParams = EMPTY_PARAMS) {
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

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ProductsResponseLoose>('/products', { params: apiParams });
      const responseData = response.data as ProductsResponseLoose;

      const data: Product[] = Array.isArray(responseData)
        ? responseData
        : ((responseData as any)?.data ?? (responseData as any)?.items ?? []);

      setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []);
    } catch (err) {
      setError(err as Error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  const createProduct = useCallback(async (payload: Partial<Product>) => {
    const response = await apiClient.post<Product>('/products', payload);
    const created = normalizeProduct(response.data);
    setProducts((prev: Product[]) => [...prev, created]);
    emitDataChanged('products');
    return created;
  }, []);

  const updateProduct = useCallback(async (id: string, payload: Partial<Product>) => {
    const response = await apiClient.put<Product>(`/products/${id}`, payload);
    const updated = normalizeProduct(response.data);
    setProducts((prev: Product[]) => prev.map((p: Product) => (p.id === id ? updated : p)));
    emitDataChanged('products');
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await apiClient.delete(`/products/${id}`);
    setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== id));
    emitDataChanged('products');
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // Quando outro módulo altera produtos (ex.: cadastro), reflete automaticamente aqui
    return subscribeDataChanged('products', () => {
      void fetchProducts();
    });
  }, [fetchProducts]);

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
