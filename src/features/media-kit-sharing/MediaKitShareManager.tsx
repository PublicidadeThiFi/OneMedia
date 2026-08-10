import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Eye, Link2, LoaderCircle, MapPin, RefreshCw, ShieldX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { getApiError } from '../../lib/getApiError';
import {
  createMediaKitShare,
  deleteMediaKitShare,
  listMediaKitShareRegions,
  listMediaKitShares,
  regenerateMediaKitShare,
  revokeMediaKitShare,
} from './api';
import {
  DEFAULT_SHARE_VISIBILITY,
  type MediaKitShare,
  type ShareRegion,
  type ShareVisibility,
} from './types';
import './media-kit-sharing.css';

const regionKey = (region: ShareRegion) => `${region.state}:${region.city || ''}`;
const date = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');



type PreviewPoint = {
  id: string;
  name: string;
  addressCity?: string | null;
  addressState?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const previewMarkerIcon = new L.Icon({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function PreviewFit({ points }: { points: PreviewPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = points.flatMap((point) => {
      const lat = Number(point.latitude);
      const lng = Number(point.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [[lat, lng] as [number, number]] : [];
    });
    window.setTimeout(() => map.invalidateSize(), 0);
    if (coords.length) map.fitBounds(coords, { padding: [28, 28], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const visibilityGroups: Array<{
  title: string;
  items: Array<[keyof ShareVisibility, string]>;
}> = [
  {
    title: 'Informações básicas',
    items: [
      ['description', 'Descrição'],
      ['audience', 'Audiência'],
      ['faceDetails', 'Características das faces'],
    ],
  },
  {
    title: 'Localização',
    items: [
      ['cityState', 'Cidade e estado'],
      ['address', 'Endereço'],
      ['coordinates', 'Coordenadas e mapa'],
    ],
  },
  {
    title: 'Mídia',
    items: [
      ['photos', 'Fotos'],
      ['videos', 'Vídeos'],
      ['dimensions', 'Dimensões e resolução'],
    ],
  },
  {
    title: 'Dados comerciais',
    items: [
      ['prices', 'Preços'],
      ['promotions', 'Promoções'],
      ['availability', 'Disponibilidade'],
    ],
  },
  { title: 'Contato', items: [['commercialContact', 'Contato comercial']] },
];

async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.focus();
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

export function MediaKitShareManager({ points = [] }: { points?: PreviewPoint[] }) {
  const [items, setItems] = useState<MediaKitShare[]>([]);
  const [regions, setRegions] = useState<ShareRegion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scope, setScope] = useState<'ALL' | 'REGIONS'>('ALL');
  const [visibility, setVisibility] = useState<ShareVisibility>({ ...DEFAULT_SHARE_VISIBILITY });
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [policyItem, setPolicyItem] = useState<MediaKitShare | null>(null);

  const load = useCallback(async () => {
    const [shares, available] = await Promise.all([
      listMediaKitShares(),
      listMediaKitShareRegions(),
    ]);
    setItems(shares);
    setRegions(available);
  }, []);

  useEffect(() => {
    void load().catch(() => toast.error('Não foi possível carregar os compartilhamentos.'));
  }, [load]);

  const chosen = useMemo(
    () => regions.filter((region) => selected.includes(regionKey(region))),
    [regions, selected],
  );

  const previewPoints = useMemo(() => {
    if (scope === 'ALL') return points;
    if (!chosen.length) return [];
    return points.filter((point) => chosen.some((region) => {
      const stateMatches = String(point.addressState || '').trim().toUpperCase() === region.state;
      if (!stateMatches) return false;
      return !region.city || String(point.addressCity || '').trim().toLocaleLowerCase('pt-BR') === region.city.toLocaleLowerCase('pt-BR');
    }));
  }, [chosen, points, scope]);

  const previewPointsWithCoords = useMemo(
    () => previewPoints.filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))),
    [previewPoints],
  );

  const regionsByState = useMemo(() => {
    const grouped = new Map<string, { wholeState?: ShareRegion; cities: ShareRegion[] }>();
    for (const region of regions) {
      const current = grouped.get(region.state) || { cities: [] };
      if (region.city) current.cities.push(region);
      else current.wholeState = region;
      grouped.set(region.state, current);
    }
    return [...grouped.entries()]
      .map(([state, value]) => ({
        state,
        wholeState: value.wholeState,
        cities: value.cities.sort((a, b) => String(a.city).localeCompare(String(b.city), 'pt-BR')),
      }))
      .sort((a, b) => a.state.localeCompare(b.state, 'pt-BR'));
  }, [regions]);

  const toggleWholeState = (state: string, wholeState?: ShareRegion) => {
    if (!wholeState) return;
    const wholeKey = regionKey(wholeState);
    setSelected((old) => {
      if (old.includes(wholeKey)) return old.filter((value) => value !== wholeKey);
      return [...old.filter((value) => !value.startsWith(`${state}:`)), wholeKey];
    });
  };

  const toggleCity = (region: ShareRegion) => {
    const key = regionKey(region);
    const wholeKey = `${region.state}:`;
    setSelected((old) => {
      const withoutWholeState = old.filter((value) => value !== wholeKey);
      return withoutWholeState.includes(key)
        ? withoutWholeState.filter((value) => value !== key)
        : [...withoutWholeState, key];
    });
  };

  const copy = async (item: MediaKitShare) => {
    if (!item.url) {
      toast.info('Regenere este link antigo para poder visualizá-lo e copiá-lo.');
      return;
    }
    const copiedOk = await copyText(item.url);
    if (!copiedOk) {
      toast.info('O link está pronto. Selecione-o e copie manualmente.');
      return;
    }
    setCopied(item.shareId);
    toast.success('Link copiado.');
    window.setTimeout(() => setCopied((id) => (id === item.shareId ? null : id)), 1800);
  };

  const create = async () => {
    setBusy('create');
    try {
      const data = await createMediaKitShare(
        scope === 'REGIONS'
          ? { scopeType: 'REGIONS', regions: chosen, visibility }
          : { scopeType: 'ALL', regions: [], visibility },
      );

      const copiedOk = await copyText(data.url);
      toast.success(copiedOk ? 'Link criado e copiado.' : 'Link criado com sucesso. Use o botão Copiar abaixo.');
      setSelected([]);
      await load();
    } catch (error) {
      toast.error(getApiError(error, 'Não foi possível criar o link.').message);
    } finally {
      setBusy(null);
    }
  };

  const action = async (item: MediaKitShare, type: 'revoke' | 'regenerate' | 'delete') => {
    const question =
      type === 'delete'
        ? 'Excluir este link definitivamente? Esta ação não pode ser desfeita.'
        : type === 'revoke'
          ? 'Revogar este link imediatamente?'
          : 'Regenerar o link? O endereço atual deixará de funcionar.';

    if (!window.confirm(question)) return;
    setBusy(`${type}:${item.shareId}`);

    try {
      if (type === 'delete') {
        await deleteMediaKitShare(item.shareId);
        toast.success('Link excluído definitivamente.');
      } else if (type === 'regenerate') {
        const updated = await regenerateMediaKitShare(item.shareId);
        const copiedOk = await copyText(updated.url);
        toast.success(
          copiedOk
            ? 'Novo link gerado e copiado. O anterior foi invalidado.'
            : 'Novo link gerado. O anterior foi invalidado; use o botão Copiar abaixo.',
        );
      } else {
        await revokeMediaKitShare(item.shareId);
        toast.success('Link revogado.');
      }
      await load();
    } catch (error) {
      toast.error(getApiError(error, 'A ação não pôde ser concluída.').message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="media-kit-share-manager" className="border-b bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-xl font-semibold text-slate-900">Mapa compartilhável</h2>
        <p className="mt-1 text-sm text-slate-600">
          Controle o recorte do inventário e exatamente quais informações o cliente poderá consultar.
        </p>

        <div className="share-configurator mt-5 grid gap-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Pontos incluídos</h3>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'ALL'} onChange={() => setScope('ALL')} />
                Todos os pontos publicados
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'REGIONS'} onChange={() => setScope('REGIONS')} />
                Regiões específicas
              </label>
            </div>

            {scope === 'REGIONS' ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    {chosen.length === 0
                      ? 'Selecione uma UF inteira ou cidades específicas.'
                      : `${chosen.length} recorte(s) selecionado(s)`}
                  </span>
                  {selected.length ? (
                    <button
                      type="button"
                      className="font-semibold text-indigo-700 hover:underline"
                      onClick={() => setSelected([])}
                    >
                      Limpar seleção
                    </button>
                  ) : null}
                </div>

                <div className="region-selector max-h-72 space-y-3 overflow-auto pr-1">
                  {regionsByState.map(({ state: uf, wholeState, cities }) => {
                    const wholeKey = wholeState ? regionKey(wholeState) : `${uf}:`;
                    const wholeSelected = selected.includes(wholeKey);
                    const selectedCities = cities.filter((city) => selected.includes(regionKey(city))).length;

                    return (
                      <div key={uf} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{uf}</div>
                            <div className="text-xs text-slate-500">
                              {wholeSelected
                                ? 'Toda a UF será compartilhada.'
                                : selectedCities
                                  ? `${selectedCities} cidade(s) selecionada(s)`
                                  : `${cities.length} cidade(s) disponível(is)`}
                            </div>
                          </div>
                          {wholeState ? (
                            <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={wholeSelected}
                                onChange={() => toggleWholeState(uf, wholeState)}
                              />
                              Toda a UF
                            </label>
                          ) : null}
                        </div>

                        {cities.length ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {cities.map((region) => {
                              const key = regionKey(region);
                              return (
                                <label
                                  key={key}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                    wholeSelected
                                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                      : selected.includes(key)
                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                                        : 'bg-white text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={wholeSelected}
                                    checked={!wholeSelected && selected.includes(key)}
                                    onChange={() => toggleCity(region)}
                                  />
                                  <span className="truncate">{region.city}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-xl border bg-slate-100">
              <div className="flex items-center justify-between border-b bg-white px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Prévia dos pontos compartilhados</p>
                  <p className="text-[11px] text-slate-500">{previewPoints.length} ponto(s) no recorte atual</p>
                </div>
              </div>
              <div className="h-72 w-full">
                {previewPointsWithCoords.length ? (
                  <MapContainer center={[-14.2, -51.9]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <PreviewFit points={previewPointsWithCoords} />
                    {previewPointsWithCoords.map((point) => (
                      <Marker key={point.id} position={[Number(point.latitude), Number(point.longitude)]} icon={previewMarkerIcon} />
                    ))}
                  </MapContainer>
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div>
                      <MapPin className="mx-auto h-7 w-7 text-slate-400" />
                      <p className="mt-2 text-sm font-medium text-slate-600">Nenhum ponto com coordenadas neste recorte</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Informações liberadas</h3>
            <div className="mt-3 space-y-4">
              {visibilityGroups.map((group) => (
                <fieldset key={group.title}>
                  <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.title}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {group.items.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={visibility[key]}
                          onChange={(event) =>
                            setVisibility((old) => ({ ...old, [key]: event.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              disabled={busy !== null || (scope === 'REGIONS' && !chosen.length)}
              onClick={() => void create()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === 'create' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}{' '}
              Gerar link seguro
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const title =
              item.scopeType === 'ALL'
                ? 'Todos os pontos'
                : item.regions
                    .map((region) => (region.city ? `${region.city}/${region.state}` : `Toda ${region.state}`))
                    .join(', ');

            return (
              <article key={item.shareId} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? 'Ativo' : 'Revogado'}
                      </span>
                      <h3 className="font-semibold text-slate-900">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm font-medium text-indigo-700">
                      {item.pointCount} {item.pointCount === 1 ? 'ponto compartilhado' : 'pontos compartilhados'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{item.accessCount} acesso(s)</div>
                    <div>Último acesso: {date(item.lastAccessAt)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label="Link do compartilhamento"
                    readOnly
                    value={item.url || 'Link criado antes desta atualização — regenere para visualizar'}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                  <button
                    disabled={!item.url || busy !== null}
                    onClick={() => void copy(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
                  >
                    {copied === item.shareId ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}{' '}
                    Copiar
                  </button>
                  {item.status === 'ACTIVE' ? (
                    <>
                      <button
                        disabled={busy !== null}
                        onClick={() => void action(item, 'regenerate')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
                      >
                        <RefreshCw className="h-4 w-4" /> Regenerar
                      </button>
                      <button
                        disabled={busy !== null}
                        onClick={() => void action(item, 'revoke')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700"
                      >
                        <ShieldX className="h-4 w-4" /> Revogar
                      </button>
                    </>
                  ) : null}
                  <button
                    disabled={busy !== null}
                    onClick={() => void action(item, 'delete')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                </div>

                <dl className="mt-4 grid gap-2 border-t pt-4 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-medium text-slate-700">Criado</dt>
                    <dd>{date(item.createdAt)}{item.createdBy ? ` por ${item.createdBy.name}` : ''}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Regenerado</dt>
                    <dd>{date(item.regeneratedAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Revogado</dt>
                    <dd>{date(item.revokedAt)}{item.revokedBy ? ` por ${item.revokedBy.name}` : ''}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Política</dt>
                    <dd className="mt-1">
                      <button type="button" onClick={() => setPolicyItem(item)} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50">
                        <Eye className="h-3.5 w-3.5" /> Ver política
                      </button>
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(policyItem)} onOpenChange={(open) => !open && setPolicyItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Política do link compartilhado</DialogTitle>
            <DialogDescription>Confira o recorte de pontos e as informações que este link permite consultar.</DialogDescription>
          </DialogHeader>
          {policyItem ? (
            <div className="space-y-5">
              <div className="rounded-xl border bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Filtro selecionado</h4>
                <p className="mt-2 text-sm text-slate-700">
                  {policyItem.scopeType === 'ALL' ? 'Todos os pontos publicados' : policyItem.regions.map((region) => region.city ? `${region.city}/${region.state}` : `Toda ${region.state}`).join(', ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">{policyItem.pointCount} ponto(s) compartilhado(s)</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Informações liberadas</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {visibilityGroups.map((group) => (
                    <div key={group.title} className="rounded-xl border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
                      <div className="mt-2 space-y-1.5">
                        {group.items.filter(([key]) => policyItem.visibility[key]).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2 text-sm text-slate-700"><Check className="h-4 w-4 text-emerald-600" /> {label}</div>
                        ))}
                        {!group.items.some(([key]) => policyItem.visibility[key]) ? <p className="text-xs text-slate-400">Nenhuma informação liberada.</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
