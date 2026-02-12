import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle2, Copy, ArrowLeft, Activity } from 'lucide-react';
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

  const { token, rid, uf, city } = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token: sp.get('token') || sp.get('t') || '',
      rid: sp.get('rid') || sp.get('requestId') || '',
      uf: String(sp.get('uf') || '').trim().toUpperCase(),
      city: String(sp.get('city') || '').trim(),
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const acompanhamentoUrl = useMemo(() => {
    return `/menu/acompanhar${buildQuery({ token, rid })}`;
  }, [token, rid]);

  const fullAcompanhamentoUrl = useMemo(() => {
    // Best effort: use current origin to copy a fully qualified URL
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${acompanhamentoUrl}`;
  }, [acompanhamentoUrl]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullAcompanhamentoUrl);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const backToMenu = `/menu/pontos${buildQuery({ token, uf, city })}`;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Confirmação</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backToMenu)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao cardápio
            </Button>
          </div>
        </div>

        <Card className="mt-5">
          <CardContent className="py-8">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Solicitação enviada</h1>
                <p className="mt-1 text-sm text-gray-600">
                  O responsável já recebeu sua solicitação por e-mail. Assim que responder, você segue com a proposta.
                </p>

                {rid && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-xs text-gray-500">Request ID</div>
                    <div className="mt-1 font-mono text-sm text-gray-800 break-all">{rid}</div>
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button className="gap-2" onClick={() => navigate(acompanhamentoUrl)}>
                    <Activity className="h-4 w-4" />
                    Acompanhar proposta
                  </Button>

                  <Button variant="outline" className="gap-2" onClick={onCopy}>
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado!' : 'Copiar link de acompanhamento'}
                  </Button>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                  * Nesta etapa do protótipo, o acompanhamento mostra o status básico do envio.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
