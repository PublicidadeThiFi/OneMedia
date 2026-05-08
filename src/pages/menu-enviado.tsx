import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle2, Copy, ArrowLeft, Activity, Link2, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getMenuCatalogQueryParams, getMenuEntryUrl } from '../lib/menuFlow';
import '../components/menu/catalog/menuCatalogTheme.css';

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
    <div className="menu-catalog-screen">
      <div className="menu-catalog-frame menu-flow-frame menu-sent-frame">
        <div className="menu-cart-topbar menu-flow-topbar">
          <div className="menu-catalog-breadcrumb">
            <span>Cardápio</span>
            <ChevronRight className="h-4 w-4" />
            <strong>Pedido enviado</strong>
            <Badge className="menu-cart-pill">Fluxo do cliente</Badge>
          </div>
          <Button variant="ghost" className="menu-cart-back-button" onClick={() => navigate(backToMenu)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao cardápio
          </Button>
        </div>

        <section className="menu-catalog-actions-card menu-flow-intro-card menu-sent-hero-card">
          <div className="menu-sent-hero-main">
            <div className="menu-cart-kicker">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pedido enviado com sucesso
            </div>
            <h1 className="menu-sent-hero-title">Seu pedido entrou no fluxo e agora o acompanhamento acontece pelo mesmo padrão do cardápio.</h1>
            <p className="menu-sent-hero-copy">
              O responsável já recebeu sua solicitação. A partir daqui, este link concentra o andamento, a chegada da proposta e os próximos passos até a aprovação.
            </p>
            <div className="menu-sent-hero-actions">
              <Button className="menu-cart-primary-button gap-2" onClick={() => navigate(acompanhamentoUrl)}>
                <Activity className="h-4 w-4" />
                Acompanhar andamento
              </Button>
              <Button variant="outline" className="menu-cart-secondary-button gap-2" onClick={onCopy}>
                <Copy className="h-4 w-4" />
                {copied ? 'Copiado!' : 'Copiar link'}
              </Button>
            </div>
          </div>

          <div className="menu-sent-hero-summary">
            {[
              ['Status', 'Enviado'],
              ['Acesso', 'Link único'],
              ['Próximo passo', 'Acompanhar'],
            ].map(([label, value]) => (
              <div key={label} className="menu-cart-stat-box">
                <span className="menu-cart-stat-value menu-sent-stat-value">{value}</span>
                <span className="menu-cart-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="menu-sent-layout menu-flow-layout menu-flow-layout--split">
          <div className="menu-sent-main-column menu-flow-main-column">
            <Card className="menu-catalog-actions-card menu-flow-shell-card menu-sent-main-card">
              <CardContent className="menu-flow-shell-body menu-sent-main-content">
                <div className="menu-sent-section-head">
                  <div>
                    <div className="menu-cart-section-title">
                      <Sparkles className="h-4 w-4" />
                      O que acontece agora
                    </div>
                    <p className="menu-cart-section-copy">
                      O link abaixo acompanha o mesmo fluxo do cardápio: status do pedido, proposta disponível e eventual solicitação de revisão.
                    </p>
                  </div>
                  <Badge variant="secondary" className="menu-sent-soft-badge">
                    Jornada contínua
                  </Badge>
                </div>

                <div className="menu-sent-grid">
                  <div className="menu-cart-input-card menu-sent-info-card">
                    <span>Próximo passo</span>
                    <strong>Abrir o acompanhamento sempre que quiser ver novidades no pedido.</strong>
                    <p>Quando a proposta for publicada, é por lá que você aprova ou pede revisão.</p>
                  </div>
                  <div className="menu-cart-input-card menu-sent-info-card">
                    <span>Guardar este acesso</span>
                    <strong>Use o link de acompanhamento para voltar depois sem depender de outro envio.</strong>
                    <p>Ele centraliza o andamento e os próximos passos do fluxo.</p>
                  </div>
                </div>

                {rid ? (
                  <div className="menu-sent-request-box">
                    <div className="menu-cart-panel-label">Request ID</div>
                    <div className="menu-copy-wrap menu-sent-request-value">{rid}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="menu-sent-sidebar menu-flow-sidebar">
            <Card className="menu-cart-summary-card menu-flow-shell-card menu-sent-summary-card">
              <CardContent className="menu-flow-shell-body menu-sent-summary-content">
                <div className="menu-cart-side-title-dark">
                  <Link2 className="h-4 w-4" />
                  Link de acompanhamento
                </div>
                <p className="menu-cart-summary-copy">
                  Este é o link que mantém você dentro do fluxo até a proposta final.
                </p>
                <div className="menu-sent-link-box menu-copy-wrap">{fullAcompanhamentoUrl}</div>
                <div className="menu-sent-summary-actions">
                  <Button className="menu-cart-primary-button-full gap-2" onClick={() => navigate(acompanhamentoUrl)}>
                    <Activity className="h-4 w-4" />
                    Abrir acompanhamento
                  </Button>
                  <Button variant="outline" className="menu-cart-secondary-button-full gap-2" onClick={onCopy}>
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado!' : 'Copiar link'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
