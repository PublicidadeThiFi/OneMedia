import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Product, ProductType } from '../types';

export interface UseProductsParams {
  search?: string;
  type?: ProductType | string;
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

export function useProducts(params: UseProductsParams = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<ProductsResponse>('/products', { params });

      const responseData = response.data as ProductsResponse;

      const data: Product[] = Array.isArray(responseData)
        ? responseData
        : responseData.data;

      setProducts(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (payload: Partial<Product>) => {
    const response = await apiClient.post<Product>('/products', payload);
    setProducts((prev: Product[]) => [...prev, response.data]);
    return response.data;
  };

  const updateProduct = async (id: string, payload: Partial<Product>) => {
    const response = await apiClient.put<Product>(`/products/${id}`, payload);
    setProducts((prev: Product[]) =>
      prev.map((p: Product) => (p.id === id ? response.data : p))
    );
    return response.data;
  };

  const deleteProduct = async (id: string) => {
    await apiClient.delete(`/products/${id}`);
    setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== id));
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search, params.type, params.category, params.isAdditional]);

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
