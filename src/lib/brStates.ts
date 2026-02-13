export type BrStateInfo = {
  uf: string;
  name: string;
};

// Nomes das UFs para exibição.
// (Sem dependências externas; suficiente para o protótipo.)
export const BR_STATES: Record<string, BrStateInfo> = {
  AC: { uf: 'AC', name: 'Acre' },
  AL: { uf: 'AL', name: 'Alagoas' },
  AP: { uf: 'AP', name: 'Amapá' },
  AM: { uf: 'AM', name: 'Amazonas' },
  BA: { uf: 'BA', name: 'Bahia' },
  CE: { uf: 'CE', name: 'Ceará' },
  DF: { uf: 'DF', name: 'Distrito Federal' },
  ES: { uf: 'ES', name: 'Espírito Santo' },
  GO: { uf: 'GO', name: 'Goiás' },
  MA: { uf: 'MA', name: 'Maranhão' },
  MT: { uf: 'MT', name: 'Mato Grosso' },
  MS: { uf: 'MS', name: 'Mato Grosso do Sul' },
  MG: { uf: 'MG', name: 'Minas Gerais' },
  PA: { uf: 'PA', name: 'Pará' },
  PB: { uf: 'PB', name: 'Paraíba' },
  PR: { uf: 'PR', name: 'Paraná' },
  PE: { uf: 'PE', name: 'Pernambuco' },
  PI: { uf: 'PI', name: 'Piauí' },
  RJ: { uf: 'RJ', name: 'Rio de Janeiro' },
  RN: { uf: 'RN', name: 'Rio Grande do Norte' },
  RS: { uf: 'RS', name: 'Rio Grande do Sul' },
  RO: { uf: 'RO', name: 'Rondônia' },
  RR: { uf: 'RR', name: 'Roraima' },
  SC: { uf: 'SC', name: 'Santa Catarina' },
  SP: { uf: 'SP', name: 'São Paulo' },
  SE: { uf: 'SE', name: 'Sergipe' },
  TO: { uf: 'TO', name: 'Tocantins' },
};

export function getBrStateName(uf: string): string {
  const key = String(uf ?? '').trim().toUpperCase();
  return BR_STATES[key]?.name ?? key;
}
