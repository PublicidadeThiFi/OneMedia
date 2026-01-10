import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { Search, Filter, Calendar } from 'lucide-react';
import { ActivityLog, ActivityResourceType } from '../types';
import { useActivityLogs } from '../hooks/useActivityLogs';

type ActionOption = {
  value: string;
  label: string;
  group: string;
};

const humanizeEnumLike = (s: string) => {
  const raw = (s || '').trim();
  if (!raw) return raw;

  // If it's already a human phrase (contains spaces or accents), keep.
  if (/\s/.test(raw) || /[áàâãéêíóôõúç]/i.test(raw)) return raw;

  const spaced = raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

  return spaced;
};

const actionMeta = (action: string): { label: string; group: string } => {
  const a = (action || '').trim();
  const upper = a.toUpperCase();

  // Friendly labels for the most common actions
  const direct: Record<string, string> = {
    CASH_TRANSACTION_CREATE: 'Transação criada',
    CASH_TRANSACTION_UPDATE: 'Transação atualizada',
    CASH_TRANSACTION_DELETE: 'Transação excluída',
    BILLING_INVOICE_MARK_PAID: 'Fatura marcada como paga',
    MEDIA_POINT_IMPORT: 'Inventário importado',
    MEDIA_POINT_CREATE: 'Ponto de mídia criado',
    MEDIA_POINT_DELETE: 'Ponto de mídia excluído',
    MEDIA_POINT_IMAGE_UPLOAD: 'Imagem do ponto enviada',
    MEDIA_UNIT_CREATE: 'Unidade criada',
    CLIENT_CREATE: 'Cliente criado',
    CLIENT_DELETE: 'Cliente excluído',
    CLIENT_DOCUMENT_UPLOAD: 'Documento do cliente enviado',
    RESERVATION_CREATE: 'Reserva criada',
    RESERVATION_CANCEL: 'Reserva cancelada',
    RESERVATION_STATUS_UPDATE: 'Status da reserva atualizado',
    CAMPAIGN_CREATE: 'Campanha criada',
    PUBLIC_PROPOSAL_APPROVE: 'Proposta aprovada (portal público)',
    PUBLIC_PROPOSAL_REJECT: 'Proposta recusada (portal público)',
    PUBLIC_PROPOSAL_MESSAGE: 'Mensagem recebida (portal público)',
  };

  const label = direct[upper] ?? humanizeEnumLike(a);

  const group = (() => {
    if (
      upper.startsWith('CASH_TRANSACTION') ||
      upper.startsWith('BILLING_INVOICE') ||
      upper.startsWith('FINANC')
    )
      return 'Financeiro';
    if (upper.startsWith('MEDIA_') || upper.startsWith('INVENT') || upper.startsWith('MEDIA POINT'))
      return 'Inventário';
    if (upper.startsWith('CLIENT_')) return 'Clientes';
    if (upper.startsWith('PROPOS') || upper.startsWith('PUBLIC_PROPOSAL') || a.toLowerCase().includes('proposta'))
      return 'Propostas';
    if (upper.startsWith('RESERVATION_')) return 'Reservas';
    if (upper.startsWith('CAMPAIGN_')) return 'Campanhas';
    if (a.toLowerCase().includes('portal')) return 'Portal público';
    return 'Outros';
  })();

  return { label, group };
};

const humanizeChangedField = (field: string) => {
  const map: Record<string, string> = {
    tags: 'Tags',
    isPaid: 'Pago',
    amount: 'Valor',
    date: 'Data',
    description: 'Descrição',
    partnerName: 'Parceiro',
    categoryId: 'Categoria',
    paymentType: 'Tipo de pagamento',
    paymentMethod: 'Modo de pagamento',
    flowType: 'Tipo de transação',
    mediaPointId: 'Ponto de mídia',
  };
  return map[field] ?? humanizeEnumLike(field);
};

export function Activities() {
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ActivityResourceType | 'ALL'>('ALL');
  const [actionFilter, setActionFilter] = useState<string | 'ALL'>('ALL');

  // Carregar logs via hook (fonte de verdade)
  const { logs: allLogs, loading, error } = useActivityLogs({});

  // Ordenar por data (mais recentes primeiro)
  const sortedLogs = useMemo(() => {
    return [...allLogs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allLogs]);

  // Obter listas dinâmicas para dropdowns
  const availableResourceTypes = useMemo(() => {
    const set = new Set<ActivityResourceType>();
    (allLogs as ActivityLog[]).forEach((log) => set.add(log.resourceType));
    return Array.from(set.values());
  }, [allLogs]);

  const availableActions = useMemo<ActionOption[]>(() => {
    const map = new Map<string, ActionOption>();
    (allLogs as ActivityLog[]).forEach((log) => {
      const meta = actionMeta(log.action);
      map.set(log.action, { value: log.action, label: meta.label, group: meta.group });
    });

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    return Array.from(map.values()).sort((a, b) => {
      const g = collator.compare(a.group, b.group);
      if (g !== 0) return g;
      return collator.compare(a.label, b.label);
    });
  }, [allLogs]);

  // Aplicar filtros
  const filteredLogs = useMemo(() => {
    let filtered = [...sortedLogs];

    // Filtro de resourceType
    if (resourceFilter !== 'ALL') {
      filtered = filtered.filter(log => log.resourceType === resourceFilter);
    }

    // Filtro de action
    if (actionFilter !== 'ALL') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Filtro de busca por texto
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((log) => {
        const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : '';
        const actionLabel = actionMeta(log.action).label.toLowerCase();
        const resourceName = (log.resourceName ?? '').toLowerCase();
        const userName = (log.userName ?? '').toLowerCase();
        const userEmail = (log.userEmail ?? '').toLowerCase();

        return (
          log.action.toLowerCase().includes(query) ||
          actionLabel.includes(query) ||
          log.resourceType.toLowerCase().includes(query) ||
          resourceName.includes(query) ||
          userName.includes(query) ||
          userEmail.includes(query) ||
          detailsStr.includes(query)
        );
      });
    }

    return filtered;
  }, [sortedLogs, resourceFilter, actionFilter, searchTerm]);

  // Funções auxiliares para UI
  
const getResourceColor = (resource: ActivityResourceType): string => {
  switch (resource) {
    case ActivityResourceType.CLIENTE:
      return 'bg-blue-100 text-blue-800';
    case ActivityResourceType.PROPOSTA:
      return 'bg-purple-100 text-purple-800';
    case ActivityResourceType.CAMPANHA:
      return 'bg-teal-100 text-teal-800';
    case ActivityResourceType.RESERVA:
      return 'bg-cyan-100 text-cyan-800';
    case ActivityResourceType.MIDIA:
      return 'bg-green-100 text-green-800';
    case ActivityResourceType.FINANCEIRO:
      return 'bg-emerald-100 text-emerald-800';
    case ActivityResourceType.USUARIO:
      return 'bg-orange-100 text-orange-800';
    case ActivityResourceType.ASSINATURA:
      return 'bg-red-100 text-red-800';
    case ActivityResourceType.NF:
      return 'bg-yellow-100 text-yellow-800';
    case ActivityResourceType.INTEGRACAO:
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

  
const getResourceLabel = (resource: ActivityResourceType): string => {
  switch (resource) {
    case ActivityResourceType.CLIENTE:
      return 'Cliente';
    case ActivityResourceType.PROPOSTA:
      return 'Proposta';
    case ActivityResourceType.CAMPANHA:
      return 'Campanha';
    case ActivityResourceType.RESERVA:
      return 'Reserva';
    case ActivityResourceType.MIDIA:
      return 'Mídia';
    case ActivityResourceType.FINANCEIRO:
      return 'Financeiro';
    case ActivityResourceType.USUARIO:
      return 'Usuário';
    case ActivityResourceType.ASSINATURA:
      return 'Assinatura';
    case ActivityResourceType.NF:
      return 'NF';
    case ActivityResourceType.INTEGRACAO:
      return 'Integração';
    default:
      return resource;
  }
};

  const formatDateTime = (date: Date | string): string => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderDetails = (log: ActivityLog): ReactNode => {
    const d = log.details as any;
    if (!d) return null;

    // Some older logs may store details as a string.
    if (typeof d === 'string') {
      return <p className="text-sm text-gray-700">{d}</p>;
    }

    const blocks: ReactNode[] = [];

    if (Array.isArray(d.changedFields) && d.changedFields.length) {
      blocks.push(
        <div key="changedFields" className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">Campos alterados:</span>
          {d.changedFields.map((f: string) => (
            <Badge key={f} className="bg-gray-100 text-gray-800">
              {humanizeChangedField(f)}
            </Badge>
          ))}
        </div>
      );
    }

    // Common generic keys
    const maybePairs: Array<{ k: string; label: string }> = [
      { k: 'message', label: 'Mensagem' },
      { k: 'filename', label: 'Arquivo' },
      { k: 'fileName', label: 'Arquivo' },
      { k: 'status', label: 'Status' },
      { k: 'count', label: 'Quantidade' },
    ];

    for (const p of maybePairs) {
      if (d?.[p.k] !== undefined && d?.[p.k] !== null && !Array.isArray(d?.[p.k]) && typeof d?.[p.k] !== 'object') {
        blocks.push(
          <div key={p.k} className="text-sm text-gray-700">
            <span className="font-medium">{p.label}:</span> {String(d[p.k])}
          </div>
        );
      }
    }

    if (!blocks.length) return null;
    return <div className="space-y-2">{blocks}</div>;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Atividades</h1>
        <p className="text-gray-600">Histórico de ações realizadas no sistema</p>
      </div>

      {loading && (
        <div className="mb-4 text-sm text-gray-600">Carregando atividades...</div>
      )}
      {!loading && error && (
        <div className="mb-4 text-sm text-red-600">Erro ao carregar atividades.</div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Campo de busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, ação ou detalhes..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Dropdown de Recursos */}
            <Select
              value={resourceFilter}
              onValueChange={(value: string) => setResourceFilter(value as ActivityResourceType | 'ALL')}
            >
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Recurso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os recursos</SelectItem>
                {availableResourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getResourceLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dropdown de Ações */}
            <Select
              value={actionFilter}
              onValueChange={(value: string) => setActionFilter(value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as ações</SelectItem>
                <SelectSeparator />

                {(() => {
                  const groups = new Map<string, ActionOption[]>();
                  availableActions.forEach((opt) => {
                    const arr = groups.get(opt.group) ?? [];
                    arr.push(opt);
                    groups.set(opt.group, arr);
                  });

                  const ordered = Array.from(groups.entries());
                  return ordered.flatMap(([group, opts], idx) => {
                    const items: ReactNode[] = [];
                    if (idx > 0) items.push(<SelectSeparator key={`${group}-sep`} />);
                    items.push(
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {opts.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                    return items;
                  });
                })()}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atividades */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">
                Nenhuma atividade encontrada com os filtros selecionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log: ActivityLog) => {
            const meta = actionMeta(log.action);
            const detailsNode = renderDetails(log);
            const actor = (log.userName || log.userEmail || '').trim() || 'Sistema';
            return (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Cabeçalho: chip + ação */}
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getResourceColor(log.resourceType)}>
                        {getResourceLabel(log.resourceType)}
                      </Badge>
                      <div className="flex flex-col">
                        <h3 className="text-gray-900">{meta.label}</h3>
                      </div>
                    </div>

                    {/* Referência (sem IDs) */}
                    {log.resourceName && (
                      <p className="text-sm text-gray-700 mb-3">
                        <span className="font-medium">Referência:</span> {log.resourceName}
                      </p>
                    )}

                    {/* Detalhes */}
                    {detailsNode && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-3">
                        {detailsNode}
                      </div>
                    )}

                    {/* Rodapé: usuário e data */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Usuário: {actor}</span>
                      <span>•</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      {/* Nota */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-1">💡 Auditoria</p>
        <p className="text-sm text-blue-700">
          Esta tela é somente leitura e mostra um histórico de ações realizadas no sistema.
          Use os filtros acima para encontrar rapidamente uma ação ou um recurso.
        </p>
      </div>
    </div>
  );
}
