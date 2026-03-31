import { Button } from '../ui/button';
import { getSafeNewsHref, getSafeNewsMediaUrl, toSafeNewsInlineStyle } from '../../lib/news-security';
import type { NewsArticleBlock, NewsSourceItem } from '../../types/news';

function renderTextLines(text: string) {
  return text.split(/\n{2,}/).map((part, index) => {
    const lines = part.split('\n');
    return (
      <p key={index} className="leading-8">
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

function renderSources(items: NewsSourceItem[]) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">{item.label}</div>
          {item.note ? <div className="mt-1 text-slate-600">{item.note}</div> : null}
          {getSafeNewsHref(item.url) ? (
            <a
              href={getSafeNewsHref(item.url)!}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Abrir fonte
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface ArticleRendererProps {
  blocks: NewsArticleBlock[];
}

export function ArticleRenderer({ blocks }: ArticleRendererProps) {
  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        const style = toSafeNewsInlineStyle(block.style);

        switch (block.type) {
          case 'heading': {
            const HeadingTag = (`h${block.data.level || 1}` as 'h1' | 'h2' | 'h3');
            const className = block.data.level === 1
              ? 'text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl'
              : block.data.level === 2
                ? 'text-2xl font-semibold text-slate-950 md:text-3xl'
                : 'text-xl font-semibold text-slate-900 md:text-2xl';
            return <HeadingTag key={block.id} className={className} style={style}>{block.data.text}</HeadingTag>;
          }
          case 'subheading':
            return (
              <h3 key={block.id} className="text-xl font-medium text-slate-700 md:text-2xl" style={style}>
                {block.data.text}
              </h3>
            );
          case 'paragraph':
            return (
              <div key={block.id} className="space-y-5 text-base text-slate-700 md:text-lg" style={style}>
                {renderTextLines(block.data.text)}
              </div>
            );
          case 'image': {
            const imageUrl = getSafeNewsMediaUrl(block.data.url);
            return (
              <figure key={block.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white" style={style}>
                {imageUrl ? <img src={imageUrl} alt={block.data.alt || ''} className="w-full object-cover" /> : null}
                {block.data.caption ? <figcaption className="px-5 py-4 text-sm text-slate-500">{block.data.caption}</figcaption> : null}
              </figure>
            );
          }
          case 'gallery':
            return (
              <div key={block.id} className="grid gap-4 md:grid-cols-2" style={style}>
                {block.data.images.map((image, index) => {
                  const imageUrl = getSafeNewsMediaUrl(image.url);
                  return (
                    <figure key={`${block.id}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      {imageUrl ? <img src={imageUrl} alt={image.alt || ''} className="aspect-[16/10] w-full object-cover" /> : null}
                      {image.caption ? <figcaption className="px-4 py-3 text-sm text-slate-500">{image.caption}</figcaption> : null}
                    </figure>
                  );
                })}
              </div>
            );
          case 'quote':
            return (
              <blockquote key={block.id} className="rounded-3xl border-l-4 border-indigo-500 bg-indigo-50 px-6 py-5 text-lg italic text-slate-700" style={style}>
                <p>“{block.data.text}”</p>
                {block.data.author ? <footer className="mt-3 text-sm font-medium not-italic text-slate-500">— {block.data.author}</footer> : null}
              </blockquote>
            );
          case 'callout':
            return (
              <section key={block.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5" style={style}>
                {block.data.title ? <h4 className="mb-2 text-lg font-semibold text-slate-900">{block.data.title}</h4> : null}
                <div className="space-y-4 text-slate-700">{renderTextLines(block.data.text)}</div>
              </section>
            );
          case 'divider':
            return (
              <div
                key={block.id}
                className={block.data.spacing === 'lg' ? 'py-6' : block.data.spacing === 'sm' ? 'py-2' : 'py-4'}
              >
                <div className="h-px w-full bg-slate-200" style={style} />
              </div>
            );
          case 'source-list':
            return (
              <section key={block.id} className="space-y-4" style={style}>
                {block.data.title ? <h4 className="text-lg font-semibold text-slate-900">{block.data.title}</h4> : null}
                {renderSources(block.data.items)}
              </section>
            );
          case 'button':
            return (
              <div key={block.id} style={style}>
                {getSafeNewsHref(block.data.url) ? (
                  <Button asChild variant={block.data.variant === 'secondary' ? 'secondary' : block.data.variant === 'link' ? 'link' : 'default'}>
                    <a href={getSafeNewsHref(block.data.url)!} target={block.data.openInNewTab ? '_blank' : undefined} rel={block.data.openInNewTab ? 'noreferrer' : undefined}>
                      {block.data.label}
                    </a>
                  </Button>
                ) : (
                  <Button type="button" disabled variant={block.data.variant === 'secondary' ? 'secondary' : block.data.variant === 'link' ? 'link' : 'default'}>
                    {block.data.label}
                  </Button>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
