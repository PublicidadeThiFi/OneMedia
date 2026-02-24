import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Loader2, Send, FileText, History, Lock, ExternalLink, RotateCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { MenuRequestErrorCard } from '../components/menu/MenuRequestErrorCard';
import {
  classifyMenuRequestError,
  fetchMenuRequest,
  listMenuGiftTargets,
  previewMenuQuoteTotals,
  regenerateMenuLink,
  sendMenuQuote,
  type MenuAppliedDiscount,
  type MenuDiscountAppliesTo,
  type MenuDiscountScope,
  type MenuGift,
  type MenuGiftScope,
  type MenuGiftTargetSuggestion,
  type MenuItemCostScope,
  type MenuQuoteItemCostLine,
  type MenuQuoteDraft,
  type MenuQuoteServiceLine,
  type MenuQuoteTotals,
  type MenuQuoteVersionRecord,
  type MenuRequestRecord,
} from '../lib/menuRequestApi';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function formatMoneyBr(v: number): string {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

function formatDateTimeBr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  }
}

function clampInt(v: any, min: number, max: number): number {
  const n = Math.floor(Number(v) || 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function formatPeriod(parts?: { years?: any; months?: any; days?: any } | null): string {
  const years = clampInt(parts?.years, 0, 99);
  const months = clampInt(parts?.months, 0, 99);
  const days = clampInt(parts?.days, 0, 99);
  const segs: string[] = [];
  if (years) segs.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months) segs.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days || segs.length === 0) segs.push(`${days || 0} ${days === 1 ? 'dia' : 'dias'}`);
  return segs.join(', ');
}

function isPromoActiveNow(promo: any): boolean {
  if (!promo) return false;
  if (promo.showInMediaKit === false) return false;

  const now = Date.now();
  const s = promo.startsAt ? new Date(String(promo.startsAt)).getTime() : NaN;
  const e = promo.endsAt ? new Date(String(promo.endsAt)).getTime() : NaN;
  if (Number.isFinite(s) && now < s) return false;
  if (Number.isFinite(e) && now > e) return false;
  return true;
}

function readProductionCostsList(raw: any): Array<{ name: string; value: number }> {
  if (!raw) return [];
  const out: Array<{ name: string; value: number }> = [];

  if (Array.isArray(raw)) {
    for (const c of raw) {
      const name = String(c?.name ?? c?.label ?? c?.type ?? 'Custo').trim() || 'Custo';
      const value = Math.max(0, Number(c?.value || 0));
      if (Number.isFinite(value) && value > 0) out.push({ name, value: Number(value.toFixed(2)) });
    }
    return out;
  }

  if (typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const value = Math.max(0, Number(v || 0));
      if (Number.isFinite(value) && value > 0) out.push({ name: String(k).trim() || 'Custo', value: Number(value.toFixed(2)) });
    }
  }
  return out;
}

type ServiceOption = { name: string; defaultValue: number };

const MOCK_SERVICES: ServiceOption[] = [
  { name: 'Impressão (material)', defaultValue: 1200 },
  { name: 'Instalação (mão de obra)', defaultValue: 600 },
  { name: 'Criação/Arte', defaultValue: 800 },
  { name: 'Logística', defaultValue: 350 },
];

export default function MenuDonoWorkspace() {
  const navigate = useNavigation();

  const { token, t, rid } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || '',
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
    };
  }, []);

  const [data, setData] = useState<MenuRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyMenuRequestError> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRegeneratingClient, setIsRegeneratingClient] = useState(false);

  const [draft, setDraft] = useState<MenuQuoteDraft>({
    message: '',
    services: [],
    manualServiceValue: null,
    itemCosts: [],
    gifts: [],
    discounts: [],
    // legado (mantido por compat)
    discountPercent: null,
    discountFixed: null,
    discountApplyTo: 'ALL',
  });

  const [servicePick, setServicePick] = useState<string>(MOCK_SERVICES[0]?.name || '');
  const [serviceValue, setServiceValue] = useState<number>(MOCK_SERVICES[0]?.defaultValue || 0);

  const faceOptions = useMemo(() => {
    const m = new Map<string, { id: string; label: string }>();
    for (const it of data?.items || []) {
      const unitId = String(it?.unitId || '');
      if (!unitId) continue;
      if (!m.has(unitId)) {
        const pointName = it?.snapshot?.pointName || it?.snapshot?.mediaPointName || it?.pointId || '';
        const unitLabel = it?.snapshot?.unitLabel || it?.snapshot?.mediaUnitLabel || unitId;
        m.set(unitId, { id: unitId, label: pointName ? `${pointName} • ${unitLabel}` : String(unitLabel) });
      }
    }
    return Array.from(m.values());
  }, [data?.items]);

  const pointOptions = useMemo(() => {
    const m = new Map<string, { id: string; label: string }>();
    for (const it of data?.items || []) {
      const pointId = String(it?.pointId || '');
      if (!pointId) continue;
      if (!m.has(pointId)) {
        const pointName = it?.snapshot?.pointName || it?.snapshot?.mediaPointName || pointId;
        m.set(pointId, { id: pointId, label: String(pointName) });
      }
    }
    return Array.from(m.values());
  }, [data?.items]);

  const [newDiscountScope, setNewDiscountScope] = useState<MenuDiscountScope>('GENERAL');
  const [newDiscountTargetId, setNewDiscountTargetId] = useState<string>('');
  const [newDiscountAppliesTo, setNewDiscountAppliesTo] = useState<MenuDiscountAppliesTo>('ALL');
  const [newDiscountPercent, setNewDiscountPercent] = useState<string>('');
  const [newDiscountFixed, setNewDiscountFixed] = useState<string>('');

  // Etapa 5 — Brindes
  const [newGiftScope, setNewGiftScope] = useState<MenuGiftScope>('POINT');
  const [newGiftTargetId, setNewGiftTargetId] = useState<string>('');
  const [newGiftYears, setNewGiftYears] = useState<string>('');
  const [newGiftMonths, setNewGiftMonths] = useState<string>('');
  const [newGiftDays, setNewGiftDays] = useState<string>('30');

  const [giftTargetMode, setGiftTargetMode] = useState<'PROPOSAL' | 'INVENTORY' | 'ELIGIBLE'>('PROPOSAL');
  const [giftSearch, setGiftSearch] = useState<string>('');
  const [giftSearchLoading, setGiftSearchLoading] = useState<boolean>(false);
  const [giftSearchOptions, setGiftSearchOptions] = useState<MenuGiftTargetSuggestion[]>([]);

  const [giftCriteriaType, setGiftCriteriaType] = useState<string>('');
  const [giftCriteriaCity, setGiftCriteriaCity] = useState<string>('');
  const [giftCriteriaState, setGiftCriteriaState] = useState<string>('');

  useEffect(() => {
    if (giftTargetMode !== 'INVENTORY') {
      setGiftSearchOptions([]);
      setGiftSearchLoading(false);
      return;
    }

    // Busca no inventário exige link assinado de owner (t)
    if (!t) return;

    const q = String(giftSearch || '').trim();
    if (q.length < 2) {
      setGiftSearchOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setGiftSearchLoading(true);
        const resp = await listMenuGiftTargets({
          requestId: rid,
          t,
          scope: newGiftScope,
          q,
          limit: 20,
        });
        setGiftSearchOptions(Array.isArray(resp?.items) ? resp.items : []);
      } catch (err) {
        setGiftSearchOptions([]);
      } finally {
        setGiftSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [giftTargetMode, giftSearch, newGiftScope, rid, t]);

  useEffect(() => {
    // Auto-select / sync targetId conforme o modo
    if (giftTargetMode === 'ELIGIBLE') {
      if (newGiftTargetId !== '*') setNewGiftTargetId('*');
      return;
    }

    if (giftTargetMode === 'INVENTORY') {
      if (!newGiftTargetId || !giftSearchOptions.some((x) => x.id === newGiftTargetId)) {
        setNewGiftTargetId(giftSearchOptions[0]?.id || '');
      }
      return;
    }

    // PROPOSAL
    if (newGiftScope === 'FACE') {
      if (!newGiftTargetId || !faceOptions.some((x) => x.id === newGiftTargetId)) {
        setNewGiftTargetId(faceOptions[0]?.id || '');
      }
      return;
    }

    if (!newGiftTargetId || !pointOptions.some((x) => x.id === newGiftTargetId)) {
      setNewGiftTargetId(pointOptions[0]?.id || '');
    }
  }, [giftTargetMode, newGiftScope, newGiftTargetId, faceOptions, pointOptions, giftSearchOptions]);

  const removeDiscount = (id: string) => {
    setDraft((d) => ({ ...d, discounts: (d.discounts || []).filter((x) => x.id !== id) }));
  };

  const addDiscount = () => {
    if (isLocked) return;

    const pct = Math.max(0, Number(newDiscountPercent || 0));
    const fixed = Math.max(0, Number(newDiscountFixed || 0));

    if (pct <= 0 && fixed <= 0) {
      toast.error('Informe um desconto (%) ou (R$).');
      return;
    }

    if ((newDiscountScope === 'FACE' || newDiscountScope === 'POINT') && !newDiscountTargetId) {
      toast.error('Selecione o alvo do desconto.');
      return;
    }

    const id = (() => {
      try {
        // @ts-ignore
        return `md_${crypto.randomUUID()}`;
      } catch {
        return `md_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      }
    })();

    const label =
      newDiscountScope === 'FACE'
        ? faceOptions.find((x) => x.id === newDiscountTargetId)?.label || 'Desconto por face'
        : newDiscountScope === 'POINT'
          ? pointOptions.find((x) => x.id === newDiscountTargetId)?.label || 'Desconto por ponto'
          : 'Desconto geral';

    const discount: MenuAppliedDiscount = {
      id,
      scope: newDiscountScope,
      targetId: newDiscountScope === 'GENERAL' ? null : newDiscountTargetId,
      percent: pct > 0 ? pct : null,
      fixed: fixed > 0 ? fixed : null,
      appliesTo: newDiscountScope === 'GENERAL' ? newDiscountAppliesTo : 'BASE',
      label,
    };

    setDraft((d) => ({
      ...d,
      discounts: [...(d.discounts || []), discount],
      // zera o legado para evitar confusão
      discountPercent: null,
      discountFixed: null,
      discountApplyTo: 'ALL',
    }));

    setNewDiscountPercent('');
    setNewDiscountFixed('');
  };

  const removeGift = (id: string) => {
    setDraft((d) => ({ ...d, gifts: (d.gifts || []).filter((x) => x.id !== id) }));
  };

  const addGift = () => {
    if (isLocked) return;

    const years = clampInt(newGiftYears, 0, 10);
    const months = clampInt(newGiftMonths, 0, 24);
    const days = clampInt(newGiftDays, 0, 31);
    let totalDays = years * 365 + months * 30 + days;
    if (totalDays <= 0) totalDays = 30;

    const norm = (v: string) => String(v || '').trim().toLowerCase();

    const buildEligibleLabel = () => {
      const base = newGiftScope === 'FACE' ? 'Qualquer face elegível' : 'Qualquer ponto elegível';
      const parts: string[] = [];
      const type = String(giftCriteriaType || '').trim().toUpperCase();
      const city = String(giftCriteriaCity || '').trim();
      const state = String(giftCriteriaState || '').trim().toUpperCase();
      if (type) parts.push(type);
      if (city || state) parts.push([city, state].filter(Boolean).join('/'));
      return parts.length ? `${base} • ${parts.join(' • ')}` : base;
    };

    const makeId = () => {
      try {
        // @ts-ignore
        return `mg_${crypto.randomUUID()}`;
      } catch {
        return `mg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      }
    };

    if (giftTargetMode === 'ELIGIBLE') {
      const signature = `ELIGIBLE|${newGiftScope}|${norm(giftCriteriaType)}|${norm(giftCriteriaCity)}|${norm(giftCriteriaState)}`;

      const exists = (draft.gifts || []).some((g) => String(g?.meta?.signature || '') === signature);
      if (exists) {
        toast.error('Esse brinde (elegibilidade) já foi adicionado.');
        return;
      }

      const gift: MenuGift = {
        id: makeId(),
        scope: newGiftScope,
        targetId: '*',
        duration: { years, months, days, totalDays },
        label: buildEligibleLabel(),
        meta: {
          mode: 'ANY_ELIGIBLE',
          criteria: {
            type: String(giftCriteriaType || '').trim().toUpperCase() || undefined,
            city: String(giftCriteriaCity || '').trim() || undefined,
            state: String(giftCriteriaState || '').trim().toUpperCase() || undefined,
          },
          signature,
        },
      };

      setDraft((d) => ({
        ...d,
        gifts: [...(d.gifts || []), gift],
      }));

      return;
    }

    // SPECIFIC (PROPOSAL ou INVENTORY)
    if (giftTargetMode === 'PROPOSAL') {
      if ((newGiftScope === 'FACE' && !faceOptions.length) || (newGiftScope === 'POINT' && !pointOptions.length)) {
        toast.error('Não há itens suficientes para este brinde na proposta.');
        return;
      }
    }

    const targetId = String(newGiftTargetId || '').trim();
    if (!targetId) {
      toast.error('Selecione o alvo do brinde.');
      return;
    }

    const signature = `SPECIFIC|${newGiftScope}|${targetId}`;
    const exists = (draft.gifts || []).some((g) => {
      const mode = String(g?.meta?.mode || '').toUpperCase();
      if (mode === 'ANY_ELIGIBLE') return false;
      return g.scope === newGiftScope && String(g.targetId) === String(targetId);
    });
    if (exists) {
      toast.error('Esse brinde já foi adicionado para esse alvo.');
      return;
    }

    const label = (() => {
      if (giftTargetMode === 'INVENTORY') {
        return giftSearchOptions.find((x) => x.id === targetId)?.label || (newGiftScope === 'FACE' ? 'Brinde por face' : 'Brinde por ponto');
      }
      return newGiftScope === 'FACE'
        ? faceOptions.find((x) => x.id === targetId)?.label || 'Brinde por face'
        : pointOptions.find((x) => x.id === targetId)?.label || 'Brinde por ponto';
    })();

    const gift: MenuGift = {
      id: makeId(),
      scope: newGiftScope,
      targetId,
      duration: { years, months, days, totalDays },
      label,
      meta: {
        mode: 'SPECIFIC',
        source: giftTargetMode,
        signature,
      },
    };

    setDraft((d) => ({
      ...d,
      gifts: [...(d.gifts || []), gift],
    }));
  };

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const clientToken = data?.links?.client?.token || '';
  const ownerToken = data?.links?.owner?.token || '';
  const backUrl = useMemo(() => {
    if (clientToken) return `/menu/acompanhar?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientToken)}`;
    return `/menu/acompanhar${buildQuery(authQuery)}`;
  }, [clientToken, rid, authQuery]);

  const propostaUrl = useMemo(() => {
    if (clientToken) return `/menu/proposta?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(clientToken)}`;
    return `/menu/proposta${buildQuery(authQuery)}`;
  }, [clientToken, rid, authQuery]);
  const o4Url = useMemo(() => `/menu/dono/enviada${buildQuery(authQuery)}`, [authQuery]);
  const o5Url = useMemo(() => `/menu/dono/revisao${buildQuery(authQuery)}`, [authQuery]);
  const o6Url = useMemo(() => `/menu/dono/aprovada${buildQuery(authQuery)}`, [authQuery]);

  const ownerWorkspaceLink = useMemo(() => {
    if (ownerToken) return `/menu/dono?rid=${encodeURIComponent(rid)}&t=${encodeURIComponent(ownerToken)}`;
    return `/menu/dono${buildQuery(authQuery)}`;
  }, [ownerToken, rid, authQuery]);

  const currentQuote: MenuQuoteVersionRecord | null = useMemo(() => {
    const quotes = Array.isArray(data?.quotes) ? data!.quotes! : [];
    const v = data?.currentQuoteVersion;
    if (!v) return null;
    return quotes.find((q) => q.version === v) || null;
  }, [data]);

  const status = String(data?.status || '').toUpperCase();
  const isLocked = status === 'APPROVED';

  const [previewTotals, setPreviewTotals] = useState<MenuQuoteTotals>({ base: 0, services: 0, costs: 0, discount: 0, total: 0 });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: any = null;

    if (!data) {
      setPreviewTotals({ base: 0, services: 0, costs: 0, discount: 0, total: 0 });
      setPreviewError(null);
      setPreviewUpdatedAt(null);
      setIsPreviewLoading(false);
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }

    // Após aprovação, usamos sempre os totais persistidos na versão atual.
    if (isLocked) {
      const locked = currentQuote?.totals;
      if (locked) {
        setPreviewTotals({ ...(locked as any), costs: (locked as any)?.costs ?? 0 });
        setPreviewError(null);
        setPreviewUpdatedAt(currentQuote?.createdAt || data?.updatedAt || data?.createdAt || null);
      } else {
        // Sem fallback local: o backend é a fonte única.
        setPreviewTotals({ base: 0, services: 0, costs: 0, discount: 0, total: 0, breakdown: { items: [] } } as any);
        setPreviewError('Não foi possível carregar os totais da versão atual.');
        setPreviewUpdatedAt(null);
      }
      setIsPreviewLoading(false);
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }

    // Debounce (evita flood enquanto digita)
    setIsPreviewLoading(true);
    setPreviewError(null);

    timer = setTimeout(() => {
      (async () => {
        try {
          const resp = await previewMenuQuoteTotals({
            requestId: String(data?.id || ''),
            token: token || undefined,
            t: t || undefined,
            draft,
          });
          if (!alive) return;
          setPreviewTotals({ ...(resp?.totals as any), costs: (resp?.totals as any)?.costs ?? 0 });
          setPreviewError(null);
          setPreviewUpdatedAt(new Date().toISOString());
        } catch (err: any) {
          if (!alive) return;
          const status = Number(err?.response?.status || 0);
          const rawMsg = String(err?.response?.data?.message || err?.response?.data?.error || err?.message || '').trim();
          const msg = rawMsg.toLowerCase();

          // B1: tornar o erro acionável. Mantemos o último preview válido (B2).
          if ([401, 403, 410].includes(status)) {
            if (msg.includes('expir')) {
              setPreviewError('Link expirado. Gere um novo link do dono para continuar editando.');
            } else if (msg.includes('inválid') || msg.includes('inval') || msg.includes('revog')) {
              setPreviewError('Link inválido ou revogado. Gere um novo link do dono.');
            } else {
              setPreviewError('Acesso negado. Use o link do dono (t) para atualizar o preview.');
            }
          } else if (status === 0) {
            setPreviewError('Falha de rede ao atualizar o preview. Mantendo o último valor válido.');
          } else {
            setPreviewError(rawMsg || 'Não foi possível atualizar o preview agora. Mantendo o último valor válido.');
          }
        } finally {
          if (!alive) return;
          setIsPreviewLoading(false);
        }
      })();
    }, 250);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [data, draft, token, t, isLocked, currentQuote, previewNonce]);


  useEffect(() => {
    let alive = true;

    // rid é obrigatório para carregar o workspace
    if (!String(rid || '').trim()) {
      setData(null);
      setIsLoading(false);
      setLoadError({
        kind: 'MISSING_TOKEN',
        title: 'Acesso inválido',
        description: 'O link está incompleto. Abra o workspace a partir do link do responsável.',
      });
      return () => {
        alive = false;
      };
    }

    // Etapa 8 — blindagem: páginas do responsável só via link assinado (t)
    if (!String(t || '').trim()) {
      setData(null);
      setIsLoading(false);
      setLoadError({
        kind: 'MISSING_TOKEN',
        title: 'Acesso restrito',
        description: 'Este workspace é exclusivo do responsável. Abra a partir do link enviado por e-mail.',
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
        if (!alive) return;
        setData(res);

        // Prefill draft with last sent version (optional quality-of-life)
        const quotes = Array.isArray(res?.quotes) ? res!.quotes! : [];
        const v = res?.currentQuoteVersion;
        const last = v ? quotes.find((q) => q.version === v) : null;
        if (last?.draft) {
          const loadedDiscounts0 = Array.isArray((last.draft as any)?.discounts) ? (((last.draft as any).discounts as any) || []) : [];

          const loadedGifts0 = Array.isArray((last.draft as any)?.gifts)
            ? (((last.draft as any).gifts as any) || [])
            : Array.isArray((last.draft as any)?.brindes)
              ? (((last.draft as any).brindes as any) || [])
              : [];

          const gifts: MenuGift[] = loadedGifts0
            .map((g: any) => {
              const scopeRaw = String(g?.scope ?? g?.targetType ?? g?.type ?? '').trim().toUpperCase();
              const scope: MenuGiftScope = scopeRaw === 'POINT' || scopeRaw === 'PONTO' ? 'POINT' : 'FACE';
              const targetId = String(g?.targetId ?? g?.target ?? g?.unitId ?? g?.pointId ?? '').trim();
              if (!targetId) return null;

              const period = g?.duration ?? g?.period ?? g?.occupation ?? {};
              const years = clampInt(period?.years, 0, 10);
              const months = clampInt(period?.months, 0, 24);
              const days = clampInt(period?.days, 0, 31);
              let totalDays = years * 365 + months * 30 + days;
              if (totalDays <= 0) totalDays = 30;

              return {
                id: String(g?.id || `mg_legacy_${targetId}`),
                scope,
                targetId,
                duration: { years, months, days, totalDays },
                label: g?.label ?? null,
              } as MenuGift;
            })
            .filter(Boolean) as MenuGift[];

          // Etapa 4 — custos no item
          const loadedItemCosts0 = Array.isArray((last.draft as any)?.itemCosts)
            ? (((last.draft as any).itemCosts as any) || [])
            : [];

          const itemCosts: MenuQuoteItemCostLine[] = loadedItemCosts0
            .map((c: any) => {
              const scopeRaw = String(c?.scope ?? c?.targetType ?? c?.type ?? '').trim().toUpperCase();
              const scope: MenuItemCostScope = scopeRaw === 'POINT' || scopeRaw === 'PONTO' ? 'POINT' : 'FACE';
              const targetId = String(c?.targetId ?? c?.target ?? c?.unitId ?? c?.pointId ?? '').trim();
              const name = String(c?.name ?? c?.label ?? c?.title ?? '').trim();
              const value = Math.max(0, Number(c?.value || 0));
              if (!targetId || !name || !Number.isFinite(value) || value <= 0) return null;
              return {
                id: String(c?.id || `mic_legacy_${scope}_${targetId}_${name}`),
                scope,
                targetId,
                name,
                value: Number(value.toFixed(2)),
                meta: c?.meta && typeof c.meta === 'object' ? c.meta : undefined,
              } as MenuQuoteItemCostLine;
            })
            .filter(Boolean) as MenuQuoteItemCostLine[];

          const legacyPercent = Math.max(0, Number((last.draft as any)?.discountPercent || 0));
          const legacyFixed = Math.max(0, Number((last.draft as any)?.discountFixed || 0));
          const legacyApplyTo = ((String((last.draft as any)?.discountApplyTo || 'ALL').toUpperCase() as any) || 'ALL') as MenuDiscountAppliesTo;

          const mergedDiscounts =
            loadedDiscounts0.length
              ? loadedDiscounts0
              : legacyPercent > 0 || legacyFixed > 0
                ? [
                    {
                      id: 'legacy_general',
                      scope: 'GENERAL',
                      targetId: null,
                      percent: legacyPercent > 0 ? legacyPercent : null,
                      fixed: legacyFixed > 0 ? legacyFixed : null,
                      appliesTo: legacyApplyTo,
                      label: 'Desconto geral',
                    },
                  ]
                : [];

          setDraft({
            message: last.draft.message || '',
            services: Array.isArray(last.draft.services)
              ? last.draft.services.map((s: any) => ({
                  name: s?.name,
                  value: s?.value,
                  discountPercent: s?.discountPercent ?? null,
                  discountFixed: s?.discountFixed ?? null,
                }))
              : [],
            manualServiceValue: last.draft.manualServiceValue ?? null,
            itemCosts,
            gifts,
            discounts: mergedDiscounts,
            // legado
            discountPercent: last.draft.discountPercent ?? null,
            discountFixed: last.draft.discountFixed ?? null,
            discountApplyTo: (last.draft as any)?.discountApplyTo ?? 'ALL',
          });
        }
      } catch (err: any) {
        const classified = classifyMenuRequestError(err);
        setData(null);
        setLoadError(classified);
        if (classified.kind === 'GENERIC') {
          toast.error(classified.title, { description: classified.description });
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [rid, token, t]);

  const refresh = async () => {
    const res = await fetchMenuRequest({ requestId: rid, token, t, view: 'owner' });
    setData(res);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const full = (path: string) => `${origin}${path}`;

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const onRegenerateClient = async () => {
    try {
      setIsRegeneratingClient(true);
      await regenerateMenuLink({ requestId: rid, aud: 'client', token, t });
      await refresh();
      toast.success('Link do cliente regenerado', { description: 'O link anterior foi invalidado.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao regenerar.';
      toast.error('Não foi possível regenerar', { description: String(msg) });
    } finally {
      setIsRegeneratingClient(false);
    }
  };

  const onPickService = (name: string) => {
    setServicePick(name);
    const opt = MOCK_SERVICES.find((s) => s.name === name);
    if (opt) setServiceValue(opt.defaultValue);
  };

  const addServiceLine = () => {
    const name = String(servicePick || '').trim();
    const value = Number(serviceValue || 0);
    if (!name || !Number.isFinite(value) || value <= 0) return;

    const line: MenuQuoteServiceLine = { name, value, discountPercent: null, discountFixed: null };
    setDraft((d) => ({
      ...d,
      services: [...(d.services || []), line],
    }));
  };

  const removeServiceLine = (idx: number) => {
    setDraft((d) => ({
      ...d,
      services: (d.services || []).filter((_, i) => i !== idx),
    }));
  };

  const updateServiceLine = (idx: number, patch: Partial<MenuQuoteServiceLine>) => {
    setDraft((d) => ({
      ...d,
      services: (d.services || []).map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  // Etapa 4 — custos no item (ponto/face)
  const [itemCostInputs, setItemCostInputs] = useState<Record<string, { name: string; value: string }>>({});

  const getItemScopeTarget = (it: any): { scope: MenuItemCostScope; targetId: string } | null => {
    const unitId = String(it?.unitId ?? '').trim();
    const pointId = String(it?.pointId ?? '').trim();
    if (unitId) return { scope: 'FACE', targetId: unitId };
    if (pointId) return { scope: 'POINT', targetId: pointId };
    return null;
  };

  const removeItemCost = (id: string) => {
    setDraft((d) => ({ ...d, itemCosts: (d.itemCosts || []).filter((c) => c.id !== id) }));
  };

  const addItemCost = (itemKey: string, it: any) => {
    if (isLocked) return;

    const st = getItemScopeTarget(it);
    if (!st) {
      toast.error('Não foi possível identificar o alvo do custo (ponto/face).');
      return;
    }

    const current = itemCostInputs[itemKey] || { name: '', value: '' };
    const name = String(current.name || '').trim();
    const value = Math.max(0, Number(current.value || 0));

    if (!name) {
      toast.error('Informe o nome/descrição do custo.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Informe um valor válido para o custo.');
      return;
    }

    const id = (() => {
      try {
        // @ts-ignore
        return `mic_${crypto.randomUUID()}`;
      } catch {
        return `mic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      }
    })();

    const line: MenuQuoteItemCostLine = {
      id,
      scope: st.scope,
      targetId: st.targetId,
      name,
      value: Number(value.toFixed(2)),
    };

    setDraft((d) => ({ ...d, itemCosts: [...(d.itemCosts || []), line] }));
    setItemCostInputs((m) => ({ ...m, [itemKey]: { name: '', value: '' } }));
  };


  const onSend = async () => {
    try {
      if (isLocked) return;
      setIsSending(true);
      await sendMenuQuote({ requestId: rid, token, t, draft });
      toast.success('Proposta enviada', { description: 'Versão criada e vinculada ao request (protótipo).' });
      navigate(o4Url);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar.';
      toast.error('Não foi possível enviar', { description: String(msg) });
    } finally {
      setIsSending(false);
    }
  };

  const goByStatus = () => {
    if (status === 'APPROVED') return navigate(o6Url);
    if (status === 'REVISION_REQUESTED') return navigate(o5Url);
    if (status === 'QUOTE_SENT') return navigate(o4Url);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Workspace do responsável</div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Acompanhar
            </Button>
            <Button variant="outline" className="gap-2" onClick={goByStatus}>
              <FileText className="h-4 w-4" />
              Estado atual
            </Button>
          </div>
        </div>

        <Card className="mt-5">
          <CardContent className="py-6">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : !data ? (
              <MenuRequestErrorCard
                error={loadError || {
                  kind: 'NOT_FOUND',
                  title: 'Solicitação não encontrada',
                  description: 'Verifique se o link está completo ou gere um novo link para o responsável.',
                }}
                primaryAction={{
                  label: 'Ir para o início',
                  variant: 'outline',
                  onClick: () => navigate('/menu'),
                }}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Request ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-800 break-all">{data.id}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Atualizado em <span className="font-semibold">{formatDateTimeBr(data.updatedAt || data.createdAt)}</span>
                  </div>
                </div>

                {data.links && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-500">Link do cliente (assinado)</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={onRegenerateClient}
                          disabled={isRegeneratingClient}
                        >
                          {isRegeneratingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                          Regenerar
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links?.client?.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links?.client?.expiresAt)}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(backUrl))}>
                          <Copy className="h-4 w-4" />
                          Copiar acompanhamento
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(propostaUrl))}>
                          <Copy className="h-4 w-4" />
                          Copiar proposta
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 break-all">{full(propostaUrl)}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">Link do dono (workspace)</div>

                      <div className="mt-2 text-xs text-gray-600">
                        <div>Aberta em: <span className="font-semibold">{formatDateTimeBr(data.links?.owner?.openedAtLast)}</span></div>
                        <div className="mt-0.5">Expira em: <span className="font-semibold">{formatDateTimeBr(data.links?.owner?.expiresAt)}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(full(ownerWorkspaceLink))}>
                          <Copy className="h-4 w-4" />
                          Copiar link
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 break-all">{full(ownerWorkspaceLink)}</div>
                    </div>
                  </div>
                )}

                {isLocked && (
                  <div className="mt-4 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-sm text-white">
                    <div className="flex items-center gap-2 font-semibold">
                      <Lock className="h-4 w-4" />
                      Proposta aprovada (travada)
                    </div>
                    <div className="mt-1 text-xs text-gray-200">Você não pode gerar novas versões após aprovação.</div>
                  </div>
                )}

                {status === 'REVISION_REQUESTED' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="font-semibold">Revisão solicitada pelo cliente</div>
                    <div className="mt-1 text-xs text-amber-800">Abra a tela de revisão para ver a mensagem do cliente.</div>
                    <div className="mt-3">
                      <Button variant="outline" onClick={() => navigate(o5Url)}>Ver revisão</Button>
                    </div>
                  </div>
                )}

                <Separator className="my-5" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Resumo do cliente</div>
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                      <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{data.customerName}</span></div>
                      <div className="mt-1"><span className="text-gray-500">WhatsApp:</span> {data.customerPhone}</div>
                      <div className="mt-1"><span className="text-gray-500">E-mail:</span> {data.customerEmail}</div>
                      {data.customerCompanyName && (
                        <div className="mt-1"><span className="text-gray-500">Empresa:</span> {data.customerCompanyName}</div>
                      )}
                      {data.notes && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500">Observações</div>
                          <div className="mt-1 whitespace-pre-wrap">{data.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 text-sm font-semibold text-gray-900">Histórico de versões</div>
                    <div className="mt-3 space-y-2">
                      {(Array.isArray(data.quotes) ? data.quotes : []).length === 0 ? (
                        <div className="text-sm text-gray-600">Nenhuma versão enviada ainda.</div>
                      ) : (
                        (data.quotes || []).slice().reverse().map((q) => (
                          <div key={q.version} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">v{q.version}</div>
                              <div className="text-xs text-gray-600">{formatDateTimeBr(q.createdAt)}</div>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <div className="text-xs text-gray-600">Status: <span className="font-semibold">{q.status}</span></div>
                              <div className="text-sm font-bold text-gray-900">{formatMoneyBr(q.totals.total)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">Documento editável (mock)</div>
                      <Button variant="outline" className="gap-2" onClick={() => navigate(propostaUrl)}>
                        <ExternalLink className="h-4 w-4" />
                        Ver como cliente
                      </Button>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">Itens (memória rápida)</div>
                      <div className="mt-2 space-y-3">
                        {(Array.isArray(data.items) ? data.items : []).map((it: any, idx: number) => {
                          const snap = it?.snapshot || {};
                          const itemKey = String(it?.id || `${idx}`);

                          const unitLabel = String(snap?.unitLabel || snap?.mediaUnitLabel || '').trim();
                          const pointName = String(snap?.pointName || snap?.mediaPointName || 'Ponto').trim();
                          const title = unitLabel ? `${pointName} — ${unitLabel}` : pointName;

                          const durationLabel = formatPeriod(it?.duration || { days: it?.durationDays || 30 });

                          const unitMonth = Number(snap?.unitPriceMonth || 0);
                          const unitWeek = Number(snap?.unitPriceWeek || 0);
                          const origin = unitMonth > 0 || unitWeek > 0 ? 'Face' : 'Ponto';

                          const priceMonth = Number(snap?.priceMonth || 0);
                          const priceWeek = Number(snap?.priceWeek || 0);
                          const baseSegs: string[] = [];
                          if (priceMonth > 0) baseSegs.push(`Mês: ${formatMoneyBr(priceMonth)}`);
                          if (priceWeek > 0) baseSegs.push(`Semana: ${formatMoneyBr(priceWeek)}`);

                          const prodCosts = readProductionCostsList(snap?.productionCosts);
                          const prodCostsSum = prodCosts.reduce((acc, c) => acc + Math.max(0, Number(c.value || 0)), 0);

                          const st = getItemScopeTarget(it);
                          const itemCosts = (draft.itemCosts || []).filter((c) =>
                            st ? c.scope === st.scope && String(c.targetId) === String(st.targetId) : false,
                          );
                          const itemCostsSum = itemCosts.reduce((acc, c) => acc + Math.max(0, Number(c.value || 0)), 0);

                          const flowIsPromotions = String((data as any)?.flow || '').toLowerCase() === 'promotions';
                          const promo = snap?.effectivePromotion ?? snap?.promotion ?? null;
                          const hasPromo = flowIsPromotions && isPromoActiveNow(promo);
                          const promoType = String(promo?.discountType || '').toUpperCase();
                          const promoValue = Math.max(0, Number(promo?.discountValue || 0));
                          const promoLabel =
                            !hasPromo || promoValue <= 0
                              ? ''
                              : promoType === 'PERCENT'
                                ? `Promo: -${promoValue}%`
                                : promoType === 'FIXED'
                                  ? `Promo: -${formatMoneyBr(promoValue)}`
                                  : 'Promo ativa';

                          const relatedDiscounts: MenuAppliedDiscount[] = (draft.discounts || []).filter((d) => {
                            const scope = String(d.scope || '').toUpperCase();
                            const targetId = String(d.targetId || '').trim();
                            if (scope === 'GENERAL') return true;
                            if (scope === 'POINT') return targetId && targetId === String(it?.pointId || '');
                            if (scope === 'FACE') return targetId && targetId === String(it?.unitId || '');
                            return false;
                          });

                          const input = itemCostInputs[itemKey] || { name: '', value: '' };

                          return (
                            <div key={itemKey} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                                  <div className="mt-1 text-xs text-gray-600">Período: <span className="font-semibold">{durationLabel}</span></div>
                                  <div className="mt-1 text-xs text-gray-600">
                                    Base (origem: <span className="font-semibold">{origin}</span>)
                                    {baseSegs.length ? <span className="ml-2">• {baseSegs.join(' • ')}</span> : null}
                                  </div>

                                  {(prodCosts.length > 0 || hasPromo || relatedDiscounts.length > 0) && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {prodCosts.length > 0 && (
                                        <Badge variant="secondary" className="rounded-full">
                                          Custos cadastrados: {formatMoneyBr(prodCostsSum)}
                                        </Badge>
                                      )}
                                      {hasPromo && (
                                        <Badge variant="secondary" className="rounded-full">{promoLabel}</Badge>
                                      )}

                                      {relatedDiscounts.slice(0, 3).map((d) => {
                                        const pct = Math.max(0, Number((d as any)?.percent || 0));
                                        const fix = Math.max(0, Number((d as any)?.fixed || 0));
                                        const val = pct > 0 ? `-${pct}%` : fix > 0 ? `-${formatMoneyBr(fix)}` : '';
                                        const label = String(d.label || '').trim() || (String(d.scope).toUpperCase() === 'GENERAL' ? 'Desconto geral' : 'Desconto');
                                        return (
                                          <Badge key={d.id} variant="secondary" className="rounded-full">
                                            {label} {val}
                                          </Badge>
                                        );
                                      })}
                                      {relatedDiscounts.length > 3 && (
                                        <Badge variant="secondary" className="rounded-full">+{relatedDiscounts.length - 3} descontos</Badge>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="sm:text-right">
                                  <div className="text-xs text-gray-500">Custos no item</div>
                                  <div className="mt-0.5 text-sm font-bold text-gray-900">{formatMoneyBr(itemCostsSum)}</div>
                                </div>
                              </div>

                              {prodCosts.length > 0 && (
                                <div className="mt-2 text-xs text-gray-600">
                                  {prodCosts.slice(0, 6).map((c) => (
                                    <span key={c.name} className="mr-2 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">
                                      <span className="text-gray-500">{c.name}:</span> <span className="font-semibold">{formatMoneyBr(c.value)}</span>
                                    </span>
                                  ))}
                                  {prodCosts.length > 6 && <span className="text-gray-500">+{prodCosts.length - 6}…</span>}
                                </div>
                              )}

                              {itemCosts.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {itemCosts.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                                      <div className="min-w-0">
                                        <div className="text-sm text-gray-900 truncate">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.scope === 'FACE' ? 'Face' : 'Ponto'} • entra em “Custos”</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(c.value)}</div>
                                        <Button variant="outline" size="sm" onClick={() => removeItemCost(c.id)} disabled={isLocked}>
                                          Remover
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  value={input.name}
                                  onChange={(e) => setItemCostInputs((m) => ({ ...m, [itemKey]: { ...(m[itemKey] || { name: '', value: '' }), name: e.target.value } }))}
                                  placeholder="Descrição do custo"
                                  disabled={isLocked}
                                />
                                <Input
                                  type="number"
                                  value={input.value}
                                  onChange={(e) => setItemCostInputs((m) => ({ ...m, [itemKey]: { ...(m[itemKey] || { name: '', value: '' }), value: e.target.value } }))}
                                  placeholder="Valor"
                                  disabled={isLocked}
                                />
                                <Button variant="outline" onClick={() => addItemCost(itemKey, it)} disabled={isLocked}>
                                  Adicionar custo no item
                                </Button>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Dica: use <span className="font-semibold">custo no item</span> para que entre no bloco de <span className="font-semibold">Custos</span> (descontável por descontos gerais quando aplicável). Para itens “por fora”, use <span className="font-semibold">Serviços</span>.
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Separator className="my-4" />

                      <div className="text-xs text-gray-500">Mensagem (opcional)</div>
                      <div className="mt-2">
                        <Textarea
                          value={String(draft.message ?? '')}
                          onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                          placeholder="Explique condições, prazos, observações…"
                          disabled={isLocked}
                        />
                      </div>

                      <Separator className="my-4" />

                      <div className="text-sm font-semibold text-gray-900">Serviços</div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                          value={servicePick}
                          onChange={(e) => onPickService(e.target.value)}
                          disabled={isLocked}
                        >
                          {MOCK_SERVICES.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          value={Number.isFinite(Number(serviceValue)) ? String(serviceValue) : ''}
                          onChange={(e) => setServiceValue(Number(e.target.value || 0))}
                          placeholder="Valor"
                          disabled={isLocked}
                        />
                        <Button variant="outline" onClick={addServiceLine} disabled={isLocked}>Adicionar</Button>
                      </div>

                      {((draft.services || []).length > 0 || Math.max(0, Number(draft.manualServiceValue || 0)) > 0) && (
                        <div className="mt-3 space-y-2">
                          {(draft.services || []).map((s, idx) => {
                            const value = Math.max(0, Number(s?.value || 0));
                            const dp = Math.max(0, Number((s as any)?.discountPercent || 0));
                            const df = Math.max(0, Number((s as any)?.discountFixed || 0));
                            const lineDiscount = Number(Math.min(value, value * (dp / 100) + df).toFixed(2));
                            const hasLineDiscount = lineDiscount > 0;

                            return (
                              <div key={`${s.name}-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-gray-900">{s.name}</div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <div className="text-xs text-gray-500">Desconto do serviço (opcional)</div>

                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        className="h-9 w-20"
                                        value={(s as any)?.discountPercent == null ? '' : String((s as any)?.discountPercent)}
                                        onChange={(e) =>
                                          updateServiceLine(idx, { discountPercent: e.target.value ? Number(e.target.value) : null })
                                        }
                                        placeholder="%"
                                        disabled={isLocked}
                                      />
                                      <Input
                                        type="number"
                                        className="h-9 w-24"
                                        value={(s as any)?.discountFixed == null ? '' : String((s as any)?.discountFixed)}
                                        onChange={(e) =>
                                          updateServiceLine(idx, { discountFixed: e.target.value ? Number(e.target.value) : null })
                                        }
                                        placeholder="R$"
                                        disabled={isLocked}
                                      />
                                    </div>

                                    {hasLineDiscount && (
                                      <div className="text-xs text-gray-500">
                                        (- {formatMoneyBr(lineDiscount)})
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3">
                                  <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(s.value)}</div>
                                  <Button variant="ghost" size="sm" onClick={() => removeServiceLine(idx)} disabled={isLocked}>Remover</Button>
                                </div>
                              </div>
                            );
                          })}

                          {Math.max(0, Number(draft.manualServiceValue || 0)) > 0 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-900">Serviço manual</div>
                                <div className="mt-1 text-xs text-gray-500">Incluído no bloco de Serviços</div>
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(Number(draft.manualServiceValue || 0))}</div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500">Serviço manual (R$)</div>
                          <Input
                            type="number"
                            value={draft.manualServiceValue == null ? '' : String(draft.manualServiceValue)}
                            onChange={(e) => setDraft((d) => ({ ...d, manualServiceValue: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </div>
                        <div />
                      </div>

                      <Separator className="my-4" />

                                            <div className="text-sm font-semibold text-gray-900">Descontos</div>

                                            <div className="mt-2 space-y-2">
                                              {(draft.discounts || []).length === 0 ? (
                                                <div className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500">
                                                  Nenhum desconto aplicado.
                                                </div>
                                              ) : (
                                                (draft.discounts || []).map((d) => {
                                                  const impact = previewTotals?.breakdown?.appliedDiscounts?.find((x) => x.id === d.id);
                                                  const scopeLabel = d.scope === 'FACE' ? 'Face' : d.scope === 'POINT' ? 'Ponto' : 'Geral';
                                                  const appliesToLabel =
                                                    d.scope === 'GENERAL'
                                                      ? d.appliesTo === 'BASE'
                                                        ? 'Base'
                                                        : d.appliesTo === 'SERVICES'
                                                          ? 'Serviços'
                                                          : d.appliesTo === 'COSTS'
                                                            ? 'Custos'
                                                            : 'Tudo'
                                                      : 'Base';
                                                  const valueParts = [
                                                    d.percent ? `${d.percent}%` : null,
                                                    d.fixed ? formatMoneyBr(d.fixed) : null,
                                                  ].filter(Boolean);

                                                  return (
                                                    <div key={d.id} className="rounded-xl border border-gray-200 px-3 py-2">
                                                      <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                          <div className="text-sm font-semibold text-gray-900 truncate">{d.label || `${scopeLabel} (${appliesToLabel})`}</div>
                                                          <div className="text-[11px] text-gray-500">
                                                            {scopeLabel}
                                                            {d.scope !== 'GENERAL' && d.targetId ? ` • alvo: ${d.targetId}` : ''}
                                                            {d.scope === 'GENERAL' ? ` • aplicar em: ${appliesToLabel}` : ''}
                                                            {valueParts.length ? ` • ${valueParts.join(' + ')}` : ''}
                                                          </div>
                                                          {impact?.amount ? (
                                                            <div className="mt-1 text-[11px] text-gray-600">Impacto: - {formatMoneyBr(impact.amount)}</div>
                                                          ) : null}
                                                        </div>

                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => removeDiscount(d.id)}
                                                          disabled={isLocked}
                                                        >
                                                          Remover
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>

                                            <div className="mt-3 rounded-xl border border-gray-200 p-3">
                                              <div className="text-xs font-semibold text-gray-700">Adicionar desconto</div>
                                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2">
                                                <div>
                                                  <div className="text-xs text-gray-500">Escopo</div>
                                                  <select
                                                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                                    value={newDiscountScope}
                                                    onChange={(e) => {
                                                      const v = e.target.value as MenuDiscountScope;
                                                      setNewDiscountScope(v);

                                                      if (v === 'FACE') setNewDiscountTargetId(faceOptions[0]?.id || '');
                                                      else if (v === 'POINT') setNewDiscountTargetId(pointOptions[0]?.id || '');
                                                      else setNewDiscountTargetId('');
                                                    }}
                                                    disabled={isLocked}
                                                  >
                                                    <option value="GENERAL">Geral</option>
                                                    <option value="FACE">Por face</option>
                                                    <option value="POINT">Por ponto</option>
                                                  </select>
                                                </div>

                                                <div>
                                                  <div className="text-xs text-gray-500">{newDiscountScope === 'GENERAL' ? 'Aplicar em' : 'Alvo'}</div>

                                                  {newDiscountScope === 'FACE' ? (
                                                    <select
                                                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                                      value={newDiscountTargetId}
                                                      onChange={(e) => setNewDiscountTargetId(e.target.value)}
                                                      disabled={isLocked || !faceOptions.length}
                                                    >
                                                      {faceOptions.map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                          {o.label}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  ) : newDiscountScope === 'POINT' ? (
                                                    <select
                                                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                                      value={newDiscountTargetId}
                                                      onChange={(e) => setNewDiscountTargetId(e.target.value)}
                                                      disabled={isLocked || !pointOptions.length}
                                                    >
                                                      {pointOptions.map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                          {o.label}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  ) : (
                                                    <select
                                                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                                      value={newDiscountAppliesTo}
                                                      onChange={(e) => setNewDiscountAppliesTo(e.target.value as MenuDiscountAppliesTo)}
                                                      disabled={isLocked}
                                                    >
                                                      <option value="ALL">Tudo (base + serviços)</option>
                                                      <option value="BASE">Base (pontos/faces)</option>
                                                      <option value="SERVICES">Serviços</option>
                                                    </select>
                                                  )}
                                                </div>

                                                <div>
                                                  <div className="text-xs text-gray-500">% (sobre escopo)</div>
                                                  <Input
                                                    type="number"
                                                    value={newDiscountPercent}
                                                    onChange={(e) => setNewDiscountPercent(e.target.value)}
                                                    placeholder="0"
                                                    disabled={isLocked}
                                                  />
                                                </div>

                                                <div>
                                                  <div className="text-xs text-gray-500">R$ fixo</div>
                                                  <Input
                                                    type="number"
                                                    value={newDiscountFixed}
                                                    onChange={(e) => setNewDiscountFixed(e.target.value)}
                                                    placeholder="0"
                                                    disabled={isLocked}
                                                  />
                                                </div>

                                                <div className="flex items-end">
                                                  <Button
                                                    className="w-full"
                                                    variant="outline"
                                                    onClick={addDiscount}
                                                    disabled={isLocked}
                                                  >
                                                    Adicionar
                                                  </Button>
                                                </div>
                                              </div>

                                              {(newDiscountScope === 'FACE' && !faceOptions.length) || (newDiscountScope === 'POINT' && !pointOptions.length) ? (
                                                <div className="mt-2 text-[11px] text-amber-600">
                                                  Não há itens suficientes para listar alvos deste escopo.
                                                </div>
                                              ) : null}
                                            </div>

                      <Separator className="my-4" />

                      <div className="text-sm font-semibold text-gray-900">Brindes (R$ 0)</div>
                      <div className="mt-2 text-[12px] text-gray-600">
                        Brindes são itens gratuitos com período de ocupação. Eles <span className="font-semibold">não alteram o total</span>, mas aparecem no documento.
                      </div>

                      <div className="mt-3 space-y-2">
                        {(draft.gifts || []).length === 0 ? (
                          <div className="text-sm text-gray-600">Nenhum brinde adicionado.</div>
                        ) : (
                          (draft.gifts || []).map((g) => (
                            <div key={g.id} className="rounded-xl border border-gray-200 px-3 py-2">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {g.scope === 'FACE' ? 'Face' : 'Ponto'}: {g.label || g.targetId}
                                  </div>
                                  <div className="mt-0.5 text-xs text-gray-600">
                                    Período: {formatPeriod(g.duration)}
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => removeGift(g.id)} disabled={isLocked}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-gray-200 p-3">
                        <div className="text-xs font-semibold text-gray-700">Adicionar brinde</div>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-8 gap-2">
                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500">Tipo</div>
                            <select
                              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                              value={newGiftScope}
                              onChange={(e) => setNewGiftScope(e.target.value as MenuGiftScope)}
                              disabled={isLocked}
                            >
                              <option value="POINT">Por ponto</option>
                              <option value="FACE">Por face</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500">Modo</div>
                            <select
                              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                              value={giftTargetMode}
                              onChange={(e) => setGiftTargetMode(e.target.value as any)}
                              disabled={isLocked}
                            >
                              <option value="PROPOSAL">Itens da proposta</option>
                              <option value="INVENTORY">Buscar no inventário</option>
                              <option value="ELIGIBLE">Qualquer elegível (regra)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <div className="text-xs text-gray-500">{giftTargetMode === 'ELIGIBLE' ? 'Elegibilidade' : 'Alvo'}</div>

                            {giftTargetMode === 'ELIGIBLE' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  value={giftCriteriaType}
                                  onChange={(e) => setGiftCriteriaType(e.target.value)}
                                  placeholder="Tipo (OOH/DOOH)"
                                  disabled={isLocked}
                                />
                                <Input
                                  value={giftCriteriaCity}
                                  onChange={(e) => setGiftCriteriaCity(e.target.value)}
                                  placeholder="Cidade"
                                  disabled={isLocked}
                                />
                                <Input
                                  value={giftCriteriaState}
                                  onChange={(e) => setGiftCriteriaState(e.target.value)}
                                  placeholder="UF"
                                  disabled={isLocked}
                                />
                              </div>
                            ) : giftTargetMode === 'INVENTORY' ? (
                              <div className="space-y-2">
                                <Input
                                  value={giftSearch}
                                  onChange={(e) => setGiftSearch(e.target.value)}
                                  placeholder="Buscar no inventário (mín. 2 letras)"
                                  disabled={isLocked || !t}
                                />
                                <select
                                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                  value={newGiftTargetId}
                                  onChange={(e) => setNewGiftTargetId(e.target.value)}
                                  disabled={isLocked || !t || giftSearchLoading || !giftSearchOptions.length}
                                >
                                  {(giftSearchOptions || []).map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                {!t ? (
                                  <div className="text-[11px] text-amber-600">
                                    Para buscar no inventário, use o link do dono (t) gerado na área do proprietário.
                                  </div>
                                ) : null}
                                {t && giftSearch && giftSearch.trim().length >= 2 && giftSearchLoading ? (
                                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Buscando...
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <select
                                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                                value={newGiftTargetId}
                                onChange={(e) => setNewGiftTargetId(e.target.value)}
                                disabled={isLocked || (newGiftScope === 'FACE' ? !faceOptions.length : !pointOptions.length)}
                              >
                                {(newGiftScope === 'FACE' ? faceOptions : pointOptions).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {giftTargetMode === 'ELIGIBLE' ? (
                              <div className="mt-2 text-[11px] text-gray-500">
                                Será exibido como:{' '}
                                <span className="font-semibold">
                                  {(() => {
                                    const base = newGiftScope === 'FACE' ? 'Qualquer face elegível' : 'Qualquer ponto elegível';
                                    const parts: string[] = [];
                                    const type = String(giftCriteriaType || '').trim().toUpperCase();
                                    const city = String(giftCriteriaCity || '').trim();
                                    const state = String(giftCriteriaState || '').trim().toUpperCase();
                                    if (type) parts.push(type);
                                    if (city || state) parts.push([city, state].filter(Boolean).join('/'));
                                    return parts.length ? `${base} • ${parts.join(' • ')}` : base;
                                  })()}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <div className="text-xs text-gray-500">Anos (0–10)</div>
                            <Input type="number" value={newGiftYears} onChange={(e) => setNewGiftYears(e.target.value)} placeholder="0" disabled={isLocked} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Meses (0–24)</div>
                            <Input type="number" value={newGiftMonths} onChange={(e) => setNewGiftMonths(e.target.value)} placeholder="0" disabled={isLocked} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Dias (0–31)</div>
                            <Input type="number" value={newGiftDays} onChange={(e) => setNewGiftDays(e.target.value)} placeholder="30" disabled={isLocked} />
                          </div>
                        </div>

                        <div className="mt-2">
                          <Button className="w-full" variant="outline" onClick={addGift} disabled={isLocked}>
                            Adicionar brinde
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          Resumo (preview)
                          {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : null}
                        </div>
                        {!isLocked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setPreviewNonce((n) => n + 1)}
                            disabled={isPreviewLoading}
                            title="Atualizar preview"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      {previewUpdatedAt ? (
                        <div className="mt-1 text-[11px] text-gray-500">Última atualização: {formatDateTimeBr(previewUpdatedAt)}</div>
                      ) : null}
                      {previewError ? <div className="mt-1 text-xs text-amber-600">{previewError}</div> : null}
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Base</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(previewTotals.base)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Serviços</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(previewTotals.services)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Custos de produção</div>
                          <div className="text-sm font-semibold text-gray-900">{formatMoneyBr(previewTotals.costs ?? 0)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Descontos</div>
                          <div className="text-sm font-semibold text-gray-900">- {formatMoneyBr(previewTotals.discount)}</div>
                          <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
                            {(previewTotals.breakdown?.servicesLineDiscount ?? 0) > 0 ? (
                              <div>Desconto em serviços: - {formatMoneyBr(previewTotals.breakdown?.servicesLineDiscount ?? 0)}</div>
                            ) : null}

                            {(previewTotals.breakdown?.costsLineDiscount ?? 0) > 0 ? (
                              <div>Desconto em custos: - {formatMoneyBr(previewTotals.breakdown?.costsLineDiscount ?? 0)}</div>
                            ) : null}

                            {(previewTotals.breakdown?.appliedDiscounts || []).map((d) => (
                              <div key={d.id} className="truncate">
                                {(d.label ||
                                  (d.scope === 'FACE'
                                    ? 'Face'
                                    : d.scope === 'POINT'
                                      ? 'Ponto'
                                      : 'Geral'))}
                                : - {formatMoneyBr(d.amount)}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2 rounded-xl border border-gray-200 px-3 py-2">
                          <div className="text-xs text-gray-500">Brindes (R$ 0)</div>
                          <div className="text-sm font-semibold text-gray-900">{(draft.gifts || []).length} item(ns)</div>
                          <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
                            {(draft.gifts || []).slice(0, 3).map((g) => (
                              <div key={g.id} className="truncate">
                                {(g.scope === 'FACE' ? 'Face' : 'Ponto')}: {g.label || g.targetId} • {formatPeriod(g.duration)}
                              </div>
                            ))}
                            {(draft.gifts || []).length > 3 ? (
                              <div className="text-[11px] text-gray-400">+{(draft.gifts || []).length - 3} outro(s)</div>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className="col-span-2 rounded-xl border border-gray-900 bg-gray-900 px-3 py-2"
                          style={{ backgroundColor: "#111827", color: "#ffffff" }}
                        >
                          <div className="text-xs text-gray-300">Total</div>
                          <div className="text-sm font-semibold text-white">{formatMoneyBr(previewTotals.total)}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button className="w-full gap-2" onClick={onSend} disabled={isLocked || isSending}>
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Enviar proposta (gera nova versão)
                        </Button>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                          <History className="h-3.5 w-3.5" />
                          Ao reenviar, criamos v1/v2/v3… sem perder histórico.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
