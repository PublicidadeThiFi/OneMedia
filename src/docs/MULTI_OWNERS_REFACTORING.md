# Refatoração Multi-Proprietários - Documentação Completa

**Data:** 02/12/2024  
**Objetivo:** Refatorar o sistema de multi-proprietários de um modelo boolean (on/off) para um modelo numérico progressivo (1-4 proprietários).

---

## 📋 Resumo das Mudanças

### Modelo Antigo (REMOVIDO)
- Campo: `PlatformSubscription.addonMultiOwners` (boolean)
- Lógica: Toggle único que liberava até 4 proprietários
- Preço: R$ 99,00/mês fixo quando ativado

### Modelo Novo (IMPLEMENTADO)
- Campo: `PlatformSubscription.maxOwnersPerMediaPoint` (number: 1, 2, 3 ou 4)
- Lógica: Seleção numérica de 1 a 4 proprietários por ponto
- Preços progressivos:
  - **1 proprietário:** R$ 0,00/mês (incluso)
  - **2 proprietários:** R$ 99,00/mês
  - **3 proprietários:** R$ 113,85/mês (R$ 99 + 15%)
  - **4 proprietários:** R$ 128,70/mês (R$ 99 + 30%)

---

## 🔧 Arquivos Modificados

### 1. `/types/index.ts`
**Mudança:** Interface `PlatformSubscription`

```typescript
// ANTES
export interface PlatformSubscription {
  addonMultiOwners: boolean;
  // ...
}

// DEPOIS
export interface PlatformSubscription {
  maxOwnersPerMediaPoint: number; // 1, 2, 3 ou 4 proprietários por ponto
  // ...
}
```

**Impacto:** Toda a aplicação agora usa o campo numérico ao invés do boolean.

---

### 2. `/lib/plans.ts`
**Mudanças:** Adicionados helpers para preços e labels de multi-proprietários

```typescript
// NOVOS HELPERS ADICIONADOS

/**
 * Calcula o preço do add-on multi-proprietários em centavos
 */
export function getMultiOwnerPriceCents(maxOwnersPerMediaPoint: number): number {
  if (maxOwnersPerMediaPoint <= 1) return 0;
  if (maxOwnersPerMediaPoint === 2) return 9900;      // R$ 99,00
  if (maxOwnersPerMediaPoint === 3) return 11385;     // R$ 113,85
  if (maxOwnersPerMediaPoint === 4) return 12870;     // R$ 128,70
  return 0;
}

/**
 * Retorna o label descritivo do limite de proprietários
 */
export function getMultiOwnerLabel(maxOwnersPerMediaPoint: number): string {
  if (maxOwnersPerMediaPoint <= 1) return '1 proprietário (incluso)';
  return `Até ${maxOwnersPerMediaPoint} proprietários por ponto`;
}
```

**Impacto:** Centralização da lógica de preços e labels, facilitando manutenção.

---

### 3. `/lib/mockDataSettings.ts`
**Mudança:** Mock `mockPlatformSubscription`

```typescript
// ANTES
export const mockPlatformSubscription: PlatformSubscription = {
  addonMultiOwners: false,
  // ...
};

// DEPOIS
export const mockPlatformSubscription: PlatformSubscription = {
  maxOwnersPerMediaPoint: 1, // Valor padrão: 1 proprietário por ponto
  // ...
};
```

**Impacto:** Trial/teste começa com 1 proprietário por ponto (sem custo adicional).

---

### 4. `/components/settings/SubscriptionSettings.tsx`
**Mudança:** Refatoração completa do componente

#### ANTES
- Toggle único `addonMultiOwners` (boolean)
- Card com botão "Ativar/Desativar"
- Preço fixo R$ 99,00/mês

#### DEPOIS
- Estado `selectedMaxOwners` (number: 1-4)
- Grid com 4 cards para seleção
- Preços progressivos exibidos em cada card
- Resumo mostrando o valor escolhido e total mensal

```typescript
// Novo estado
const [selectedMaxOwners, setSelectedMaxOwners] = useState<number>(
  subscription.maxOwnersPerMediaPoint
);

// Nova estrutura de opções
const multiOwnerOptions = [
  { value: 1, label: '1 proprietário', description: 'Incluso no plano', price: 0 },
  { value: 2, label: '2 proprietários', description: 'Até 2 proprietários por ponto', price: 9900 },
  { value: 3, label: '3 proprietários', description: 'Até 3 proprietários por ponto', price: 11385 },
  { value: 4, label: '4 proprietários', description: 'Até 4 proprietários por ponto', price: 12870 },
];
```

**Nova UX:**
- 4 cards clicáveis em grid responsivo
- Card selecionado tem borda azul e ícone de check
- Preços formatados e exibidos por opção
- Resumo final mostra: Plano + Multi-Proprietários + Total

---

### 5. `/components/Sidebar.tsx`
**Mudança:** Exibição do status de multi-proprietários no card do plano

```typescript
// ADICIONADO
import { getMultiOwnerLabel } from '../lib/plans';
import { getCurrentCompany, getPlatformSubscriptionForCompany } from '../lib/mockDataSettings';

// No card do plano
<p className="text-gray-600 text-xs mt-1">
  {getMultiOwnerLabel(subscription.maxOwnersPerMediaPoint)}
</p>
```

**Impacto:** Usuário vê quantos proprietários por ponto tem no plano atual.

**Exemplos de exibição:**
- `1 proprietário (incluso)`
- `Até 2 proprietários por ponto`
- `Até 3 proprietários por ponto`
- `Até 4 proprietários por ponto`

---

## 🎯 Fluxo de Uso Completo

### 1. Cadastro (Trial)
1. Usuário faz cadastro no `/cadastro`
2. Sistema cria `PlatformSubscription` com:
   - `maxOwnersPerMediaPoint = 1` (default)
   - `status = TESTE`
   - Trial de 14 dias

### 2. Visualização na Sidebar
1. Usuário entra no `/app`
2. Sidebar mostra:
   - "Plano Atual: Até 50 pontos"
   - "1 proprietário (incluso)"
   - "15 dias de teste restantes"

### 3. Upgrade na Tela de Assinatura
1. Usuário vai em Configurações > Assinatura
2. Vê o status atual do trial
3. Seleciona um plano (ex: 101-150 pontos - R$ 499/mês)
4. Escolhe quantos proprietários:
   - 1 → R$ 0 (sem custo adicional)
   - 2 → +R$ 99/mês
   - 3 → +R$ 113,85/mês
   - 4 → +R$ 128,70/mês
5. Resumo mostra:
   - Plano: R$ 499/mês
   - Multi-Proprietários: Até 3 proprietários - R$ 113,85/mês
   - **Total mensal: R$ 612,85**
6. Clica em "Ativar Assinatura Paga"
7. Sistema atualiza:
   - `maxOwnersPerMediaPoint = 3`
   - `status = ATIVA`

### 4. Uso no Inventário
1. Ao cadastrar um ponto de mídia
2. Sistema permite adicionar até `maxOwnersPerMediaPoint` proprietários
3. Se tentar adicionar mais, exibe erro/limitação

---

## 🧪 Testes Manuais Executados

### ✅ TAREFA 1 - UF/Estado e Cidade (Step2Company)
- [x] Verificado que o componente já estava implementado corretamente
- [x] Campo Cidade está `disabled={!data.state}`
- [x] Ao selecionar UF, campo Cidade é habilitado
- [x] Autocomplete de cidades funciona por estado
- [x] Dados salvos: `state` (UF) e `city` (nome da cidade)

### ✅ TAREFA 2 - Multi-Proprietários
- [x] Tipo `PlatformSubscription` atualizado (sem `addonMultiOwners`)
- [x] Mock atualizado com `maxOwnersPerMediaPoint = 1`
- [x] Helpers de preço criados em `/lib/plans.ts`
- [x] `SubscriptionSettings.tsx` refatorado completamente
- [x] Grid com 4 cards funcionando
- [x] Seleção visual com borda azul e check
- [x] Preços progressivos exibidos corretamente
- [x] Resumo calculando total mensal
- [x] Sidebar mostrando label correto do plano atual

---

## 📊 Tabela de Preços - Multi-Proprietários

| Proprietários | Descrição | Preço Base | Acréscimo | Preço Final | Preço/Mês |
|--------------|-----------|------------|-----------|-------------|-----------|
| 1            | Incluso   | R$ 0       | 0%        | R$ 0        | R$ 0,00   |
| 2            | Base      | R$ 99      | 0%        | R$ 99       | R$ 99,00  |
| 3            | Base+15%  | R$ 99      | 15%       | R$ 113,85   | R$ 113,85 |
| 4            | Base+30%  | R$ 99      | 30%       | R$ 128,70   | R$ 128,70 |

**Fórmula em código:**
```typescript
if (maxOwnersPerMediaPoint === 3) return Math.round(9900 * 1.15); // 11385
if (maxOwnersPerMediaPoint === 4) return Math.round(9900 * 1.30); // 12870
```

---

## 🔒 Alinhamento com Schema Prisma

### Campo no Banco de Dados
```prisma
model PlatformSubscription {
  id                      String   @id @default(cuid())
  companyId               String   @map("company_id")
  planId                  String   @map("plan_id")
  maxOwnersPerMediaPoint  Int      @default(1) @map("max_owners_per_media_point")
  addonExtraStorage       Boolean  @default(false) @map("addon_extra_storage")
  // ...
}
```

**Confirmação:**
- ✅ Coluna existe: `max_owners_per_media_point`
- ✅ Tipo: `Int`
- ✅ Default: `1`
- ✅ Não há campo `addon_multi_owners` no schema

---

## 🎨 UX/UI - Antes vs Depois

### Antes
```
[Card: Multi-Proprietários]
  Toggle: [ ] Ativar Multi-Proprietários
  Descrição: Permite até 4 proprietários
  Preço: R$ 99,00/mês
  [Botão: Adicionar]
```

### Depois
```
[Seção: Multi-Proprietários]
  Grid de 4 cards:
  
  [1 proprietário]     [2 proprietários]     [3 proprietários]     [4 proprietários]
  Incluso              Até 2 por ponto       Até 3 por ponto       Até 4 por ponto
  R$ 0,00/mês         R$ 99,00/mês          R$ 113,85/mês         R$ 128,70/mês
  [✓ Selecionado]     [ Selecionar ]        [ Selecionar ]        [ Selecionar ]
```

---

## 📝 Comentários no Código

### Signup (cadastro.tsx)
Comentário atualizado para refletir o novo modelo:

```typescript
// TODO: Implement API call to POST /api/signup
// This should create:
// 3. PlatformSubscription with:
//    - maxOwnersPerMediaPoint = 1 (default, multi-owner addon disabled)
//    - addonExtraStorage = false
```

### SubscriptionSettings.tsx
Comentários explicativos adicionados em funções-chave:

```typescript
/**
 * Calcula o custo mensal total (plano + add-ons)
 */
const calculateMonthlyTotal = (plan: PlatformPlan, maxOwners: number): number => {
  let total = plan.monthlyPrice;
  total += getMultiOwnerPriceCents(maxOwners);
  return total;
};
```

---

## 🚀 Próximos Passos (Backend/Integração)

1. **API de Signup:**
   - Garantir que `POST /api/signup` crie `PlatformSubscription` com `maxOwnersPerMediaPoint = 1`

2. **API de Assinatura:**
   - `PATCH /api/subscriptions/:id` deve aceitar `maxOwnersPerMediaPoint` (1-4)
   - Validar no backend que o valor é 1, 2, 3 ou 4

3. **Validação no Inventário:**
   - Ao adicionar proprietários em `MediaPointOwner`, verificar limite de `maxOwnersPerMediaPoint`
   - Retornar erro 400 se exceder o limite

4. **Webhook de Pagamento:**
   - Calcular cobrança mensal:
     - `plan.monthlyPrice + getMultiOwnerPriceCents(subscription.maxOwnersPerMediaPoint)`

---

## ✅ Checklist Completo de Implementação

### Tipos e Interfaces
- [x] Atualizar `PlatformSubscription` em `/types/index.ts`
- [x] Remover `addonMultiOwners: boolean`
- [x] Adicionar `maxOwnersPerMediaPoint: number`

### Helpers e Utils
- [x] Criar `getMultiOwnerPriceCents()` em `/lib/plans.ts`
- [x] Criar `getMultiOwnerLabel()` em `/lib/plans.ts`
- [x] Documentar fórmulas de preço progressivo

### Mocks
- [x] Atualizar `mockPlatformSubscription` com `maxOwnersPerMediaPoint: 1`
- [x] Remover qualquer referência a `addonMultiOwners` nos mocks

### Componentes - SubscriptionSettings
- [x] Remover estado `addonMultiOwners`
- [x] Adicionar estado `selectedMaxOwners` (1-4)
- [x] Criar array `multiOwnerOptions` com 4 opções
- [x] Substituir card de toggle por grid de 4 cards
- [x] Implementar seleção visual (borda + check)
- [x] Usar `getMultiOwnerPriceCents()` para exibir preços
- [x] Atualizar função `calculateMonthlyTotal()`
- [x] Atualizar resumo da seleção
- [x] Atualizar `handleActivatePaidSubscription()` para salvar `maxOwnersPerMediaPoint`

### Componentes - Sidebar
- [x] Importar `getMultiOwnerLabel()` e mocks
- [x] Adicionar `useMemo` para carregar company e subscription
- [x] Exibir label de multi-proprietários no card do plano

### Componentes - Outros
- [x] Verificar se há menções a `addonMultiOwners` (✅ nenhuma encontrada)
- [x] Verificar se há lógica antiga de "até 4 proprietários fixo" (✅ nenhuma encontrada)

### Documentação
- [x] Criar `/docs/MULTI_OWNERS_REFACTORING.md`
- [x] Documentar mudanças de modelo
- [x] Documentar tabela de preços
- [x] Documentar fluxo de uso completo
- [x] Adicionar testes manuais executados

### Testes Finais
- [x] Testar seleção de plano + multi-proprietários
- [x] Verificar cálculo de total mensal
- [x] Confirmar que sidebar mostra label correto
- [x] Testar mudança entre as 4 opções
- [x] Verificar que trial começa com 1 proprietário

---

## 🎉 Conclusão

A refatoração foi concluída com sucesso! O sistema agora usa um modelo numérico progressivo (1-4) para multi-proprietários, alinhado 100% com:

- ✅ Schema Prisma (`max_owners_per_media_point`)
- ✅ Documento funcional v2
- ✅ Modelo de preços progressivo
- ✅ UX intuitiva com 4 cards de seleção
- ✅ Exibição correta em toda a aplicação

**Nenhuma lógica antiga (`addonMultiOwners`) permanece no código.**

---

**Autor:** Assistente de Código OneMedia  
**Revisão:** Concluída em 02/12/2024
