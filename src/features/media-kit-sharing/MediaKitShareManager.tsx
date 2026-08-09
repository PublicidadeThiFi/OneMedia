import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, LoaderCircle, RefreshCw, ShieldX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiError } from '../../lib/getApiError';
import { createMediaKitShare, deleteMediaKitShare, listMediaKitShareRegions, listMediaKitShares, regenerateMediaKitShare, revokeMediaKitShare } from './api';
import { DEFAULT_SHARE_VISIBILITY, type MediaKitShare, type ShareRegion, type ShareVisibility } from './types';
import './media-kit-sharing.css';

const regionKey = (region: ShareRegion) => `${region.state}:${region.city || ''}`;
const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—';
const visibilityGroups: Array<{ title: string; items: Array<[keyof ShareVisibility, string]> }> = [
  { title: 'Informações básicas', items: [['description', 'Descrição'], ['audience', 'Audiência'], ['faceDetails', 'Características das faces']] },
  { title: 'Localização', items: [['cityState', 'Cidade e estado'], ['address', 'Endereço'], ['coordinates', 'Coordenadas e mapa']] },
  { title: 'Mídia', items: [['photos', 'Fotos'], ['videos', 'Vídeos'], ['dimensions', 'Dimensões e resolução']] },
  { title: 'Dados comerciais', items: [['prices', 'Preços'], ['promotions', 'Promoções'], ['availability', 'Disponibilidade']] },
  { title: 'Contato', items: [['commercialContact', 'Contato comercial']] },
];

export function MediaKitShareManager() {
  const [items, setItems] = useState<MediaKitShare[]>([]);
  const [regions, setRegions] = useState<ShareRegion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scope, setScope] = useState<'ALL' | 'REGIONS'>('ALL');
  const [visibility, setVisibility] = useState<ShareVisibility>({ ...DEFAULT_SHARE_VISIBILITY });
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [shares, available] = await Promise.all([listMediaKitShares(), listMediaKitShareRegions()]);
    setItems(shares); setRegions(available);
  }, []);
  useEffect(() => { void load().catch(() => toast.error('Não foi possível carregar os compartilhamentos.')); }, [load]);
  const chosen = useMemo(() => regions.filter((region) => selected.includes(regionKey(region))), [regions, selected]);

  const copy = async (item: MediaKitShare) => {
    if (!item.url) return toast.info('Regenerate este link antigo para poder visualizá-lo e copiá-lo.');
    await navigator.clipboard.writeText(item.url);
    setCopied(item.shareId); toast.success('Link copiado.');
    window.setTimeout(() => setCopied((id) => id === item.shareId ? null : id), 1800);
  };
  const create = async () => {
    setBusy('create');
    try {
      const data = await createMediaKitShare(scope === 'REGIONS' ? { scopeType: 'REGIONS', regions: chosen, visibility } : { scopeType: 'ALL', regions: [], visibility });
      await navigator.clipboard.writeText(data.url);
      toast.success('Link criado e copiado.'); setSelected([]); await load();
    } catch (error) { toast.error(getApiError(error, 'Não foi possível criar o link.').message); }
    finally { setBusy(null); }
  };
  const action = async (item: MediaKitShare, type: 'revoke' | 'regenerate' | 'delete') => {
    const question = type === 'delete'
      ? 'Excluir este link definitivamente? Esta ação não pode ser desfeita.'
      : type === 'revoke' ? 'Revogar este link imediatamente?' : 'Regenerar o link? O endereço atual deixará de funcionar.';
    if (!window.confirm(question)) return;
    setBusy(`${type}:${item.shareId}`);
    try {
      if (type === 'delete') {
        await deleteMediaKitShare(item.shareId); toast.success('Link excluído definitivamente.');
      } else if (type === 'regenerate') {
        const updated = await regenerateMediaKitShare(item.shareId);
        await navigator.clipboard.writeText(updated.url); toast.success('Novo link gerado e copiado. O anterior foi invalidado.');
      } else { await revokeMediaKitShare(item.shareId); toast.success('Link revogado.'); }
      await load();
    } catch (error) { toast.error(getApiError(error, 'A ação não pôde ser concluída.').message); }
    finally { setBusy(null); }
  };

  return <section id="media-kit-share-manager" className="border-b bg-slate-50"><div className="mx-auto max-w-7xl px-6 py-8">
    <h2 className="text-xl font-semibold text-slate-900">Mapa compartilhável</h2><p className="mt-1 text-sm text-slate-600">Controle o recorte do inventário e exatamente quais informações o cliente poderá consultar.</p>
    <div className="share-configurator mt-5 grid gap-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2">
      <div><h3 className="text-sm font-semibold text-slate-900">Pontos incluídos</h3><div className="mt-3 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={scope === 'ALL'} onChange={() => setScope('ALL')}/> Todos os pontos publicados</label><label className="flex items-center gap-2"><input type="radio" checked={scope === 'REGIONS'} onChange={() => setScope('REGIONS')}/> Regiões específicas</label></div>
      {scope === 'REGIONS' && <div className="mt-4 grid max-h-52 gap-2 overflow-auto sm:grid-cols-2">{regions.map((region) => <label key={regionKey(region)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(regionKey(region))} onChange={() => setSelected((old) => old.includes(regionKey(region)) ? old.filter((value) => value !== regionKey(region)) : [...old, regionKey(region)])}/>{region.city ? `${region.city}/${region.state}` : region.state}</label>)}</div>}</div>
      <div><h3 className="text-sm font-semibold text-slate-900">Informações liberadas</h3><div className="mt-3 space-y-4">{visibilityGroups.map((group) => <fieldset key={group.title}><legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{group.items.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibility[key]} onChange={(event) => setVisibility((old) => ({ ...old, [key]: event.target.checked }))}/>{label}</label>)}</div></fieldset>)}</div></div>
      <div className="lg:col-span-2"><button disabled={busy !== null || (scope === 'REGIONS' && !chosen.length)} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Link2 className="h-4 w-4"/>} Gerar link seguro</button></div>
    </div>
    <div className="mt-5 space-y-4">{items.map((item) => { const title = item.scopeType === 'ALL' ? 'Todos os pontos' : item.regions.map((region) => region.city ? `${region.city}/${region.state}` : region.state).join(', '); return <article key={item.shareId} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{item.status === 'ACTIVE' ? 'Ativo' : 'Revogado'}</span><h3 className="font-semibold text-slate-900">{title}</h3></div><p className="mt-2 text-sm font-medium text-indigo-700">{item.pointCount} {item.pointCount === 1 ? 'ponto compartilhado' : 'pontos compartilhados'}</p></div><div className="text-right text-xs text-slate-500"><div>{item.accessCount} acesso(s)</div><div>Último acesso: {date(item.lastAccessAt)}</div></div></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input aria-label="Link do compartilhamento" readOnly value={item.url || 'Link criado antes desta atualização — regenere para visualizar'} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700"/><button disabled={!item.url || busy !== null} onClick={() => void copy(item)} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm">{copied === item.shareId ? <Check className="h-4 w-4 text-emerald-600"/> : <Copy className="h-4 w-4"/>} Copiar</button>{item.status === 'ACTIVE' && <><button disabled={busy !== null} onClick={() => void action(item, 'regenerate')} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/> Regenerar</button><button disabled={busy !== null} onClick={() => void action(item, 'revoke')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700"><ShieldX className="h-4 w-4"/> Revogar</button></>}<button disabled={busy !== null} onClick={() => void action(item, 'delete')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4"/> Excluir</button></div>
      <dl className="mt-4 grid gap-2 border-t pt-4 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="font-medium text-slate-700">Criado</dt><dd>{date(item.createdAt)}{item.createdBy ? ` por ${item.createdBy.name}` : ''}</dd></div><div><dt className="font-medium text-slate-700">Regenerado</dt><dd>{date(item.regeneratedAt)}</dd></div><div><dt className="font-medium text-slate-700">Revogado</dt><dd>{date(item.revokedAt)}{item.revokedBy ? ` por ${item.revokedBy.name}` : ''}</dd></div><div><dt className="font-medium text-slate-700">Política</dt><dd>{Object.values(item.visibility).filter(Boolean).length} campos liberados</dd></div></dl>
    </article>})}</div>
  </div></section>;
}
