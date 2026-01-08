import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { Client } from '../../types';

interface ClientSelectProps {
  value?: string;
  onChange?: (clientId: string) => void;
  onNavigateToClients?: () => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Carrega todos os clientes via paginação (40 por página),
  // para que o select funcione mesmo com limite de pageSize no backend.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const pageSize = 40;
        let page = 1;
        const all: Client[] = [];

        // Itera páginas até não haver mais resultados.
        // Mantém compatibilidade com resposta array (legada) ou objeto paginado.
        for (let guard = 0; guard < 50; guard++) {
          const res = await apiClient.get<any>('/clients', {
            params: {
              page,
              pageSize,
              orderBy: 'name',
              sortOrder: 'asc',
            },
          });

          const payload = res.data;
          const rows: Client[] = Array.isArray(payload) ? payload : payload?.data ?? [];

          all.push(...rows);

          // resposta legada (array): não há mais páginas
          if (Array.isArray(payload)) break;

          // prefer totalPages quando disponível
          const totalPages: number | undefined = payload?.totalPages;
          if (typeof totalPages === 'number' && page >= totalPages) break;

          // fallback: se a página veio menor que pageSize, acabou
          if (!rows.length || rows.length < pageSize) break;

          page += 1;
        }

        if (!cancelled) setClients(all);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

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
