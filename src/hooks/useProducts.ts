import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { Product, ProductType } from '../types';
import { emitDataChanged, subscribeDataChanged } from '../lib/appEvents';

export interface UseProductsParams {
  search?: string;
  type?: ProductType | string; // aceita 'adicional' (UI), mas envia corretamente para API
  category?: string;
  isAdditional?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductsStats {
  total: number;
  produtos: number;
  servicos: number;
  adicionais: number;
}

// Evita que o default parameter `{}` crie um objeto novo a cada render e acione effects infinitamente.
const EMPTY_PARAMS: UseProductsParams = {};

type ProductsResponseObject = {
  data?: Product[];
  items?: Product[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  stats?: Partial<ProductsStats>;
};

type ProductsResponseLoose = Product[] | ProductsResponseObject;

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

function calcStatsFromProducts(list: Product[]): ProductsStats {
  return {
    total: list.length,
    produtos: list.filter((p) => p.type === ProductType.PRODUTO).length,
    servicos: list.filter((p) => p.type === ProductType.SERVICO).length,
    adicionais: list.filter((p) => p.isAdditional).length,
  };
}

export function useProducts(params: UseProductsParams = EMPTY_PARAMS) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Metadados para paginação
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<ProductsStats>({ total: 0, produtos: 0, servicos: 0, adicionais: 0 });

  const apiParams = useMemo(() => {
    const p: any = { ...params };

    // Defaults (evita query sem paginação)
    if (p.page == null) p.page = 1;
    if (p.pageSize == null) p.pageSize = 40;

    // UI usa "adicional" como filtro, mas isso não é ProductType no backend
    if (p.type === 'adicional') {
      p.isAdditional = true;
      delete p.type;
    }

    // Se não for um ProductType válido, não envia como `type`
    if (p.type && !Object.values(ProductType).includes(p.type)) {
      delete p.type;
    }

    // Não envia string vazia
    if (typeof p.search === 'string' && p.search.trim() === '') delete p.search;
    if (typeof p.category === 'string' && p.category.trim() === '') delete p.category;

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

      const normalized = Array.isArray(data) ? data.map(normalizeProduct) : [];

      setProducts(normalized);

      const metaTotal = Array.isArray(responseData)
        ? normalized.length
        : typeof (responseData as any)?.total === 'number'
          ? (responseData as any).total
          : normalized.length;

      const metaPage = Array.isArray(responseData)
        ? apiParams.page
        : (responseData as any)?.page ?? apiParams.page;

      const metaPageSize = Array.isArray(responseData)
        ? apiParams.pageSize
        : (responseData as any)?.pageSize ?? apiParams.pageSize;

      const metaTotalPages = Array.isArray(responseData)
        ? Math.max(1, Math.ceil(metaTotal / metaPageSize))
        : (responseData as any)?.totalPages ?? Math.max(1, Math.ceil(metaTotal / metaPageSize));

      setTotal(metaTotal);
      setPage(metaPage);
      setPageSize(metaPageSize);
      setTotalPages(metaTotalPages);

      const s = Array.isArray(responseData)
        ? calcStatsFromProducts(normalized)
        : ((responseData as any)?.stats as Partial<ProductsStats> | undefined);

      if (s) {
        setStats({
          total: typeof s.total === 'number' ? s.total : metaTotal,
          produtos: typeof s.produtos === 'number' ? s.produtos : 0,
          servicos: typeof s.servicos === 'number' ? s.servicos : 0,
          adicionais: typeof s.adicionais === 'number' ? s.adicionais : 0,
        });
      } else {
        setStats(calcStatsFromProducts(normalized));
      }
    } catch (err) {
      setError(err as Error);
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
      setStats({ total: 0, produtos: 0, servicos: 0, adicionais: 0 });
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  const createProduct = useCallback(
    async (payload: Partial<Product>) => {
      const response = await apiClient.post<Product>('/products', payload);
      const created = normalizeProduct(response.data);

      // Mantém lista e paginação consistentes
      emitDataChanged('products');
      await fetchProducts();

      return created;
    },
    [fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, payload: Partial<Product>) => {
      const response = await apiClient.put<Product>(`/products/${id}`, payload);
      const updated = normalizeProduct(response.data);

      emitDataChanged('products');
      await fetchProducts();

      return updated;
    },
    [fetchProducts]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await apiClient.delete(`/products/${id}`);
      emitDataChanged('products');
      await fetchProducts();
    },
    [fetchProducts]
  );

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
    total,
    page,
    pageSize,
    totalPages,
    stats,
  };
}
