import { Search, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProposalStatus } from '../../types';

interface ProposalFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onOpenAdvancedFilters: () => void;
}

export function ProposalFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onOpenAdvancedFilters,
}: ProposalFiltersBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar por título ou cliente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value={ProposalStatus.RASCUNHO}>Rascunho</SelectItem>
          <SelectItem value={ProposalStatus.ENVIADA}>Enviada</SelectItem>
          <SelectItem value={ProposalStatus.APROVADA}>Aprovada</SelectItem>
          <SelectItem value={ProposalStatus.REPROVADA}>Reprovada</SelectItem>
          <SelectItem value={ProposalStatus.EXPIRADA}>Expirada</SelectItem>
        </SelectContent>
      </Select>
      
      <Button variant="outline" className="gap-2" onClick={onOpenAdvancedFilters}>
        <Filter className="w-4 h-4" />
        Mais Filtros
      </Button>
    </div>
  );
}
