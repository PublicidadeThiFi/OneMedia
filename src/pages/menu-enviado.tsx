import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Activity, ArrowLeft, CheckCircle2, Copy, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export default function MenuEnviado() {
  const navigate = useNavigation();

  const { token, t, rid, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || '',
      t: sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
      uf: String(sp.get('uf') || '').trim().toUpperCase(),
      city: String(sp.get('city') || '').trim(),
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const authQuery = useMemo(() => (t ? { t, rid } : { token, rid }), [t, token, rid]);

  const acompanhamentoUrl = useMemo(() => {
    return `/menu/acompanhar${buildQuery(authQuery)}`;
  }, [authQuery]);

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

  const backToMenu = token ? `/menu/pontos${buildQuery({ token, uf, city })}` : '/menu';

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eef2ff_28%,#f8fafc_60%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="mt-5 overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_22px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pedido recebido
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Seu pedido foi enviado. Agora o fluxo continua com acompanhamento claro e organizado.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                O responsável já recebeu os itens selecionados. Quando a proposta estiver pronta, você consegue ver,
                comparar e tomar a decisão pelo mesmo link.
              </p>

              <Card className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 ring-1 ring-emerald-100">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-950">Tudo certo por aqui</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Guarde o link de acompanhamento. É por ele que você acompanha status, abre a proposta e decide os próximos passos.
                      </div>
                    </div>
                  </div>

                  {rid ? (
                    <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Request ID</div>
                      <div className="mt-2 break-all font-mono text-sm text-slate-900">{rid}</div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button className="h-11 gap-2 rounded-2xl" onClick={() => navigate(acompanhamentoUrl)}>
                      <Activity className="h-4 w-4" />
                      Acompanhar andamento
                    </Button>

                    <Button variant="outline" className="h-11 gap-2 rounded-2xl" onClick={onCopy}>
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copiado!' : 'Copiar link pra acompanhar'}
                    </Button>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    <span className="font-semibold">Dica:</span> salve esse link. Ele é o jeito mais fácil de acompanhar o status da proposta.
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <Card className="rounded-[28px] border border-slate-900/0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-none">
                <CardContent className="p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/60">Próximos passos</div>
                  <div className="mt-4 space-y-3">
                    {[
                      'O responsável recebe o pedido com os itens e observações.',
                      'Quando a proposta estiver pronta, o link de acompanhamento mostra o novo status.',
                      'Você consegue revisar, pedir ajustes ou aprovar no mesmo fluxo.',
                    ].map((text, index) => (
                      <div key={text} className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
                            {index + 1}
                          </div>
                          <div className="text-sm leading-6 text-white/80">{text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/10 p-4 text-sm leading-6 text-white/75">
                    O fluxo continua no mesmo ambiente, sem precisar procurar e-mails ou repetir o pedido.
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border border-slate-200/80 bg-white/90 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-indigo-50 p-2 ring-1 ring-indigo-100">
                      <Link2 className="h-4 w-4 text-indigo-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Link de acompanhamento</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Você pode abrir agora ou guardar para depois. O link continua sendo a sua referência principal nesse pedido.
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 h-11 w-full gap-2 rounded-2xl" onClick={onCopy}>
                    <Sparkles className="h-4 w-4" />
                    {copied ? 'Link copiado!' : 'Copiar link agora'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
