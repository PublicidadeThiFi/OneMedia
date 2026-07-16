import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketplacePagination as MarketplacePaginationData } from '../../types/marketplace';

type MarketplacePaginationProps = {
  pagination: MarketplacePaginationData;
  onPageChange: (page: number) => void;
};

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) {
      items.push(previous === 1 ? 'ellipsis-left' : 'ellipsis-right');
    }
    items.push(page);
  });
  return items;
}

export function MarketplacePagination({ pagination, onPageChange }: MarketplacePaginationProps) {
  if (pagination.totalPages <= 1) return null;
  const items = buildPageItems(pagination.page, pagination.totalPages);

  return (
    <nav className="marketplace-pagination" aria-label="Paginação dos pontos de mídia">
      <button
        type="button"
        className="marketplace-pagination__arrow"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={!pagination.hasPreviousPage}
        aria-label="Página anterior"
      >
        <ChevronLeft aria-hidden="true" />
      </button>

      {items.map((item) => {
        if (typeof item !== 'number') {
          return <span key={item} className="marketplace-pagination__ellipsis" aria-hidden="true">…</span>;
        }
        const current = item === pagination.page;
        return (
          <button
            type="button"
            key={item}
            className={`marketplace-pagination__page${current ? ' is-current' : ''}`}
            aria-current={current ? 'page' : undefined}
            aria-label={`Ir para a página ${item}`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className="marketplace-pagination__arrow"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={!pagination.hasNextPage}
        aria-label="Próxima página"
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
