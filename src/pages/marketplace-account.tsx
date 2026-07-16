import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageCircle,
  RefreshCw,
  Save,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarketplaceConversationInbox } from '../components/marketplace/MarketplaceConversationInbox';
import { MarketplaceProtectedRoute } from '../components/marketplace/MarketplaceProtectedRoute';
import { MarketplaceShell } from '../components/marketplace/MarketplaceShell';
import { useMarketplaceAuth } from '../contexts/MarketplaceAuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import {
  cancelMarketplaceCustomerInquiry,
  fetchMarketplaceCustomerInquiries,
} from '../lib/marketplaceAccountApi';
import { getApiError } from '../lib/getApiError';
import type { MarketplaceCustomerInquiry } from '../types/marketplace';

type MarketplaceAccountPageProps = {
  section: 'solicitacoes' | 'mensagens' | 'perfil';
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));

function AccountNavigation({ section }: MarketplaceAccountPageProps) {
  const navigate = useNavigation();
  return (
    <nav className="marketplace-account-nav" aria-label="Área do anunciante">
      <button className={section === 'solicitacoes' ? 'is-active' : ''} type="button" onClick={() => navigate('/marketplace/solicitacoes')}><Inbox aria-hidden="true" /> Solicitações</button>
      <button className={section === 'mensagens' ? 'is-active' : ''} type="button" onClick={() => navigate('/marketplace/mensagens')}><MessageCircle aria-hidden="true" /> Mensagens</button>
      <button className={section === 'perfil' ? 'is-active' : ''} type="button" onClick={() => navigate('/marketplace/perfil')}><UserRound aria-hidden="true" /> Perfil</button>
    </nav>
  );
}

function InquiryCard({ item, onCancel }: { item: MarketplaceCustomerInquiry; onCancel: (id: string) => Promise<void> }) {
  const navigate = useNavigation();
  const canCancel = ['SUBMITTED', 'UNDER_REVIEW', 'CONTACTED'].includes(item.status);
  const [canceling, setCanceling] = useState(false);
  return (
    <article className="marketplace-inquiry-card">
      <div className="marketplace-inquiry-card__cover">
        {item.point.coverUrl ? <img src={item.point.coverUrl} alt="" loading="lazy" /> : <MapPin aria-hidden="true" />}
      </div>
      <div className="marketplace-inquiry-card__body">
        <div className="marketplace-inquiry-card__topline">
          <div>
            <span>{item.company.name || 'Responsável pelo ponto'}</span>
            <h3>{item.point.name}</h3>
          </div>
          <strong className={`marketplace-inquiry-status marketplace-inquiry-status--${item.status.toLowerCase()}`}>{item.statusLabel}</strong>
        </div>
        <p><MapPin aria-hidden="true" /> {[item.point.city, item.point.state].filter(Boolean).join(' — ') || 'Localização sob consulta'}</p>
        <p><CalendarDays aria-hidden="true" /> {formatDate(item.startDate)} a {formatDate(item.endDate)} · {item.campaignType === 'BIWEEKLY' ? 'Bisemanal' : item.campaignType === 'MONTHLY' ? 'Mensal' : 'Sob consulta'}</p>
        <div className="marketplace-inquiry-card__actions">
          {item.point.slug ? <button type="button" onClick={() => navigate(`/pontos/${encodeURIComponent(item.point.slug!)}`)}>Ver ponto</button> : null}
          {item.conversation ? <button type="button" onClick={() => navigate(`/marketplace/mensagens?conversation=${encodeURIComponent(item.conversation!.id)}`)}>Abrir conversa</button> : null}
          {canCancel ? <button type="button" className="is-danger" disabled={canceling} onClick={async () => { setCanceling(true); try { await onCancel(item.id); } finally { setCanceling(false); } }}>{canceling ? 'Cancelando…' : 'Cancelar solicitação'}</button> : null}
        </div>
      </div>
    </article>
  );
}

function RequestsSection() {
  const [items, setItems] = useState<MarketplaceCustomerInquiry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchMarketplaceCustomerInquiries({ page, pageSize: 10 }, controller.signal)
      .then((response) => {
        setItems(response.items);
        setTotalPages(response.pagination.totalPages);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(getApiError(requestError, 'Não foi possível carregar suas solicitações.').message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, version]);

  const cancel = async (id: string) => {
    try {
      await cancelMarketplaceCustomerInquiry(id);
      toast.success('Solicitação cancelada.');
      setVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(getApiError(requestError, 'Não foi possível cancelar a solicitação.').message);
    }
  };

  if (loading) return <div className="marketplace-account-state"><LoaderCircle className="is-spinning" aria-hidden="true" /><p>Carregando solicitações…</p></div>;
  if (error) return <div className="marketplace-account-state marketplace-account-state--error"><XCircle aria-hidden="true" /><p>{error}</p><button type="button" onClick={() => setVersion((value) => value + 1)}><RefreshCw aria-hidden="true" /> Tentar novamente</button></div>;
  if (!items.length) return <div className="marketplace-account-state"><Inbox aria-hidden="true" /><h2>Nenhuma solicitação ainda</h2><p>Explore os pontos e escolha um período para iniciar sua campanha.</p></div>;

  return (
    <div>
      <div className="marketplace-inquiry-list">{items.map((item) => <InquiryCard key={item.id} item={item} onCancel={cancel} />)}</div>
      {totalPages > 1 ? <div className="marketplace-account-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft aria-hidden="true" /> Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima <ChevronRight aria-hidden="true" /></button></div> : null}
    </div>
  );
}

function MessagesSection() {
  return <MarketplaceConversationInbox />;
}

function ProfileSection() {
  const navigate = useNavigation();
  const { account, updateProfile, logout } = useMarketplaceAuth();
  const initial = useMemo(() => ({ name: account?.name || '', phone: account?.phone || '' }), [account]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => setForm(initial), [initial]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível atualizar seu perfil.').message);
    } finally {
      setSaving(false);
    }
  };

  const leave = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/marketplace/entrar');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="marketplace-profile-grid">
      <form className="marketplace-profile-card" onSubmit={submit}>
        <span>Dados básicos</span>
        <h2>Seu perfil de anunciante</h2>
        <label><span>Nome</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={120} required /></label>
        <label><span>E-mail</span><input value={account?.email || ''} disabled /><small>Para alterar o e-mail, entre em contato com o suporte.</small></label>
        <label><span>Telefone</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} maxLength={24} required /></label>
        <button className="marketplace-button marketplace-button--primary" type="submit" disabled={saving}><Save aria-hidden="true" /> {saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </form>
      <aside className="marketplace-profile-card marketplace-profile-card--security">
        <span>Segurança</span>
        <h2>Acesso à conta</h2>
        <p>Sua conta usa sessão independente do painel empresarial. A redefinição de senha encerra sessões anteriores.</p>
        <button type="button" onClick={() => navigate(`/marketplace/esqueci-senha?returnUrl=${encodeURIComponent('/marketplace/perfil')}`)}>Redefinir minha senha</button>
        <button type="button" className="is-danger" disabled={loggingOut} onClick={leave}><LogOut aria-hidden="true" /> {loggingOut ? 'Saindo…' : 'Sair da conta'}</button>
      </aside>
    </div>
  );
}

export default function MarketplaceAccountPage({ section }: MarketplaceAccountPageProps) {
  const { account } = useMarketplaceAuth();
  const titles = { solicitacoes: 'Suas solicitações', mensagens: 'Suas conversas', perfil: 'Seu perfil' } as const;
  return (
    <MarketplaceShell pageTitle={titles[section]}>
      <MarketplaceProtectedRoute>
        <section className="marketplace-account-page">
          <div className="marketplace-container">
            <header className="marketplace-account-header">
              <div><span>Área do anunciante</span><h1>{titles[section]}</h1><p>Olá, {account?.name?.split(' ')[0] || 'anunciante'}. Acompanhe seus contatos com os responsáveis pelos pontos.</p></div>
              <div className="marketplace-account-header__counts"><strong>{account?.counts?.inquiries || 0}</strong><span>solicitações</span></div>
            </header>
            <AccountNavigation section={section} />
            <div className="marketplace-account-content">
              {section === 'solicitacoes' ? <RequestsSection /> : section === 'mensagens' ? <MessagesSection /> : <ProfileSection />}
            </div>
          </div>
        </section>
      </MarketplaceProtectedRoute>
    </MarketplaceShell>
  );
}
