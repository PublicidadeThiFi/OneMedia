import { useMemo, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { clearCart, formatDurationParts, readCart } from '../lib/menuCart';
import { publicApiClient } from '../lib/apiClient';
import { getMenuQueryParams, isAgencyFlow } from '../lib/menuFlow';

type CreateMenuRequestResponse = { requestId: string };

function buildQuery(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const val = String(v ?? '').trim();
    if (val) sp.set(k, val);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function isValidEmail(email: string): boolean {
  const e = String(email || '').trim();
  return /.+@.+\..+/.test(e);
}

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D+/g, '');
}

export default function MenuCheckout() {
  const navigate = useNavigation();

  const { token, uf, city, flow, ownerCompanyId } = useMemo(() => {
    const qp = getMenuQueryParams();
    return {
      token: qp.token,
      uf: qp.uf || '',
      city: qp.city || '',
      flow: qp.flow,
      ownerCompanyId: qp.ownerCompanyId,
    };
  }, []);

  const cart = useMemo(() => readCart(), []);

  const backUrl = useMemo(() => {
    return `/menu/carrinho${buildQuery({ token, uf, city, flow, ownerCompanyId })}`;
  }, [token, uf, city, flow, ownerCompanyId]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompanyName, setCustomerCompanyName] = useState('');
  const [customerCnpj, setCustomerCnpj] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const name = String(customerName || '').trim();
    const email = String(customerEmail || '').trim();
    const phoneDigits = normalizePhone(customerPhone);
    const t = String(token || '').trim();

    if (!t) {
      toast.error('Token ausente. Abra o Cardápio a partir do link compartilhado.');
      return;
    }
    if (!cart.items.length) {
      toast.error('Seu carrinho está vazio.');
      navigate(`/menu/pontos${buildQuery({ token: t, uf, city, flow, ownerCompanyId })}`);
      return;
    }
    if (!name) {
      toast.error('Informe seu nome.');
      return;
    }
    if (!phoneDigits || phoneDigits.length < 10) {
      toast.error('Informe um WhatsApp/telefone válido.');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = (await publicApiClient.post('/public/menu/request', {
        token: t,
        customerName: name,
        customerEmail: email,
        customerPhone: customerPhone,
        customerCompanyName: customerCompanyName || undefined,
        customerCnpj: customerCnpj || undefined,
        notes: notes || undefined,
        items: cart.items,
        uf: uf || undefined,
        city: city || undefined,
        flow,
        ownerCompanyId: ownerCompanyId || undefined,
      })) as { data?: Partial<CreateMenuRequestResponse> };

      const requestId = String(res?.data?.requestId || '').trim();
      if (!requestId) {
        throw new Error('Resposta inválida: requestId ausente.');
      }

      clearCart();
      toast.success('Solicitação enviada!');
      navigate(`/menu/enviado${buildQuery({ token: t, rid: requestId, uf, city, flow, ownerCompanyId })}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar solicitação.';
      toast.error('Não foi possível enviar', { description: String(msg) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart.items.length) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
            {isAgencyFlow(flow) && (
              <Badge variant="outline" className="rounded-full">Agência</Badge>
            )}
            <div className="text-sm text-gray-600">Checkout</div>

            <div className="ml-auto">
              <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          </div>

          <Card className="mt-5">
            <CardContent className="py-8">
              <div className="text-sm font-semibold text-gray-900">Seu carrinho está vazio</div>
              <div className="mt-1 text-sm text-gray-600">Volte para a lista de pontos e adicione itens.</div>
              <div className="mt-5">
                <Button onClick={() => navigate(`/menu/pontos${buildQuery({ token, uf, city, flow, ownerCompanyId })}`)}>
                  Ver pontos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full">Protótipo</Badge>
          <div className="text-sm text-gray-600">Checkout</div>

          <div className="ml-auto">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">Enviar solicitação de proposta</h1>
          <p className="mt-1 text-sm text-gray-600">
            Preencha seus dados e envie. O responsável receberá por e-mail automaticamente.
          </p>
        </div>

        <Card className="mt-5">
          <CardContent className="py-5">
            <div className="text-sm font-semibold text-gray-900">Resumo do carrinho</div>
            <div className="mt-2 space-y-2">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {it.snapshot?.pointName || 'Ponto'}
                      {it.snapshot?.unitLabel ? ` — ${it.snapshot.unitLabel}` : ''}
                    </div>
                    <div className="text-xs text-gray-600">
                      {it.snapshot?.city ? `${it.snapshot.city}` : ''}{it.snapshot?.state ? `/${it.snapshot.state}` : ''}
                      {it.snapshot?.addressLine ? ` • ${it.snapshot.addressLine}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-700">
                    <span className="font-semibold">{formatDurationParts(it.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="py-5">
            <div className="text-sm font-semibold text-gray-900">Seus dados</div>
            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp/Telefone *</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail *</Label>
                <Input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Empresa (opcional)</Label>
                <Input
                  value={customerCompanyName}
                  onChange={(e) => setCustomerCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input
                  value={customerCnpj}
                  onChange={(e) => setCustomerCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: preferência de bairros, datas desejadas, briefing, etc."
                  className="min-h-[110px]"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => navigate(backUrl)}>
                Voltar ao carrinho
              </Button>
              <Button onClick={onSubmit} disabled={isSubmitting} className="gap-2">
                <Mail className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
