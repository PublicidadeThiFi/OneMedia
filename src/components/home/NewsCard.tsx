import { ArrowRight, CalendarDays, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { formatDateBR } from '../../lib/format';
import { getSafeNewsMediaUrl } from '../../lib/news-security';
import type { PublishedNewsListItem } from '../../types/news';

interface NewsCardProps {
  article: PublishedNewsListItem;
  onOpen?: (slug: string) => void;
}

export function NewsCard({ article, onOpen }: NewsCardProps) {
  const imageUrl = getSafeNewsMediaUrl(article.coverImageUrl);

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={article.coverImageAlt || article.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 text-slate-400">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>

      <CardHeader className="space-y-3 pb-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDateBR(article.publishedAt, 'Sem data')}
        </div>
        <CardTitle className="line-clamp-2 text-xl leading-tight text-slate-900">
          {article.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
          {article.summary || 'Confira a matéria completa para ver todos os detalhes desta atualização.'}
        </p>
      </CardContent>

      <CardFooter>
        <Button className="w-full rounded-xl" onClick={() => onOpen?.(article.slug)}>
          Ler matéria completa
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
