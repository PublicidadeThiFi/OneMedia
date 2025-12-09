import React from 'react';

// MOCK CLIENTS - Dados internos sempre disponíveis
const MOCK_CLIENTS = [
  {
    id: "cl_1",
    name: "João Silva",
    companyName: "Tech Solutions Ltda",
    email: "joao@techsolutions.com",
  },
  {
    id: "cl_2",
    name: "Maria Santos",
    companyName: "Marketing Pro",
    email: "maria@marketingpro.com",
  },
  {
    id: "cl_3",
    name: "Carlos Oliveira",
    companyName: "Varejo Plus",
    email: "carlos@varejoplus.com",
  },
  {
    id: "cl_4",
    name: "Patricia Alves",
    companyName: "Fashion Brands Brasil",
    email: "patricia@fashionbrands.com",
  },
  {
    id: "cl_5",
    name: "Fernando Costa",
    companyName: "Auto Peças Nacional",
    email: "fernando@autonacional.com",
  },
  {
    id: "cl_6",
    name: "Juliana Mendes",
    companyName: "Food Corporation",
    email: "juliana@foodcorp.com",
  },
];

interface ClientSelectProps {
  value?: string;
  onChange?: (clientId: string) => void;
  onNavigateToClients?: () => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = event.target.value;
    if (onChange && clientId) {
      onChange(clientId);
    }
  };

  return (
    <div className="relative w-full">
      <select
        data-testid="client-select"
        className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-sm shadow-sm transition-colors outline-none appearance-none cursor-pointer pr-10 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        value={value || ""}
        onChange={handleChange}
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        <option value="">Selecione o cliente</option>
        {MOCK_CLIENTS.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name} – {client.companyName}
          </option>
        ))}
      </select>

      {/* Ícone de seta para visual de dropdown */}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-xs">
        ▼
      </span>
    </div>
  );
}