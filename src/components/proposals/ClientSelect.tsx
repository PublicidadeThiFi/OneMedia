import React, { useMemo } from 'react';
import { useClients } from '../../hooks/useClients';
import { Client } from '../../types';

interface ClientSelectProps {
  value?: string;
  onChange?: (clientId: string) => void;
  onNavigateToClients?: () => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  const { clients, loading } = useClients({ pageSize: 500 });

  const options = useMemo(() => {
    return (clients || []).map((c: Client) => ({
      id: c.id,
      label: `${c.contactName || 'Sem nome'}${c.companyName ? ` – ${c.companyName}` : ''}`,
    }));
  }, [clients]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = event.target.value;
    if (onChange && clientId) onChange(clientId);
  };

  return (
    <div className="relative w-full">
      <select
        data-testid="client-select"
        className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-sm shadow-sm transition-colors outline-none appearance-none cursor-pointer pr-10 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        value={value || ''}
        onChange={handleChange}
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
        disabled={loading}
      >
        <option value="">{loading ? 'Carregando clientes...' : 'Selecione o cliente'}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-xs">
        ▼
      </span>
    </div>
  );
}
