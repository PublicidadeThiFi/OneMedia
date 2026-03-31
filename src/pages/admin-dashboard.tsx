import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Eye,
  FilePenLine,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '../App';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { formatDateTimeBR } from '../lib/format';
import {
  archiveAdminNewsArticle,
  fetchAdminNewsArticles,
  publishAdminNewsArticle,
  restoreAdminNewsArticle,
  unpublishAdminNewsArticle,
  type AdminNewsListQuery,
} from '../services/admin-news';
import { NEWS_ARTICLE_STATUSES, type NewsArticleRecord, type NewsArticleStatus } from '../types/news';

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function StatusBadge({ status }: { status: NewsArticleStatus }) {
  const palette: Record<NewsArticleStatus, string> = {
    DRAFT: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    PUBLISHED: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    ARCHIVED: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${palette[status]}`}>{status}</span>;
}

export default function AdminDashboardPage() {
  const navigate = useNavigation();
  const { authReady, isAuthenticated, user, loading, logout } = useAdminAuth();
  const [items, setItems] = useState<NewsArticleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NewsArticleStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      navigate('/admin');
    }
  }, [authReady, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;

    let cancelled = false;
    const query: AdminNewsListQuery = {
      search: search.trim() || undefined,
      status: status || undefined,
      page,
      pageSize: 9,
    };

    setListLoading(true);
    fetchAdminNewsArticles(query)
      .then((response) => {
        if (cancelled) return;
        setItems(response.data);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(getErrorMessage(error, 'Não foi possível carregar as matérias administrativas.'));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, page, reloadKey, search, status]);

  const visibleStats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 } as Record<NewsArticleStatus, number>,
    );
  }, [items]);

  const refreshList = () => setReloadKey((current) => current + 1);

  const togglePublishState = async (item: NewsArticleRecord) => {
    setBusyId(item.id);
    try {
      const updated = item.status === 'PUBLISHED'
        ? await unpublishAdminNewsArticle(item.id)
        : await publishAdminNewsArticle(item.id);

      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success(item.status === 'PUBLISHED' ? 'Matéria voltou para rascunho.' : 'Matéria publicada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível alterar o status da matéria.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchiveState = async (item: NewsArticleRecord) => {
    setBusyId(item.id);
    try {
      const updated = item.status === 'ARCHIVED'
        ? await restoreAdminNewsArticle(item.id)
        : await archiveAdminNewsArticle(item.id);

      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success(item.status === 'ARCHIVED' ? 'Matéria restaurada como rascunho.' : 'Matéria arquivada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível alterar o arquivamento da matéria.'));
    } finally {
      setBusyId(null);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Verificando sessão administrativa...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <Shield className="h-4 w-4" />
              Admin autenticado
            </div>
            <h1 className="mt-4 text-3xl font-semibold">Painel administrativo da Página Principal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Sessão ativa para <strong>{user?.username}</strong>. O fluxo de matérias está completo: rascunho, publicação,
              arquivamento, leitura no app e editor por blocos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/materias/nova')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Nova matéria
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <LayoutDashboard className="h-8 w-8 text-blue-300" />
            <h2 className="mt-4 text-lg font-semibold">Módulo finalizado</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Estrutura, autenticação separada, editor em blocos, upload, leitura pública protegida e blindagem aplicados.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <FilePenLine className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-lg font-semibold">{total} matérias</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Total encontrado com o filtro atual. Abaixo você consegue editar, publicar, arquivar e revisar cada item.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Send className="h-8 w-8 text-violet-300" />
            <h2 className="mt-4 text-lg font-semibold">{visibleStats.PUBLISHED} publicadas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Este recorte mostra quantas matérias publicadas aparecem na página atual da listagem administrativa.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Archive className="h-8 w-8 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold">{visibleStats.ARCHIVED} arquivadas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              As arquivadas saem da Página Principal, mas continuam preservadas para restauração futura.
            </p>
          </article>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Buscar por título, slug ou resumo</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Digite para filtrar"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus((event.target.value as NewsArticleStatus | '') || '');
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Todos</option>
                {NEWS_ARTICLE_STATUSES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={refreshList}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => navigate('/admin/materias/nova')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <Plus className="h-4 w-4" />
                Nova matéria
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            {listLoading ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                Carregando matérias...
              </div>
            ) : null}

            {!listLoading && items.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                Nenhuma matéria encontrada com os filtros atuais.
              </div>
            ) : null}

            {!listLoading && items.map((item) => (
              <article key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-slate-500">Atualizado em {formatDateTimeBR(item.updatedAt)}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-300">
                  {item.summary || 'Sem resumo definido ainda.'}
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                  <p><span className="font-semibold text-slate-100">Slug:</span> {item.slug}</p>
                  <p className="mt-1"><span className="font-semibold text-slate-100">Publicado em:</span> {item.publishedAt ? formatDateTimeBR(item.publishedAt) : 'Não publicado'}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/materias/${item.id}/editar`)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <FilePenLine className="h-4 w-4" />
                    Editar
                  </button>

                  {item.status === 'PUBLISHED' ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/noticias/${encodeURIComponent(item.slug)}`)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"
                    >
                      <Eye className="h-4 w-4" />
                      Ver matéria
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void togglePublishState(item)}
                    disabled={busyId === item.id || item.status === 'ARCHIVED'}
                    className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {item.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleArchiveState(item)}
                    disabled={busyId === item.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-400/30 bg-slate-500/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-500/20 disabled:opacity-60"
                  >
                    {item.status === 'ARCHIVED' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {item.status === 'ARCHIVED' ? 'Restaurar' : 'Arquivar'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Página {page} de {totalPages}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
