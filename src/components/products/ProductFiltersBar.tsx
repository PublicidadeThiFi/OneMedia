import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProductType } from '../../types';

interface ProductFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

export function ProductFiltersBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
}: ProductFiltersBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar por nome, descrição ou categoria..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value={ProductType.PRODUTO}>Produtos</SelectItem>
          <SelectItem value={ProductType.SERVICO}>Serviços</SelectItem>
          <SelectItem value="adicional">Adicionais</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
