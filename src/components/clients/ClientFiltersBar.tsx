import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { ClientStatus } from '../../types';
import { mockUsers } from '../../lib/mockData';

interface ClientFiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  ownerFilter: string;
  onOwnerChange: (ownerId: string) => void;
}

export function ClientFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  ownerFilter,
  onOwnerChange,
}: ClientFiltersBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca livre */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, empresa, email, telefone ou CNPJ..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value={ClientStatus.LEAD}>Lead</SelectItem>
              <SelectItem value={ClientStatus.PROSPECT}>Prospect</SelectItem>
              <SelectItem value={ClientStatus.CLIENTE}>Cliente</SelectItem>
              <SelectItem value={ClientStatus.INATIVO}>Inativo</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Responsável */}
          <Select value={ownerFilter} onValueChange={onOwnerChange}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {mockUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
