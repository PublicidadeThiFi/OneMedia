import type { PublishedNewsListItem } from '../../types/news';
import { NewsCard } from './NewsCard';

interface NewsGridProps {
  items: PublishedNewsListItem[];
  onOpen?: (slug: string) => void;
}

export function NewsGrid({ items, onOpen }: NewsGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((article) => (
        <NewsCard key={article.id} article={article} onOpen={onOpen} />
      ))}
    </div>
  );
}
