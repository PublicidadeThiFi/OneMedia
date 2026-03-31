import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { fetchPublishedNewsArticleBySlug } from '../services/news';
import type { NewsArticleRecord } from '../types/news';
import { formatDateBR } from '../lib/format';
import { getSafeNewsHref, getSafeNewsMediaUrl } from '../lib/news-security';
import { Button } from '../components/ui/button';
import { ArticleRenderer } from '../components/news/ArticleRenderer';

interface NewsDetailPageProps {
  slug: string;
}

export default function NewsDetailPage({ slug }: NewsDetailPageProps) {
  const navigate = useNavigation();
  const { authReady, user } = useAuth();
  const [article, setArticle] = useState<NewsArticleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchPublishedNewsArticleBySlug(slug);
        if (!cancelled) {
          setArticle(response);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Não foi possível carregar a matéria.';
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
  }, [authReady, user, navigate, slug]);

  const coverImageUrl = useMemo(() => getSafeNewsMediaUrl(article?.coverImageUrl), [article?.coverImageUrl]);

  const copyLink = async () => {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      toast.success('Link da matéria copiado.');
    } catch {
      toast.error('Não foi possível copiar o link da matéria.');
    }
  };

  if (!authReady || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando matéria...
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/app/home')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Página Inicial
          </Button>

          <h1 className="text-2xl font-semibold text-slate-900">Matéria indisponível</h1>
          <p className="mt-3 text-slate-600">{error || 'Não foi possível localizar essa matéria.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 md:py-10">
      <article className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => navigate('/app/home')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Página Inicial
            </Button>
            <Button variant="outline" onClick={() => void copyLink()}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              <CalendarDays className="h-4 w-4" />
              {formatDateBR(article.publishedAt, 'Sem data de publicação')}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-slate-950 md:text-5xl">
                {article.title}
              </h1>
              {article.summary ? (
                <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                  {article.summary}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {coverImageUrl ? (
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <img src={coverImageUrl} alt={article.coverImageAlt || article.title} className="max-h-[520px] w-full object-cover" />
          </div>
        ) : null}

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <ArticleRenderer blocks={article.content} />

          {article.sources?.length ? (
            <section className="mt-10 space-y-4 border-t border-slate-200 pt-8">
              <h2 className="text-xl font-semibold text-slate-900">Fontes gerais da matéria</h2>
              <ul className="space-y-3">
                {article.sources.map((source, index) => (
                  <li key={`${source.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="font-medium text-slate-900">{source.label}</div>
                    {source.note ? <div className="mt-1 text-sm text-slate-600">{source.note}</div> : null}
                    {getSafeNewsHref(source.url) ? (
                      <a href={getSafeNewsHref(source.url)!} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
                        Abrir fonte
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
