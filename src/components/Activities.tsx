import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Search, Filter, Calendar } from 'lucide-react';
import { ActivityResourceType } from '../types';
import {
  getActivityLogViewModels,
  getDistinctActions,
  getDistinctResourceTypes,
  ActivityLogViewModel,
} from '../lib/mockDataActivityLog';
import { CURRENT_COMPANY_ID } from '../lib/mockData';

export function Activities() {
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ActivityResourceType | 'ALL'>('ALL');
  const [actionFilter, setActionFilter] = useState<string | 'ALL'>('ALL');

  // Carregar e enriquecer logs
  const allLogs = useMemo(() => {
    return getActivityLogViewModels(CURRENT_COMPANY_ID);
  }, []);

  // Ordenar por data (mais recentes primeiro)
  const sortedLogs = useMemo(() => {
    return [...allLogs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allLogs]);

  // Obter listas dinâmicas para dropdowns
  const availableResourceTypes = useMemo(() => {
    return getDistinctResourceTypes(allLogs);
  }, [allLogs]);

  const availableActions = useMemo(() => {
    return getDistinctActions(allLogs);
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
      filtered = filtered.filter(log => {
        const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : '';
        return (
          log.resourceName.toLowerCase().includes(query) ||
          log.resourceId.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.userName.toLowerCase().includes(query) ||
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
      case ActivityResourceType.MIDIA:
        return 'bg-green-100 text-green-800';
      case ActivityResourceType.USUARIO:
        return 'bg-orange-100 text-orange-800';
      case ActivityResourceType.ASSINATURA:
        return 'bg-red-100 text-red-800';
      case ActivityResourceType.NF:
        return 'bg-yellow-100 text-yellow-800';
      case ActivityResourceType.INTEGRACAO:
        return 'bg-indigo-100 text-indigo-800';
    }
  };

  const getResourceLabel = (resource: ActivityResourceType): string => {
    switch (resource) {
      case ActivityResourceType.CLIENTE:
        return 'Cliente';
      case ActivityResourceType.PROPOSTA:
        return 'Proposta';
      case ActivityResourceType.MIDIA:
        return 'Mídia';
      case ActivityResourceType.USUARIO:
        return 'Usuário';
      case ActivityResourceType.ASSINATURA:
        return 'Assinatura';
      case ActivityResourceType.NF:
        return 'NF';
      case ActivityResourceType.INTEGRACAO:
        return 'Integração';
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Atividades (ActivityLog)</h1>
        <p className="text-gray-600">Histórico de ações realizadas no sistema</p>
      </div>

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Dropdown de Recursos */}
            <Select
              value={resourceFilter}
              onValueChange={(value) => setResourceFilter(value as ActivityResourceType | 'ALL')}
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
              onValueChange={(value) => setActionFilter(value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as ações</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
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
          filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Cabeçalho: chip + ação */}
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getResourceColor(log.resourceType)}>
                        {log.resourceLabel}
                      </Badge>
                      <h3 className="text-gray-900">{log.action}</h3>
                    </div>

                    {/* Nome do recurso */}
                    <p className="text-gray-800 mb-1">{log.resourceName}</p>

                    {/* ID do recurso */}
                    <p className="text-sm text-gray-600 mb-2">ID: {log.resourceId}</p>

                    {/* Detalhes (JSON) */}
                    {log.details && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-3">
                        <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                          Detalhes: {JSON.stringify(log.details, null, 2)}
                        </p>
                      </div>
                    )}

                    {/* Rodapé: usuário e data */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Por: {log.userName}</span>
                      <span>•</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Box de Ajuda */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900 mb-2">💡 ActivityLog (Auditoria)</p>
        <p className="text-sm text-blue-700">
          Campos: <strong>companyId</strong>, <strong>userId</strong>, <strong>resourceType</strong>, <strong>resourceId</strong>, <strong>action</strong>, <strong>details</strong> (JSON), <strong>createdAt</strong>.<br />
          resourceType: <strong>CLIENTE</strong> | <strong>PROPOSTA</strong> | <strong>MIDIA</strong> | <strong>USUARIO</strong> | <strong>ASSINATURA</strong> | <strong>NF</strong> | <strong>INTEGRACAO</strong><br />
          Logs não podem ser editados ou excluídos pela empresa. Esta é uma tela somente leitura para auditoria.
        </p>
      </div>
    </div>
  );
}
