import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  applyDurationToAll,
  clearCart,
  formatAddress,
  readCart,
  removeFromCart,
  updateItemDuration,
} from '../lib/menuCart';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatCurrencyBRL(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const DURATION_OPTIONS = [7, 15, 30, 60, 90];

export default function MenuCarrinho() {
  const navigate = useNavigation();

  const { token, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
      uf: String(sp.get('uf') || '').trim().toUpperCase(),
      city: String(sp.get('city') || '').trim(),
    };
  }, []);

  const { data } = usePublicMediaKit({ token });

  const [cartVersion, setCartVersion] = useState(0);
  const cart = useMemo(() => readCart(), [cartVersion]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'menu_cart') {
        setCartVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const backUrl = useMemo(() => {
    return `/menu/pontos${buildQuery({ token, uf, city })}`;
  }, [token, uf, city]);

  const [bulkDuration, setBulkDuration] = useState<string>('30');

  const onApplyAll = () => {
    const d = Math.max(1, Math.floor(Number(bulkDuration) || 30));
    applyDurationToAll(d);
    setCartVersion((v) => v + 1);
    toast.success('Duração aplicada para todos os itens', { description: `${d} dia(s)` });
  };

  const onRemove = (itemId: string) => {
    removeFromCart(itemId);
    setCartVersion((v) => v + 1);
    toast.success('Item removido do carrinho');
  };

  const onClear = () => {
    clearCart();
    setCartVersion((v) => v + 1);
    toast.success('Carrinho limpo');
  };

  const itemsEnriched = useMemo(() => {
    const points = data?.points ?? [];
    return cart.items.map((item) => {
      const p = points.find((pt) => pt.id === item.pointId) ?? null;
      const unit = p?.units?.find((u) => u.id === item.unitId) ?? null;

      const pointName = item.snapshot?.pointName || p?.name || 'Ponto';
      const unitLabel = item.snapshot?.unitLabel || unit?.label || '';
      const address = p ? formatAddress(p) : item.snapshot?.addressLine || '';
      const img = item.snapshot?.imageUrl || unit?.imageUrl || p?.mainImageUrl || '';
      const priceMonth = item.snapshot?.priceMonth ?? unit?.priceMonth ?? p?.basePriceMonth ?? null;
      const priceWeek = item.snapshot?.priceWeek ?? unit?.priceWeek ?? p?.basePriceWeek ?? null;

      return {
        item,
        pointName,
        unitLabel,
        address,
        img,
        priceMonth,
        priceWeek,
      };
    });
  }, [cart.items, data?.points]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Carrinho</div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Sua seleção</h1>
            <p className="mt-1 text-sm text-gray-600">
              Itens salvos neste navegador. Na próxima etapa, este carrinho vira uma solicitação de proposta.
            </p>
          </div>

          {cart.items.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={onClear}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          )}
        </div>

        {cart.items.length === 0 ? (
          <Card className="mt-5">
            <CardContent className="py-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Seu carrinho está vazio</div>
                  <div className="mt-1 text-sm text-gray-600">Volte para a lista de pontos e adicione itens.</div>
                </div>
              </div>
              <div className="mt-5">
                <Button onClick={() => navigate(backUrl)}>
                  Ver pontos
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mt-5">
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">{cart.items.length}</span> item(ns)
                  </div>

                  <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
                    <Select value={bulkDuration} onValueChange={(v: string) => setBulkDuration(v)}>
                      <SelectTrigger className="sm:w-[200px]">
                        <SelectValue placeholder="Duração (dias)" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} dia(s)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={onApplyAll}>
                      Aplicar para todos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {itemsEnriched.map(({ item, pointName, unitLabel, address, img, priceMonth, priceWeek }) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      <div className="w-28 sm:w-32">
                        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
                          <ImageWithFallback src={img} alt={pointName} className="h-full w-full object-cover" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-gray-900 truncate">{pointName}</div>
                            {unitLabel && (
                              <div className="mt-1 text-xs text-gray-700">{unitLabel}</div>
                            )}
                            {address && (
                              <div className="mt-1 text-xs text-gray-600 line-clamp-2">{address}</div>
                            )}
                          </div>

                          <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
                          <div>
                            <span className="text-gray-500">Mensal:</span>{' '}
                            <span className="font-semibold">{formatCurrencyBRL(priceMonth)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Semanal:</span>{' '}
                            <span className="font-semibold">{formatCurrencyBRL(priceWeek)}</span>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-xs text-gray-600">Duração</div>
                          <Select
                            value={String(item.durationDays)}
                            onValueChange={(v: string) => {
                              const d = Math.max(1, Math.floor(Number(v) || 30));
                              updateItemDuration(item.id, d);
                              setCartVersion((vv) => vv + 1);
                            }}
                          >
                            <SelectTrigger className="sm:w-[180px]">
                              <SelectValue placeholder="Duração" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((d) => (
                                <SelectItem key={d} value={String(d)}>
                                  {d} dia(s)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="sm:ml-auto text-xs text-gray-600">
                            {item.durationDays >= 30 ? 'Mensal' : 'Período curto'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate(backUrl)} variant="outline">
                Adicionar mais pontos
              </Button>
              <Button
                onClick={() => navigate(`/menu/checkout${buildQuery({ token, uf, city })}`)}
                className="gap-2"
              >
                Continuar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
