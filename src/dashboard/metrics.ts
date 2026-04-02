export type WidgetQueryState = {
  status?: 'idle' | 'loading' | 'ready' | 'error' | string;
  source?: string;
  errorMessage?: string;
};

export type WidgetMetricsContext = {
  companyId?: string;
  tab?: string;
  backendQs?: string;
};

// Etapa 3: a camada de métricas por widget saiu do fluxo ativo do Dashboard.
// Mantemos apenas a assinatura do hook para compatibilidade temporária, sem efeitos colaterais.
export function useWidgetMetrics(_widgetKey: string, _q: WidgetQueryState, _ctx: WidgetMetricsContext) {
  return undefined;
}
