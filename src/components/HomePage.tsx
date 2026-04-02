import { useEffect, useMemo, useState } from 'react';
import { Newspaper, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useNavigation } from '../contexts/NavigationContext';
import { fetchPublishedNews } from '../services/news';
import type { PublishedNewsListItem } from '../types/news';
import { NewsGrid } from './home/NewsGrid';

export function HomePage() {
  const navigate = useNavigation();
  const [articles, setArticles] = useState<PublishedNewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchPublishedNews({
          page,
          pageSize: 9,
          search: search.trim() || undefined,
        });
        if (!cancelled) {
          setArticles(response.data);
          setTotalPages(response.totalPages);
          setTotal(response.total);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Não foi possível carregar as notícias.';
        if (!cancelled) {
          setError(Array.isArray(message) ? message[0] : message);
        }
        toast.error(Array.isArray(message) ? message[0] : message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey, search]);

  const openArticle = (slug: string) => navigate(`/noticias/${encodeURIComponent(slug)}`);
  const hasResults = useMemo(() => articles.length > 0, [articles]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2" data-tour="home-welcome">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          <Sparkles className="h-4 w-4" />
          Página Inicial
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Central de notícias da plataforma</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 md:text-base">
            Acompanhe novidades, comunicados e conteúdos importantes publicados pela equipe da OneMedia.
          </p>
        </div>
      </div>

      <Card className="border-indigo-100 bg-white/95 shadow-sm" data-tour="home-news-center">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Newspaper className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Últimas matérias publicadas</CardTitle>
                <p className="mt-1 text-sm text-gray-500">Conteúdos publicados no admin já disponíveis para leitura no app.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[420px]" data-tour="home-news-controls">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Buscar por título, slug ou resumo"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <Button variant="outline" onClick={() => setReloadKey((current) => current + 1)}>
                Atualizar notícias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-3xl border border-slate-200 p-4">
                  <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-7 w-full rounded-xl" />
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-5/6 rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
              <p className="font-medium">Não foi possível carregar a central de notícias.</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : !hasResults ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center" data-tour="home-get-started">
              <p className="text-lg font-medium text-gray-900">
                {search.trim() ? 'Nenhuma matéria corresponde à busca atual' : 'Ainda não há matérias publicadas'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {search.trim()
                  ? 'Tente ajustar o termo pesquisado para encontrar outras matérias.'
                  : 'Assim que a equipe publicar uma nova matéria no admin, ela aparecerá aqui.'}
              </p>
            </div>
          ) : (
            <>
              <div data-tour="home-news-list">
                <NewsGrid items={articles} onOpen={openArticle} />
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{total} matéria(s) encontrada(s). Página {page} de {totalPages}.</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
