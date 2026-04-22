import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ArrowLeft, ChevronRight, Clock3, Layers3, MapPin, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  applyDurationToAllParts,
  clearCart,
  formatAddress,
  formatDurationParts,
  readCart,
  removeFromCart,
  updateItemDurationParts,
} from '../lib/menuCart';
import { usePublicMediaKit } from '../hooks/usePublicMediaKit';
import {
  applyAgencyMarkup,
  buildMenuUrl,
  getAgencyMarkupPercent,
  getMenuCatalogQueryParams,
  getMenuEntryUrl,
  isAgencyFlow,
} from '../lib/menuFlow';
import { buildPromoPrice, formatPromotionBadge, getEffectivePromotion } from '../lib/menuPromotions';
import { formatBRL } from '../lib/format';
import '../components/menu/catalog/menuCatalogTheme.css';

function formatCurrencyBRL(value?: number | null): string {
  return formatBRL(value, '—');
}

function buildSavingsMeta(from: number | null | undefined, to: number | null | undefined) {
  if (typeof from !== 'number' || typeof to !== 'number') return null;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= to || from <= 0) return null;
  const amount = from - to;
  const percent = Math.max(1, Math.round((amount / from) * 100));
  return { amount, percent };
}

export default function MenuCarrinho() {
  const navigate = useNavigation();

  const query = useMemo(() => getMenuCatalogQueryParams(), []);
  const { token, flow, ownerCompanyId, source } = query;

  const { data } = usePublicMediaKit({ token, ownerCompanyId, flow });

  const isAgency = isAgencyFlow(flow);
  const markupPct = isAgency ? getAgencyMarkupPercent(data?.company) : 0;
  const isPromotions = flow === 'promotions';

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

  const backUrl = useMemo(() => getMenuEntryUrl(query), [query]);
  const checkoutUrl = useMemo(() => buildMenuUrl('/menu/checkout', query), [query]);

  const [bulkYears, setBulkYears] = useState<string>('0');
  const [bulkMonths, setBulkMonths] = useState<string>('1');
  const [bulkDays, setBulkDays] = useState<string>('0');

  const onApplyAll = () => {
    const parts = {
      years: Math.max(0, Math.floor(Number(bulkYears) || 0)),
      months: Math.max(0, Math.floor(Number(bulkMonths) || 0)),
      days: Math.max(0, Math.floor(Number(bulkDays) || 0)),
    };
    applyDurationToAllParts(parts);
    setCartVersion((v) => v + 1);
    toast.success('Duração aplicada em todos os itens', { description: formatDurationParts(parts) });
  };

  const onRemove = (itemId: string) => {
    removeFromCart(itemId);
    setCartVersion((v) => v + 1);
    toast.success('Item removido');
  };

  const onClear = () => {
    clearCart();
    setCartVersion((v) => v + 1);
    toast.success('Carrinho limpo');
  };

  const onItemDurationChange = (itemId: string, key: 'years' | 'months' | 'days', value: string) => {
    const normalized = Math.max(0, Math.floor(Number(value) || 0));
    const current = cart.items.find((entry) => entry.id === itemId);
    updateItemDurationParts(itemId, {
      years: current?.duration?.years ?? 0,
      months: current?.duration?.months ?? 0,
      days: current?.duration?.days ?? 0,
      [key]: normalized,
    });
    setCartVersion((vv) => vv + 1);
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
      const baseMonth = item.snapshot?.priceMonth ?? unit?.priceMonth ?? p?.basePriceMonth ?? null;
      const baseWeek = item.snapshot?.priceWeek ?? unit?.priceWeek ?? p?.basePriceWeek ?? null;

      const promo = isPromotions ? getEffectivePromotion(unit as any, p as any) : null;
      const promoMonthRaw = promo ? buildPromoPrice(baseMonth, promo) : null;
      const promoWeekRaw = promo ? buildPromoPrice(baseWeek, promo) : null;

      const priceMonth = isAgency ? applyAgencyMarkup(baseMonth, markupPct) : baseMonth;
      const priceWeek = isAgency ? applyAgencyMarkup(baseWeek, markupPct) : baseWeek;

      const promoMonthFrom = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.from, markupPct) : null;
      const promoMonthTo = promoMonthRaw ? applyAgencyMarkup(promoMonthRaw.to, markupPct) : null;
      const promoWeekFrom = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.from, markupPct) : null;
      const promoWeekTo = promoWeekRaw ? applyAgencyMarkup(promoWeekRaw.to, markupPct) : null;
      const promoMonthSavings = buildSavingsMeta(promoMonthFrom, promoMonthTo);
      const promoWeekSavings = buildSavingsMeta(promoWeekFrom, promoWeekTo);

      return {
        item,
        pointName,
        unitLabel,
        address,
        img,
        priceMonth,
        priceWeek,
        promo,
        promoMonthRaw,
        promoWeekRaw,
        promoMonthFrom,
        promoMonthTo,
        promoWeekFrom,
        promoWeekTo,
        promoMonthSavings,
        promoWeekSavings,
      };
    });
  }, [cart.items, data?.points, isAgency, markupPct, isPromotions]);

  const uniquePointsCount = useMemo(() => new Set(itemsEnriched.map((entry) => entry.item.pointId)).size, [itemsEnriched]);
  const withFacesCount = useMemo(() => itemsEnriched.filter((entry) => !!entry.unitLabel).length, [itemsEnriched]);

  const summaryTotals = useMemo(() => {
    return itemsEnriched.reduce(
      (acc, entry) => {
        const month =
          isPromotions && entry.promoMonthTo !== null && entry.promoMonthTo !== undefined
            ? entry.promoMonthTo
            : entry.priceMonth;
        const week =
          isPromotions && entry.promoWeekTo !== null && entry.promoWeekTo !== undefined
            ? entry.promoWeekTo
            : entry.priceWeek;
        const monthCompare =
          isPromotions && entry.promoMonthFrom !== null && entry.promoMonthFrom !== undefined
            ? entry.promoMonthFrom
            : null;
        const weekCompare =
          isPromotions && entry.promoWeekFrom !== null && entry.promoWeekFrom !== undefined
            ? entry.promoWeekFrom
            : null;
        acc.month += Number(month) || 0;
        acc.week += Number(week) || 0;
        acc.monthCompare += Number(monthCompare) || 0;
        acc.weekCompare += Number(weekCompare) || 0;
        return acc;
      },
      { month: 0, week: 0, monthCompare: 0, weekCompare: 0 },
    );
  }, [itemsEnriched, isPromotions]);

  const summaryMonthSavings = buildSavingsMeta(summaryTotals.monthCompare || null, summaryTotals.month || null);
  const summaryWeekSavings = buildSavingsMeta(summaryTotals.weekCompare || null, summaryTotals.week || null);

  return (
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-cart-frame">
        <div className="menu-cart-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Carrinho</strong>
            {isAgencyFlow(flow) ? <Badge className="menu-cart-pill">Agência</Badge> : null}
          </div>
          <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-4 w-4" />
            {source === 'catalog' ? 'Voltar ao catálogo' : 'Voltar'}
          </Button>
        </div>

        <section className="menu-catalog-actions-card menu-cart-hero-card">
          <div className="menu-cart-hero-main">
            <div className="menu-cart-kicker">
              <ShoppingCart className="h-3.5 w-3.5" />
              Carrinho do cardápio
            </div>
            <h1 className="menu-cart-hero-title">Revise seus itens no mesmo padrão visual da vitrine.</h1>
            <p className="menu-cart-hero-copy">
              Ajuste a duração, confirme valores e avance para o checkout sem sair da linguagem visual do cardápio.
            </p>
          </div>
          <div className="menu-cart-hero-summary">
            {[
              ['Itens', String(cart.items.length)],
              ['Pontos', String(uniquePointsCount)],
              ['Faces', String(withFacesCount)],
            ].map(([label, value]) => (
              <div key={label} className="menu-cart-stat-box">
                <span className="menu-cart-stat-value">{value}</span>
                <span className="menu-cart-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {cart.items.length === 0 ? (
          <Card className="menu-catalog-actions-card menu-cart-empty-card">
            <CardContent className="menu-cart-empty-content">
              <div className="menu-cart-empty-icon">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="menu-cart-empty-texts">
                <div className="menu-cart-empty-title">Seu carrinho ainda está vazio</div>
                <div className="menu-cart-empty-copy">
                  Volte para o catálogo, escolha os pontos desejados e monte seu pedido antes de seguir para o checkout.
                </div>
              </div>
              <Button className="menu-cart-primary-button" onClick={() => navigate(backUrl)}>
                {source === 'catalog' ? 'Voltar ao catálogo' : 'Escolher pontos'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="menu-cart-layout">
            <div className="menu-cart-main-column">
              <Card className="menu-catalog-filters-card menu-cart-duration-card">
                <CardContent className="menu-cart-duration-content">
                  <div className="menu-cart-section-title">
                    <Clock3 className="h-4 w-4" />
                    Ajuste rápido de duração
                  </div>
                  <p className="menu-cart-section-copy">
                    Defina um período padrão para todo o carrinho e refine item por item apenas quando necessário.
                  </p>
                  <div className="menu-cart-duration-grid">
                    <label className="menu-cart-input-card">
                      <span>Anos</span>
                      <Input type="number" min={0} value={bulkYears} onChange={(e) => setBulkYears(e.target.value)} />
                    </label>
                    <label className="menu-cart-input-card">
                      <span>Meses</span>
                      <Input type="number" min={0} value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)} />
                    </label>
                    <label className="menu-cart-input-card">
                      <span>Dias</span>
                      <Input type="number" min={0} value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
                    </label>
                  </div>
                  <div className="menu-cart-duration-footer">
                    <div className="menu-cart-duration-preview">
                      <span className="menu-cart-duration-preview-label">Prévia do período</span>
                      <strong>{formatDurationParts({ years: Number(bulkYears) || 0, months: Number(bulkMonths) || 0, days: Number(bulkDays) || 0 })}</strong>
                    </div>
                    <Button className="menu-cart-primary-button" onClick={onApplyAll}>
                      Aplicar em todos
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="menu-cart-items-list">
                {itemsEnriched.map(
                  ({
                    item,
                    pointName,
                    unitLabel,
                    address,
                    img,
                    priceMonth,
                    priceWeek,
                    promo,
                    promoMonthRaw,
                    promoWeekRaw,
                    promoMonthFrom,
                    promoMonthTo,
                    promoWeekFrom,
                    promoWeekTo,
                    promoMonthSavings,
                    promoWeekSavings,
                  }) => (
                    <Card key={item.id} className="menu-catalog-actions-card menu-cart-item-card">
                      <CardContent className="menu-cart-item-content">
                        <div className="menu-cart-item-media">
                          <ImageWithFallback src={img} alt={pointName} className="menu-cart-item-image" />
                        </div>

                        <div className="menu-cart-item-main">
                          <div className="menu-cart-item-header">
                            <div>
                              <div className="menu-cart-item-badges">
                                <Badge variant="outline" className="menu-cart-soft-badge">
                                  {unitLabel ? 'Face/tela selecionada' : 'Ponto selecionado'}
                                </Badge>
                                <Badge variant="outline" className="menu-cart-soft-badge">
                                  {item.durationDays >= 30 ? 'Leitura mensal' : 'Leitura curta'}
                                </Badge>
                                {isPromotions && promo ? <Badge className="menu-cart-promo-badge">{formatPromotionBadge(promo)}</Badge> : null}
                              </div>
                              <h2 className="menu-copy-wrap menu-cart-item-title">{pointName}</h2>
                              {unitLabel ? <div className="menu-copy-wrap menu-cart-item-subtitle">{unitLabel}</div> : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="menu-cart-remove-icon"
                              onClick={() => onRemove(item.id)}
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {address ? (
                            <div className="menu-cart-address-row">
                              <MapPin className="h-4 w-4" />
                              <span className="menu-copy-wrap">{address}</span>
                            </div>
                          ) : null}

                          <div className="menu-cart-item-panels">
                            <div className="menu-cart-price-panel">
                              <div className="menu-cart-panel-label-row">
                                <span className="menu-cart-panel-label">Valor mensal</span>
                                {promoMonthSavings ? <Badge className="menu-cart-savings-badge">-{promoMonthSavings.percent}%</Badge> : null}
                              </div>
                              <div className="menu-cart-price-value">
                                {isPromotions && promoMonthRaw && promoMonthFrom !== null && promoMonthTo !== null ? (
                                  <>
                                    <span className="menu-cart-price-compare">{formatCurrencyBRL(promoMonthFrom)}</span>
                                    <strong>{formatCurrencyBRL(promoMonthTo)}</strong>
                                  </>
                                ) : (
                                  <strong>{formatCurrencyBRL(priceMonth)}</strong>
                                )}
                              </div>
                              {promoMonthSavings ? <div className="menu-cart-savings-copy">Economia de {formatCurrencyBRL(promoMonthSavings.amount)}</div> : null}
                            </div>

                            <div className="menu-cart-price-panel">
                              <div className="menu-cart-panel-label-row">
                                <span className="menu-cart-panel-label">Valor bi-semana</span>
                                {promoWeekSavings ? <Badge className="menu-cart-savings-badge">-{promoWeekSavings.percent}%</Badge> : null}
                              </div>
                              <div className="menu-cart-price-value">
                                {isPromotions && promoWeekRaw && promoWeekFrom !== null && promoWeekTo !== null ? (
                                  <>
                                    <span className="menu-cart-price-compare">{formatCurrencyBRL(promoWeekFrom)}</span>
                                    <strong>{formatCurrencyBRL(promoWeekTo)}</strong>
                                  </>
                                ) : (
                                  <strong>{formatCurrencyBRL(priceWeek)}</strong>
                                )}
                              </div>
                              {promoWeekSavings ? <div className="menu-cart-savings-copy">Economia de {formatCurrencyBRL(promoWeekSavings.amount)}</div> : null}
                            </div>
                          </div>

                          <div className="menu-cart-duration-item-card">
                            <div className="menu-cart-panel-title-row">
                              <div className="menu-cart-section-title menu-cart-section-title-sm">
                                <Clock3 className="h-4 w-4" />
                                Duração deste item
                              </div>
                              <span className="menu-cart-duration-pill">{formatDurationParts(item.duration)}</span>
                            </div>
                            <div className="menu-cart-duration-grid menu-cart-duration-grid-item">
                              <label className="menu-cart-input-card">
                                <span>Anos</span>
                                <Input type="number" min={0} value={String(item.duration?.years ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'years', e.target.value)} placeholder="0" />
                              </label>
                              <label className="menu-cart-input-card">
                                <span>Meses</span>
                                <Input type="number" min={0} value={String(item.duration?.months ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'months', e.target.value)} placeholder="0" />
                              </label>
                              <label className="menu-cart-input-card">
                                <span>Dias</span>
                                <Input type="number" min={0} value={String(item.duration?.days ?? 0)} onChange={(e) => onItemDurationChange(item.id, 'days', e.target.value)} placeholder="0" />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="menu-cart-item-side">
                          <div className="menu-cart-side-card menu-cart-side-card-dark">
                            <div className="menu-cart-panel-label">No pacote</div>
                            <div className="menu-cart-side-title">
                              <Layers3 className="h-4 w-4" />
                              {unitLabel ? 'Face/tela pronta' : 'Ponto pronto'}
                            </div>
                            <p>Esse item já está organizado e seguirá para o checkout conforme a duração definida.</p>
                          </div>
                          <div className="menu-cart-side-card">
                            <div className="menu-cart-panel-label">Ação rápida</div>
                            <div className="menu-cart-side-title menu-cart-side-title-dark">Remover este item</div>
                            <p>Use esta opção somente se esse ponto ou face não fizer mais parte do pacote.</p>
                            <Button variant="outline" className="menu-cart-secondary-button" onClick={() => onRemove(item.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover item
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </div>

            <aside className="menu-cart-sidebar">
              <Card className="menu-catalog-actions-card menu-cart-summary-card">
                <CardContent className="menu-cart-summary-content">
                  <div>
                    <div className="menu-cart-panel-label">Resumo do pedido</div>
                    <h2 className="menu-cart-summary-title">Pacote pronto para revisão final</h2>
                    <p className="menu-cart-summary-copy">
                      Confira os valores estimados e avance para o checkout quando a composição estiver fechada.
                    </p>
                  </div>

                  <div className="menu-cart-summary-metrics">
                    <div className="menu-cart-summary-metric">
                      <div className="menu-cart-panel-label-row">
                        <span className="menu-cart-panel-label">Mensal estimado</span>
                        {summaryMonthSavings ? <Badge className="menu-cart-savings-badge">-{summaryMonthSavings.percent}%</Badge> : null}
                      </div>
                      <strong>{formatCurrencyBRL(summaryTotals.month)}</strong>
                      {summaryMonthSavings ? <span className="menu-cart-savings-copy">Economia de {formatCurrencyBRL(summaryMonthSavings.amount)}</span> : null}
                    </div>
                    <div className="menu-cart-summary-metric">
                      <div className="menu-cart-panel-label-row">
                        <span className="menu-cart-panel-label">Bi-semana estimado</span>
                        {summaryWeekSavings ? <Badge className="menu-cart-savings-badge">-{summaryWeekSavings.percent}%</Badge> : null}
                      </div>
                      <strong>{formatCurrencyBRL(summaryTotals.week)}</strong>
                      {summaryWeekSavings ? <span className="menu-cart-savings-copy">Economia de {formatCurrencyBRL(summaryWeekSavings.amount)}</span> : null}
                    </div>
                  </div>

                  <div className="menu-cart-summary-stats">
                    {[
                      ['Itens', String(cart.items.length)],
                      ['Pontos', String(uniquePointsCount)],
                      ['Faces', String(withFacesCount)],
                    ].map(([label, value]) => (
                      <div key={label} className="menu-cart-summary-stat">
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="menu-cart-summary-checklist">
                    <div className="menu-cart-section-title menu-cart-section-title-sm">
                      <ShoppingCart className="h-4 w-4" />
                      Antes de avançar
                    </div>
                    <ul>
                      <li>Confira se todos os itens estão com a duração correta.</li>
                      <li>Compare mensal e bi-semana conforme o cenário da campanha.</li>
                      <li>Siga para o checkout apenas quando o pacote estiver fechado.</li>
                    </ul>
                  </div>

                  <Button className="menu-cart-primary-button menu-cart-primary-button-full" onClick={() => navigate(checkoutUrl)}>
                    Ir para o checkout
                  </Button>
                  <Button variant="outline" className="menu-cart-secondary-button menu-cart-secondary-button-full" onClick={() => navigate(backUrl)}>
                    Adicionar mais itens
                  </Button>
                  <Button variant="ghost" className="menu-cart-clear-button" onClick={onClear}>
                    <Trash2 className="h-4 w-4" />
                    Limpar carrinho
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
