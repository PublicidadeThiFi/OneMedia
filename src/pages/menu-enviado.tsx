import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle2, Copy, ArrowLeft, Activity, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getMenuCatalogQueryParams, getMenuEntryUrl } from '../lib/menuFlow';

export default function MenuEnviado() {
  const navigate = useNavigation();

  const query = useMemo(() => getMenuCatalogQueryParams(), []);
  const { token } = query;
  const { t, rid } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const acompanhamentoUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (t) {
      sp.set('t', t);
    } else if (token) {
      sp.set('token', token);
    }
    if (rid) sp.set('rid', rid);
    const qs = sp.toString();
    return `/menu/acompanhar${qs ? `?${qs}` : ''}`;
  }, [t, token, rid]);

  const fullAcompanhamentoUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${acompanhamentoUrl}`;
  }, [acompanhamentoUrl]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullAcompanhamentoUrl);
      setCopied(true);
      toast.success('Link copiado ✅');
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Não consegui copiar o link');
    }
  };

  const backToMenu = token ? getMenuEntryUrl(query) : '/menu';

  return (
    <div className="menu-app-shell">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-white/70 bg-white/85 px-3 text-slate-700 shadow-sm backdrop-blur">
            Cardápio
          </Badge>
          <div className="text-sm text-slate-600">Pedido enviado</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2 rounded-2xl text-slate-700" onClick={() => navigate(backToMenu)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao cardápio
            </Button>
          </div>
        </div>

        <Card className="menu-glass-card mt-5 overflow-hidden rounded-[32px]">
          <CardContent className="p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tudo certo com o envio
                </div>
                <h1 className="menu-soft-title mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Pedido enviado com sucesso. Agora é só acompanhar o andamento por aqui.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  O responsável já recebeu seu pedido. Assim que a proposta for montada, este mesmo link passa a mostrar o andamento e os próximos passos do fluxo.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="menu-muted-panel rounded-[24px] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Próximo passo</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">Acompanhe o status e abra a proposta assim que ela estiver disponível.</div>
                  </div>
                  <div className="menu-muted-panel rounded-[24px] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Link de acompanhamento</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">Guarde este link. Ele é o jeito mais fácil de voltar depois.</div>
                  </div>
                </div>

                {rid && (
                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Request ID</div>
                    <div className="menu-copy-wrap mt-2 font-mono text-sm text-slate-800">{rid}</div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button className="gap-2 rounded-2xl px-5" onClick={() => navigate(acompanhamentoUrl)}>
                    <Activity className="h-4 w-4" />
                    Acompanhar andamento
                  </Button>

                  <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white px-5" onClick={onCopy}>
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado!' : 'Copiar link pra acompanhar'}
                  </Button>
                </div>
              </div>

              <Card className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
                <CardContent className="space-y-4 p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60">Resumo rápido</div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Sparkles className="h-4 w-4 text-indigo-200" />
                      O que fazer agora
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-white/75">
                      <div>• Abra o acompanhamento para ver o status.</div>
                      <div>• Guarde o link para acessar mais tarde.</div>
                      <div>• Quando a proposta chegar, você pode aprovar ou pedir revisão.</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Link2 className="h-4 w-4 text-indigo-200" />
                      Link pronto para uso
                    </div>
                    <div className="menu-copy-wrap mt-3 text-xs leading-6 text-white/70">{fullAcompanhamentoUrl}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
