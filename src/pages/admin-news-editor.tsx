import { useEffect, useId, useMemo, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Archive, ArrowLeft, Eye, ExternalLink, RotateCcw, Save, Send, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { BlockEditor } from '../components/admin-news/BlockEditor';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { createDefaultNewsBlock, createEmptyNewsDraft } from '../lib/news';
import { formatDateTimeBR } from '../lib/format';
import { getSafeNewsMediaUrl } from '../lib/news-security';
import {
  archiveAdminNewsArticle,
  createAdminNewsArticle,
  fetchAdminNewsArticle,
  publishAdminNewsArticle,
  restoreAdminNewsArticle,
  unpublishAdminNewsArticle,
  updateAdminNewsArticle,
  uploadAdminNewsImage,
} from '../services/admin-news';
import {
  NEWS_BLOCK_TYPES,
  type NewsArticleBlock,
  type NewsArticleRecord,
  type NewsArticleUpsertInput,
  type NewsSourceItem,
} from '../types/news';

function slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function inferAltFromFileName(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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

function updateArrayItem<T>(items: T[], index: number, nextItem: T) {
  const next = [...items];
  next[index] = nextItem;
  return next;
}

type UploadTarget =
  | { key: 'cover'; kind: 'cover' }
  | { key: `image:${string}`; kind: 'content'; blockId: string }
  | { key: `gallery:${string}:${number}`; kind: 'gallery'; blockId: string; imageIndex: number };

export default function AdminNewsEditorPage({ articleId }: { articleId?: string }) {
  const navigate = useNavigation();
  const { authReady, isAuthenticated } = useAdminAuth();
  const coverInputId = useId();
  const [loading, setLoading] = useState<boolean>(!!articleId);
  const [saving, setSaving] = useState(false);
  const [uploadingTargetKey, setUploadingTargetKey] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [article, setArticle] = useState<NewsArticleRecord | null>(null);
  const [form, setForm] = useState<NewsArticleUpsertInput>(createEmptyNewsDraft());

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      navigate('/admin');
    }
  }, [authReady, isAuthenticated, navigate]);

  useEffect(() => {
    if (!articleId || !authReady || !isAuthenticated) return;

    let cancelled = false;
    setLoading(true);

    fetchAdminNewsArticle(articleId)
      .then((response) => {
        if (cancelled) return;
        setArticle(response);
        setForm({
          title: response.title,
          slug: response.slug,
          summary: response.summary ?? '',
          coverImageUrl: response.coverImageUrl ?? '',
          coverImageAlt: response.coverImageAlt ?? '',
          status: response.status,
          content: response.content,
          sources: response.sources ?? [],
          publishedAt: response.publishedAt ?? null,
        });
        setSlugTouched(true);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível carregar a matéria.'));
        navigate('/admin/dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId, authReady, isAuthenticated, navigate]);

  const coverPreviewUrl = useMemo(() => getSafeNewsMediaUrl(form.coverImageUrl) ?? '', [form.coverImageUrl]);
  const isEditMode = !!articleId;
  const publicArticlePath = form.slug ? `/noticias/${encodeURIComponent(form.slug)}` : '';

  const setSourceItem = (index: number, nextItem: NewsSourceItem) => {
    setForm((current) => ({
      ...current,
      sources: updateArrayItem(current.sources ?? [], index, nextItem),
    }));
  };

  const syncPersistedArticle = (persisted: NewsArticleRecord) => {
    setArticle(persisted);
    setForm({
      title: persisted.title,
      slug: persisted.slug,
      summary: persisted.summary ?? '',
      coverImageUrl: persisted.coverImageUrl ?? '',
      coverImageAlt: persisted.coverImageAlt ?? '',
      status: persisted.status,
      content: persisted.content,
      sources: persisted.sources ?? [],
      publishedAt: persisted.publishedAt ?? null,
    });
    setSlugTouched(true);
  };

  const handleImageUpload = async (file: File, target: UploadTarget) => {
    setUploadingTargetKey(target.key);
    try {
      const uploaded = await uploadAdminNewsImage(file, { kind: target.kind });
      const inferredAlt = inferAltFromFileName(file);

      setForm((current) => {
        if (target.key === 'cover') {
          return {
            ...current,
            coverImageUrl: uploaded.url,
            coverImageAlt: current.coverImageAlt?.trim() ? current.coverImageAlt : inferredAlt,
          };
        }

        return {
          ...current,
          content: current.content.map((block) => {
            if (block.id !== target.blockId) return block;

            if (target.kind === 'content' && block.type === 'image') {
              return {
                ...block,
                data: {
                  ...block.data,
                  url: uploaded.url,
                  alt: block.data.alt?.trim() ? block.data.alt : inferredAlt,
                },
              };
            }

            if (target.kind === 'gallery' && block.type === 'gallery') {
              const nextImages = [...block.data.images];
              const currentItem = nextImages[target.imageIndex] ?? { url: '', alt: '', caption: '' };
              nextImages[target.imageIndex] = {
                ...currentItem,
                url: uploaded.url,
                alt: currentItem.alt?.trim() ? currentItem.alt : inferredAlt,
              };
              return {
                ...block,
                data: {
                  ...block.data,
                  images: nextImages,
                },
              };
            }

            return block;
          }),
        };
      });

      toast.success(target.key === 'cover' ? 'Imagem de capa enviada.' : 'Imagem do bloco enviada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível enviar a imagem.'));
    } finally {
      setUploadingTargetKey(null);
    }
  };

  const saveArticle = async (mode: 'draft' | 'save' | 'publish' | 'unpublish') => {
    setSaving(true);
    try {
      const basePayload: NewsArticleUpsertInput = {
        ...form,
        title: form.title.trim(),
        slug: slugify(form.slug || form.title),
        summary: form.summary?.trim() ?? '',
        coverImageUrl: form.coverImageUrl?.trim() ?? '',
        coverImageAlt: form.coverImageAlt?.trim() ?? '',
        sources: (form.sources ?? []).map((item) => ({
          label: item.label?.trim() ?? '',
          url: item.url?.trim() ?? '',
          note: item.note?.trim() ?? '',
        })),
      };

      const payload: NewsArticleUpsertInput = {
        ...basePayload,
        status: mode === 'draft' ? 'DRAFT' : basePayload.status ?? 'DRAFT',
      };

      let persisted: NewsArticleRecord;
      const shouldNavigateToCreatedRecord = !articleId;

      if (articleId) {
        persisted = await updateAdminNewsArticle(articleId, payload);
      } else {
        persisted = await createAdminNewsArticle(payload);
      }

      if (mode === 'publish') {
        persisted = await publishAdminNewsArticle(persisted.id);
      }

      if (mode === 'unpublish') {
        persisted = await unpublishAdminNewsArticle(persisted.id);
      }

      const successMessage =
        mode === 'draft'
          ? 'Rascunho salvo com sucesso.'
          : mode === 'publish'
            ? 'Matéria publicada com sucesso.'
            : mode === 'unpublish'
              ? 'Matéria voltou para rascunho.'
              : 'Matéria salva com sucesso.';

      if (shouldNavigateToCreatedRecord) {
        toast.success(successMessage);
        navigate(`/admin/materias/${persisted.id}/editar`);
        return;
      }

      syncPersistedArticle(persisted);
      toast.success(successMessage);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível salvar a matéria.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleArchiveState = async () => {
    if (!articleId) {
      toast.error('Salve a matéria antes de arquivar ou restaurar.');
      return;
    }

    setSaving(true);
    try {
      const persisted = form.status === 'ARCHIVED'
        ? await restoreAdminNewsArticle(articleId)
        : await archiveAdminNewsArticle(articleId);
      syncPersistedArticle(persisted);
      toast.success(form.status === 'ARCHIVED' ? 'Matéria restaurada como rascunho.' : 'Matéria arquivada com sucesso.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível alterar o arquivamento da matéria.'));
    } finally {
      setSaving(false);
    }
  };

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">Verificando sessão administrativa...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao painel
            </button>
            <h1 className="mt-4 text-3xl font-semibold">
              {isEditMode ? 'Editar matéria' : 'Nova matéria da Página Principal'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
              O editor já está no fluxo final: montar blocos, salvar rascunho, editar slug, resumo, capa, fontes, publicar, arquivar, restaurar e abrir a matéria publicada no app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveArticle('draft')} disabled={saving || loading || !!uploadingTargetKey} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              <Save className="h-4 w-4" />
              Salvar rascunho
            </button>
            <button type="button" onClick={() => void saveArticle('save')} disabled={saving || loading || !!uploadingTargetKey} className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-100 disabled:opacity-60">
              <Sparkles className="h-4 w-4" />
              Salvar alterações
            </button>
            <button type="button" onClick={() => void saveArticle(form.status === 'PUBLISHED' ? 'unpublish' : 'publish')} disabled={saving || loading || !!uploadingTargetKey || form.status === 'ARCHIVED'} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">
              <Send className="h-4 w-4" />
              {form.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
            </button>
            {isEditMode ? (
              <button type="button" onClick={() => void toggleArchiveState()} disabled={saving || loading || !!uploadingTargetKey} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {form.status === 'ARCHIVED' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {form.status === 'ARCHIVED' ? 'Restaurar rascunho' : 'Arquivar'}
              </button>
            ) : null}
            {form.status === 'PUBLISHED' && publicArticlePath ? (
              <button type="button" onClick={() => navigate(publicArticlePath)} className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100">
                <ExternalLink className="h-4 w-4" />
                Abrir matéria
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetaBadge label="Status" value={form.status ?? 'DRAFT'} />
          <MetaBadge label="Criado em" value={article?.createdAt ? formatDateTimeBR(article.createdAt) : 'Ainda não salvo'} />
          <MetaBadge label="Atualizado em" value={article?.updatedAt ? formatDateTimeBR(article.updatedAt) : 'Ainda não salvo'} />
          <MetaBadge label="Publicado em" value={form.publishedAt ? formatDateTimeBR(form.publishedAt) : 'Não publicado'} />
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">Carregando matéria...</div>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                  <Shield className="h-4 w-4" />
                  Dados principais
                </div>
                <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  O conteúdo é validado com regras de segurança no backend: HTML arbitrário, URLs inseguras, estilos fora do formato aceito e propriedades extras fora do schema serão rejeitados ao salvar.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Título da matéria">
                    <Input
                      value={form.title}
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        setForm((current) => ({
                          ...current,
                          title: nextTitle,
                          slug: slugTouched ? current.slug : slugify(nextTitle),
                        }));
                      }}
                      placeholder="Ex.: Novo marco da mídia OOH em São Paulo"
                    />
                  </Field>
                  <Field label="Slug da URL">
                    <Input
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        setForm((current) => ({ ...current, slug: event.target.value }));
                      }}
                      placeholder="novo-marco-da-midia-ooh"
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Resumo curto para o card">
                    <Textarea
                      value={form.summary ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                      className="min-h-[110px]"
                      placeholder="Resumo que aparece no card da Página Principal"
                    />
                  </Field>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="URL da imagem de capa">
                    <Input
                      value={form.coverImageUrl ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                      placeholder="https://... ou /uploads/news/..."
                    />
                  </Field>
                  <Field label="Texto alternativo da capa">
                    <Input
                      value={form.coverImageAlt ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, coverImageAlt: event.target.value }))}
                      placeholder="Descrição da imagem de capa"
                    />
                  </Field>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Upload da capa</p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">Envie JPG, PNG, WEBP, GIF ou AVIF direto do editor. O caminho salvo entra automaticamente no campo acima.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <input
                        id={coverInputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = '';
                          if (file) {
                            void handleImageUpload(file, { key: 'cover', kind: 'cover' });
                          }
                        }}
                      />
                      <label
                        htmlFor={coverInputId}
                        className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${uploadingTargetKey === 'cover' ? 'border-blue-400/30 bg-blue-500/10 text-blue-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}
                      >
                        {uploadingTargetKey === 'cover' ? 'Enviando capa...' : 'Enviar imagem de capa'}
                      </label>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Fontes gerais da matéria</h2>
                    <p className="mt-1 text-sm text-slate-400">Estas fontes ficam salvas na estrutura principal da matéria.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, sources: [...(current.sources ?? []), { label: '', url: '', note: '' }] }))}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200"
                  >
                    Adicionar fonte
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {(form.sources ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">Nenhuma fonte geral adicionada ainda.</div>
                  ) : null}
                  {(form.sources ?? []).map((item, index) => (
                    <div key={`article_source_${index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Rótulo">
                          <Input value={item.label} onChange={(event) => setSourceItem(index, { ...item, label: event.target.value })} />
                        </Field>
                        <Field label="URL">
                          <Input value={item.url ?? ''} onChange={(event) => setSourceItem(index, { ...item, url: event.target.value })} placeholder="https://..." />
                        </Field>
                      </div>
                      <div className="mt-3">
                        <Field label="Nota">
                          <Textarea value={item.note ?? ''} onChange={(event) => setSourceItem(index, { ...item, note: event.target.value })} className="min-h-[90px]" />
                        </Field>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({
                            ...current,
                            sources: (current.sources ?? []).filter((_, currentIndex) => currentIndex !== index),
                          }))}
                          className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                        >
                          Remover fonte
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Montagem em blocos</h2>
                    <p className="mt-1 text-sm text-slate-400">Escolha o tipo de bloco e monte a matéria como lego.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NEWS_BLOCK_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, content: [...current.content, createDefaultNewsBlock(type)] }))}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-blue-400/40 hover:text-white"
                      >
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  {form.content.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                      Nenhum bloco adicionado ainda. Use os botões acima para começar a montar a matéria.
                    </div>
                  ) : null}

                  {form.content.map((block, index) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      index={index}
                      total={form.content.length}
                      onChange={(nextBlock: NewsArticleBlock) => {
                        setForm((current) => ({
                          ...current,
                          content: updateArrayItem(current.content, index, nextBlock),
                        }));
                      }}
                      onRemove={() => setForm((current) => ({ ...current, content: current.content.filter((_, currentIndex) => currentIndex !== index) }))}
                      onMoveUp={() => {
                        if (index === 0) return;
                        setForm((current) => {
                          const next = [...current.content];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return { ...current, content: next };
                        });
                      }}
                      onMoveDown={() => {
                        if (index >= form.content.length - 1) return;
                        setForm((current) => {
                          const next = [...current.content];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          return { ...current, content: next };
                        });
                      }}
                      onUploadImage={({ file, blockId, imageIndex, kind }) => void handleImageUpload(
                        file,
                        kind === 'gallery'
                          ? { key: `gallery:${blockId}:${imageIndex ?? 0}`, kind: 'gallery', blockId, imageIndex: imageIndex ?? 0 }
                          : { key: `image:${blockId}`, kind: 'content', blockId },
                      )}
                      uploadingTargetKey={uploadingTargetKey}
                    />
                  ))}
                </div>
              </article>
            </section>

            <aside className="space-y-6">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  <Eye className="h-4 w-4" />
                  Prévia rápida da capa
                </div>
                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                  {coverPreviewUrl ? (
                    <img src={coverPreviewUrl} alt={form.coverImageAlt ?? form.title ?? 'Capa da matéria'} className="h-56 w-full object-cover" />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-slate-500">Sem imagem de capa</div>
                  )}
                  <div className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">Preview do card</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{form.title || 'Título da matéria'}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {form.summary || 'O resumo aparecerá aqui quando você preencher o conteúdo do card.'}
                    </p>
                    <div className="mt-5 inline-flex rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                      Ler matéria completa
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <h2 className="text-xl font-semibold">Checklist desta etapa</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <li>• salvar rascunho</li>
                  <li>• editar slug único, resumo, capa e fontes</li>
                  <li>• montar a matéria em blocos</li>
                  <li>• enviar imagens de capa e de blocos</li>
                  <li>• publicar, despublicar, arquivar e restaurar</li>
                </ul>
              </article>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
