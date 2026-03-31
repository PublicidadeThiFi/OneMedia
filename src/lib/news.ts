import type {
  NewsArticleBlock,
  NewsArticleUpsertInput,
  NewsBlockType,
} from '../types/news';

function createBlockId(): string {
  return `news_block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultNewsBlock(type: NewsBlockType): NewsArticleBlock {
  const id = createBlockId();

  switch (type) {
    case 'heading':
      return { id, type, data: { text: '', level: 1 } };
    case 'subheading':
      return { id, type, data: { text: '' } };
    case 'paragraph':
      return { id, type, data: { text: '' } };
    case 'image':
      return { id, type, data: { url: '', alt: '', caption: '' } };
    case 'gallery':
      return { id, type, data: { images: [] } };
    case 'quote':
      return { id, type, data: { text: '', author: '' } };
    case 'callout':
      return { id, type, data: { title: '', text: '', tone: 'info' } };
    case 'divider':
      return { id, type, data: { spacing: 'md' } };
    case 'source-list':
      return { id, type, data: { title: 'Fontes', items: [] } };
    case 'button':
      return { id, type, data: { label: '', url: '', variant: 'primary', openInNewTab: true } };
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Tipo de bloco não suportado: ${exhaustiveCheck}`);
    }
  }
}

export function createEmptyNewsDraft(): NewsArticleUpsertInput {
  return {
    title: '',
    slug: '',
    summary: '',
    coverImageUrl: '',
    coverImageAlt: '',
    status: 'DRAFT',
    content: [],
    sources: [],
    publishedAt: null,
  };
}
