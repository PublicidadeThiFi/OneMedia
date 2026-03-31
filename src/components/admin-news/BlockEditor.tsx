import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { getSafeNewsMediaUrl } from '../../lib/news-security';
import {
  NEWS_BUTTON_VARIANTS,
  NEWS_CALLOUT_TONES,
  NEWS_DIVIDER_SPACINGS,
  NEWS_HEADING_LEVELS,
  NEWS_TEXT_ALIGNMENTS,
  type NewsArticleBlock,
  type NewsImageItem,
  type NewsSourceItem,
} from '../../types/news';

interface BlockEditorUploadParams {
  file: File;
  blockId: string;
  imageIndex?: number;
  kind: 'content' | 'gallery';
}

interface BlockEditorProps {
  block: NewsArticleBlock;
  index: number;
  total: number;
  onChange: (nextBlock: NewsArticleBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUploadImage?: (params: BlockEditorUploadParams) => Promise<void>;
  uploadingTargetKey?: string | null;
}

function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 ${props.className ?? ''}`}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 ${props.className ?? ''}`}
    />
  );
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 ${props.className ?? ''}`}
    />
  );
}

function updateStyle(block: NewsArticleBlock, patch: Partial<NonNullable<NewsArticleBlock['style']>>): NewsArticleBlock {
  return {
    ...block,
    style: {
      ...(block.style ?? {}),
      ...patch,
    },
  };
}

function SourceItemFields({
  item,
  onChange,
  onRemove,
}: {
  item: NewsSourceItem;
  onChange: (nextItem: NewsSourceItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <CardField label="Rótulo">
          <Input value={item.label} onChange={(event) => onChange({ ...item, label: event.target.value })} placeholder="Fonte oficial" />
        </CardField>
        <CardField label="URL">
          <Input value={item.url ?? ''} onChange={(event) => onChange({ ...item, url: event.target.value })} placeholder="https://..." />
        </CardField>
      </div>
      <div className="mt-3">
        <CardField label="Nota">
          <Textarea
            value={item.note ?? ''}
            onChange={(event) => onChange({ ...item, note: event.target.value })}
            className="min-h-[90px]"
            placeholder="Observação opcional"
          />
        </CardField>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
        >
          Remover item
        </button>
      </div>
    </div>
  );
}

function ImageItemFields({
  item,
  onChange,
  onRemove,
  onUploadFile,
  uploading,
}: {
  item: NewsImageItem;
  onChange: (nextItem: NewsImageItem) => void;
  onRemove: () => void;
  onUploadFile?: (file: File) => void;
  uploading?: boolean;
}) {
  const inputId = useId();
  const previewUrl = getSafeNewsMediaUrl(item.url) ?? '';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      {previewUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
          <img src={previewUrl} alt={item.alt ?? 'Prévia da imagem'} className="h-48 w-full object-cover" />
        </div>
      ) : (
        <div className="mb-4 flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 text-sm text-slate-500">
          Nenhuma imagem definida ainda
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <CardField label="URL da imagem">
          <Input value={item.url} onChange={(event) => onChange({ ...item, url: event.target.value })} placeholder="https://..." />
        </CardField>
        <CardField label="Texto alternativo">
          <Input value={item.alt ?? ''} onChange={(event) => onChange({ ...item, alt: event.target.value })} placeholder="Descrição da imagem" />
        </CardField>
      </div>
      <div className="mt-3">
        <CardField label="Legenda">
          <Textarea
            value={item.caption ?? ''}
            onChange={(event) => onChange({ ...item, caption: event.target.value })}
            className="min-h-[90px]"
            placeholder="Legenda opcional"
          />
        </CardField>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {onUploadFile ? (
          <>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = '';
                if (file) onUploadFile(file);
              }}
            />
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-xs font-semibold transition ${uploading ? 'border-blue-400/30 bg-blue-500/10 text-blue-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}
            >
              {uploading ? 'Enviando imagem...' : 'Enviar arquivo'}
            </label>
          </>
        ) : <span />}
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
        >
          Remover imagem
        </button>
      </div>
    </div>
  );
}

export function BlockEditor({ block, index, total, onChange, onRemove, onMoveUp, onMoveDown, onUploadImage, uploadingTargetKey }: BlockEditorProps) {
  const updateData = (patch: Record<string, unknown>) => {
    onChange({
      ...block,
      data: {
        ...(block.data as Record<string, unknown>),
        ...patch,
      } as NewsArticleBlock['data'],
    } as NewsArticleBlock);
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Bloco {index + 1}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{block.type}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Subir</button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Descer</button>
          <button type="button" onClick={onRemove} className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">Excluir</button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {block.type === 'heading' ? (
          <>
            <CardField label="Texto do título">
              <Textarea
                value={block.data.text}
                onChange={(event) => updateData({ text: event.target.value })}
                className="min-h-[100px]"
              />
            </CardField>
            <CardField label="Nível do título">
              <Select
                value={String(block.data.level ?? 1)}
                onChange={(event) => updateData({ level: Number(event.target.value) })}
              >
                {NEWS_HEADING_LEVELS.map((level) => (
                  <option key={level} value={level}>H{level}</option>
                ))}
              </Select>
            </CardField>
          </>
        ) : null}

        {block.type === 'subheading' || block.type === 'paragraph' ? (
          <CardField label="Texto">
            <Textarea value={block.data.text} onChange={(event) => updateData({ text: event.target.value })} />
          </CardField>
        ) : null}

        {block.type === 'image' ? (
          <ImageItemFields
            item={block.data}
            onChange={(nextItem) => onChange({ ...block, data: nextItem })}
            onRemove={() => onChange({ ...block, data: { url: '', alt: '', caption: '' } })}
            onUploadFile={onUploadImage ? (file) => onUploadImage({ file, blockId: block.id, kind: 'content' }) : undefined}
            uploading={uploadingTargetKey === `image:${block.id}`}
          />
        ) : null}

        {block.type === 'gallery' ? (
          <div className="space-y-3">
            {(block.data.images ?? []).map((item, imageIndex) => (
              <ImageItemFields
                key={`${block.id}_gallery_${imageIndex}`}
                item={item}
                onChange={(nextItem) => {
                  const nextImages = [...block.data.images];
                  nextImages[imageIndex] = nextItem;
                  updateData({ images: nextImages });
                }}
                onRemove={() => {
                  const nextImages = block.data.images.filter((_, currentIndex) => currentIndex !== imageIndex);
                  updateData({ images: nextImages });
                }}
                onUploadFile={onUploadImage ? (file) => onUploadImage({ file, blockId: block.id, imageIndex, kind: 'gallery' }) : undefined}
                uploading={uploadingTargetKey === `gallery:${block.id}:${imageIndex}`}
              />
            ))}
            <button
              type="button"
              onClick={() => updateData({ images: [...block.data.images, { url: '', alt: '', caption: '' }] })}
              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200"
            >
              Adicionar imagem à galeria
            </button>
          </div>
        ) : null}

        {block.type === 'quote' ? (
          <>
            <CardField label="Texto da citação">
              <Textarea value={block.data.text} onChange={(event) => updateData({ text: event.target.value })} />
            </CardField>
            <CardField label="Autor">
              <Input value={block.data.author ?? ''} onChange={(event) => updateData({ author: event.target.value })} />
            </CardField>
          </>
        ) : null}

        {block.type === 'callout' ? (
          <>
            <CardField label="Título opcional">
              <Input value={block.data.title ?? ''} onChange={(event) => updateData({ title: event.target.value })} />
            </CardField>
            <CardField label="Texto do destaque">
              <Textarea value={block.data.text} onChange={(event) => updateData({ text: event.target.value })} />
            </CardField>
            <CardField label="Tom">
              <Select value={block.data.tone ?? 'neutral'} onChange={(event) => updateData({ tone: event.target.value })}>
                {NEWS_CALLOUT_TONES.map((tone) => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </Select>
            </CardField>
          </>
        ) : null}

        {block.type === 'divider' ? (
          <CardField label="Espaçamento">
            <Select value={block.data.spacing ?? 'md'} onChange={(event) => updateData({ spacing: event.target.value })}>
              {NEWS_DIVIDER_SPACINGS.map((spacing) => (
                <option key={spacing} value={spacing}>{spacing}</option>
              ))}
            </Select>
          </CardField>
        ) : null}

        {block.type === 'source-list' ? (
          <div className="space-y-3">
            <CardField label="Título do bloco de fontes">
              <Input value={block.data.title ?? ''} onChange={(event) => updateData({ title: event.target.value })} />
            </CardField>
            {(block.data.items ?? []).map((item, itemIndex) => (
              <SourceItemFields
                key={`${block.id}_source_${itemIndex}`}
                item={item}
                onChange={(nextItem) => {
                  const nextItems = [...block.data.items];
                  nextItems[itemIndex] = nextItem;
                  updateData({ items: nextItems });
                }}
                onRemove={() => {
                  const nextItems = block.data.items.filter((_, currentIndex) => currentIndex !== itemIndex);
                  updateData({ items: nextItems });
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => updateData({ items: [...block.data.items, { label: '', url: '', note: '' }] })}
              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200"
            >
              Adicionar fonte ao bloco
            </button>
          </div>
        ) : null}

        {block.type === 'button' ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <CardField label="Texto do botão">
                <Input value={block.data.label} onChange={(event) => updateData({ label: event.target.value })} />
              </CardField>
              <CardField label="URL do botão">
                <Input value={block.data.url} onChange={(event) => updateData({ url: event.target.value })} placeholder="https://..." />
              </CardField>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <CardField label="Variante visual">
                <Select value={block.data.variant ?? 'primary'} onChange={(event) => updateData({ variant: event.target.value })}>
                  {NEWS_BUTTON_VARIANTS.map((variant) => (
                    <option key={variant} value={variant}>{variant}</option>
                  ))}
                </Select>
              </CardField>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={!!block.data.openInNewTab}
                  onChange={(event) => updateData({ openInNewTab: event.target.checked })}
                />
                Abrir em nova aba
              </label>
            </div>
          </>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-sm font-semibold text-slate-100">Estilo do bloco</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CardField label="Cor do texto">
              <Input value={block.style?.textColor ?? ''} onChange={(event) => onChange(updateStyle(block, { textColor: event.target.value || null }))} placeholder="#ffffff" />
            </CardField>
            <CardField label="Cor de fundo">
              <Input value={block.style?.backgroundColor ?? ''} onChange={(event) => onChange(updateStyle(block, { backgroundColor: event.target.value || null }))} placeholder="#0f172a" />
            </CardField>
            <CardField label="Cor de destaque">
              <Input value={block.style?.accentColor ?? ''} onChange={(event) => onChange(updateStyle(block, { accentColor: event.target.value || null }))} placeholder="#2563eb" />
            </CardField>
            <CardField label="Fonte">
              <Input value={block.style?.fontFamily ?? ''} onChange={(event) => onChange(updateStyle(block, { fontFamily: event.target.value || null }))} placeholder="Inter, serif..." />
            </CardField>
            <CardField label="Alinhamento">
              <Select value={block.style?.textAlign ?? ''} onChange={(event) => onChange(updateStyle(block, { textAlign: event.target.value || null }))}>
                <option value="">Padrão</option>
                {NEWS_TEXT_ALIGNMENTS.map((alignment) => (
                  <option key={alignment} value={alignment}>{alignment}</option>
                ))}
              </Select>
            </CardField>
          </div>
        </div>
      </div>
    </article>
  );
}
