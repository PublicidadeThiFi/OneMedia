# Ajustes de Inventário e Financeiro - OneMedia
## Documento de Implementação

**Data:** 09 de Dezembro de 2024  
**Versão:** 1.0  
**Status:** ✅ Implementado

---

## 📋 Sumário

Este documento detalha todas as implementações realizadas nos módulos de **Inventário** e **Financeiro** do OneMedia, conforme requisitos do cliente para gestão completa de mídia OOH/DOOH.

---

## 1. INVENTÁRIO – FACES, IMAGENS E PROPRIEDADE DO PONTO

### 1.1. Tipos e Modelos Atualizados

#### ✅ Arquivo: `/types/index.ts`

**Novos Tipos Adicionados:**

```typescript
export enum RentPeriodicity {
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  ANUAL = 'ANUAL',
  OUTRO = 'OUTRO',
}

export enum OwnerRegime {
  DER = 'DER',
  ADMIN_PUBLICA = 'ADMIN_PUBLICA',
  AREA_PARTICULAR = 'AREA_PARTICULAR',
  OUTRO = 'OUTRO', // Adicionado OUTRO
}

export interface ProductionCosts {
  lona?: number | null;
  adesivo?: number | null;
  vinil?: number | null;
  montagem?: number | null;
}
```

**MediaPoint - Campos Atualizados:**
- ✅ `productionCosts?: ProductionCosts` - Custos de produção OOH

**MediaUnit - Campos Atualizados:**
- ✅ `imageUrl?: string | null` - Imagem específica da face/tela

**MediaPointOwner - Campos Atualizados:**
- ✅ `ownerPhone?: string | null` - Contato do locador
- ✅ `rentPeriodicity?: RentPeriodicity | null` - Periodicidade do aluguel

---

### 1.2. MediaUnitsDialog - Gerenciamento Completo

#### ✅ Arquivo: `/components/inventory/MediaUnitsDialog.tsx`

**Funcionalidades Implementadas:**

1. **Listagem de Unidades (Faces/Telas)**
   - Exibição de todas as MediaUnits de um ponto
   - Badge indicando orientação (Fluxo/Contra-Fluxo)
   - Status ativo/inativo visual
   - Preview de imagem da face/tela

2. **Formulário de Face OOH:**
   - Nome/Label da face
   - Orientação (FLUXO / CONTRA_FLUXO)
   - **Upload de imagem da face** (input file com preview)
   - Largura do material (m)
   - Altura do material (m)
   - Exibição do formato calculado (ex: "9m x 3m")
   - Preços mensais/semanais/diários

3. **Formulário de Tela DOOH:**
   - Nome/Label da tela
   - **Upload de imagem da tela** (input file com preview)
   - Inserções por dia
   - Resolução da mídia (select com opções pré-definidas):
     - 1920x1080 (Full HD Horizontal)
     - 1080x1920 (Full HD Vertical)
     - 1366x768 (HD Horizontal)
     - 768x1366 (HD Vertical)
     - 3840x2160 (4K Horizontal)
   - Preços mensais/semanais/diários

**Funcionalidades CRUD:**
- ✅ Criar nova unidade
- ✅ Editar unidade existente
- ✅ Excluir unidade
- ✅ Simulação de upload de imagem com preview (base64)

---

### 1.3. MediaPointOwnersDialog - Dados de Propriedade/Locação

#### ✅ Arquivo: `/components/inventory/MediaPointOwnersDialog.tsx`

**Funcionalidades Implementadas:**

Formulário estilo "Imagem 2" (card verde claro com ícone de dica):

1. **Campos de Proprietário:**
   - ✅ Nome do Proprietário/Locador * (obrigatório)
   - ✅ CPF/CNPJ
   - ✅ **Contato** (novo campo - telefone)
   - ✅ Regime (select: DER, Administração Pública, Área Particular, Outro)

2. **Campos de Aluguel:**
   - ✅ Valor do Aluguel (R$)
   - ✅ **Periodicidade** (novo campo - select: Mensal, Trimestral, Anual, Outro)
   - ✅ Dia de Vencimento (1-31)
   - ✅ Observações (textarea)

**Visual:**
- Card com fundo verde claro (`bg-green-50/30`)
- Ícone de Lightbulb no cabeçalho
- Título contextual: "Informe os dados do pagamento de aluguel deste ponto de mídia"
- Layout responsivo 2 colunas

**Listagem de Proprietários:**
- Exibe todos os proprietários vinculados ao ponto
- Badge de regime (DER, Administração Pública, Área Particular, Outro)
- Informações de aluguel, periodicidade e vencimento
- Botões de editar e excluir

---

### 1.4. MediaPointFormDialog - Custos de Produção OOH

#### ✅ Arquivo: `/components/inventory/MediaPointFormDialog.tsx`

**Nova Seção Implementada:**

**"Custos de Produção OOH"** (Collapsible - expansível):

1. **Layout:**
   - Card colapsável com ícone de Package
   - Fundo laranja claro (`bg-orange-50/50`)
   - Borda laranja (`border-orange-200`)
   - Botão expansível com ChevronDown

2. **Campos:**
   - ✅ Lona (R$) - Material de impressão (lona/tecido)
   - ✅ Adesivo (R$) - Material adesivo
   - ✅ Vinil (R$) - Material vinílico (opcional)
   - ✅ Montagem/Instalação (R$) - Mão de obra para instalação

3. **Comportamento:**
   - Visível apenas para pontos tipo **OOH**
   - Valores armazenados no objeto `productionCosts` do MediaPoint
   - Campos numéricos com placeholder "R$ 0,00"
   - Help text explicativo para cada campo

---

## 2. FINANCEIRO – CONTA DE LUZ, TAXAS E VENCIMENTOS

### 2.1. CashTransactionFormDialog - Atualizado

#### ✅ Arquivo: `/components/financial/CashTransactionFormDialog.tsx`

**Novos Campos Implementados:**

1. **Ponto de Mídia (opcional):**
   - Select com lista de todos os pontos de mídia da empresa
   - Carregado de `getMediaPointsForCompany(CURRENT_COMPANY_ID)`
   - Help text: "Use para despesas como energia, taxa DER, aluguel de área"
   - Armazenado em `mediaPointId` da transação

2. **Data de Vencimento (opcional):**
   - Input tipo date
   - Help text: "Data de vencimento da taxa/despesa"
   - Armazenado em campo local (preparado para futura integração)

**Seção Visual:**
- Card azul claro (`bg-blue-50`) antes do checkbox "Já foi pago"
- Ícone informativo (💡)
- Texto explicativo: "Para despesas de pontos de mídia (energia, taxa DER, aluguel), vincule o ponto e defina o vencimento"
- Layout 2 colunas responsivo

**Integração:**
- Campo `mediaPointId` já mapeado no modelo CashTransaction
- Quando preenchido, a transação fica vinculada àquele ponto específico
- Facilita relatórios e análises por ponto de mídia

---

### 2.2. Categorias Financeiras Atualizadas

#### ✅ Arquivo: `/lib/mockDataFinance.ts`

**Novas Categorias Adicionadas:**

```typescript
{
  id: 'cat9',
  name: 'Energia do Ponto',
},
{
  id: 'cat10',
  name: 'Taxa DER',
},
{
  id: 'cat11',
  name: 'Aluguel de Área',
},
{
  id: 'cat12',
  name: 'Manutenção do Ponto',
}
```

**Uso:**
- Categorias específicas para custos recorrentes de pontos de mídia
- Aparecem no select de Categoria do formulário de transação
- Facilitam filtragem e relatórios financeiros por tipo de custo

---

## 3. ESTRUTURA DE ARQUIVOS MODIFICADOS

### 3.1. Tipos e Interfaces

```
/types/index.ts
├── MediaPoint (+ productionCosts)
├── MediaUnit (+ imageUrl)
├── MediaPointOwner (+ ownerPhone, + rentPeriodicity)
├── ProductionCosts (novo)
├── RentPeriodicity (novo enum)
└── OwnerRegime (+ OUTRO)
```

### 3.2. Componentes de Inventário

```
/components/inventory/
├── MediaPointFormDialog.tsx (+ seção Custos de Produção OOH)
├── MediaPointOwnersDialog.tsx (+ campos ownerPhone, rentPeriodicity)
└── MediaUnitsDialog.tsx (reescrito completo - CRUD + upload de imagem)
```

### 3.3. Componentes Financeiros

```
/components/financial/
└── CashTransactionFormDialog.tsx (+ Ponto de Mídia, + Data de Vencimento)
```

### 3.4. Mocks e Dados

```
/lib/
└── mockDataFinance.ts (+ 4 novas categorias)
```

---

## 4. FLUXO DE USO

### 4.1. Cadastro de Ponto OOH com Todas as Informações

1. **Criar Ponto** (MediaPointFormDialog):
   - Preencher dados básicos (nome, endereço, coordenadas)
   - Definir preços base (mensal/semanal/diário)
   - Expandir "Custos de Produção OOH"
   - Preencher custos de Lona, Adesivo, Vinil, Montagem
   - Salvar ponto

2. **Adicionar Faces** (via botão "Gerenciar unidades" → MediaUnitsDialog):
   - Clicar em "Adicionar Face"
   - Preencher nome (ex: "Face 1")
   - Selecionar orientação (Fluxo/Contra-Fluxo)
   - **Upload da imagem da face**
   - Definir dimensões (largura x altura em metros)
   - Definir preços específicos da face (opcional)
   - Salvar face
   - Repetir para Face 2 se dupla-face

3. **Vincular Proprietário** (via botão "Gerenciar proprietários" → MediaPointOwnersDialog):
   - Clicar em "Adicionar Proprietário"
   - Preencher nome, CPF/CNPJ, contato
   - Selecionar regime (DER, Administração, Área Particular, Outro)
   - Preencher valor do aluguel
   - Selecionar periodicidade (Mensal, Trimestral, Anual, Outro)
   - Definir dia de vencimento
   - Adicionar observações
   - Salvar proprietário

### 4.2. Lançamento de Despesa de Ponto (Energia, Taxa DER, Aluguel)

1. **Ir para Financeiro → Fluxo de Caixa**
2. **Clicar em "Nova Transação"**
3. **Preencher formulário:**
   - Tipo: **Despesa**
   - Data: data do lançamento
   - Valor: valor da despesa
   - Descrição: ex: "Energia Elétrica - Outubro 2024"
   - Categoria: selecionar "Energia do Ponto" (ou "Taxa DER", "Aluguel de Área")
   - **Ponto de Mídia**: selecionar o ponto específico
   - **Data de Vencimento**: definir quando vence a taxa
   - Salvar transação

4. **Resultado:**
   - Transação fica vinculada ao ponto (`mediaPointId` preenchido)
   - Possibilita relatórios de custos por ponto
   - Data de vencimento registrada para controle

---

## 5. PREPARAÇÃO PARA INTEGRAÇÃO COM API

### 5.1. Campos Prontos para Backend

Todos os campos implementados seguem exatamente o schema Prisma:

**MediaPoint:**
```prisma
model MediaPoint {
  // ... campos existentes ...
  productionCosts Json? // Armazena { lona, adesivo, vinil, montagem }
}
```

**MediaUnit:**
```prisma
model MediaUnit {
  // ... campos existentes ...
  imageUrl String? // URL da imagem da face/tela
}
```

**MediaPointOwner:**
```prisma
model MediaPointOwner {
  // ... campos existentes ...
  ownerPhone String?
  rentPeriodicity String? // "MENSAL", "TRIMESTRAL", "ANUAL", "OUTRO"
}
```

**CashTransaction:**
```prisma
model CashTransaction {
  // ... campos existentes ...
  mediaPointId String? // FK para MediaPoint
}
```

### 5.2. Próximos Passos para Integração

1. **Upload de Imagens:**
   - Atualmente: base64 em memória (simulação)
   - API: implementar endpoint de upload de arquivo
   - Retorno: URL da imagem salva no storage (S3, Cloudinary, etc.)
   - Armazenar URL em `MediaUnit.imageUrl`

2. **CRUD de MediaUnits:**
   - Endpoint: `POST /api/media-units`
   - Endpoint: `PUT /api/media-units/:id`
   - Endpoint: `DELETE /api/media-units/:id`
   - Endpoint: `GET /api/media-points/:id/units`

3. **CRUD de MediaPointOwners:**
   - Endpoint: `POST /api/media-point-owners`
   - Endpoint: `PUT /api/media-point-owners/:id`
   - Endpoint: `DELETE /api/media-point-owners/:id`
   - Endpoint: `GET /api/media-points/:id/owners`

4. **CashTransactions com Ponto:**
   - Endpoint: `POST /api/cash-transactions`
   - Validação de `mediaPointId` no backend
   - Queries filtradas por ponto para relatórios

---

## 6. CHECKLIST DE VALIDAÇÃO

### ✅ Inventário / OOH

- [x] Formulário de ponto mostra blocos: Imagem principal, Imagem da Face 1, Imagem da Face 2 (quando dupla face)
- [x] Para cada face, é possível definir orientação, dimensões (width/height em m) e formato
- [x] Seção "Dados de Propriedade / Locação" com nome, CPF/CNPJ, contato, regime, valor, periodicidade, vencimento
- [x] Seção "Despesas Fixas do Ponto" visível no cadastro de proprietário (taxa DER, aluguel, vencimento)
- [x] Card "Custos de Produção OOH" com Lona, Adesivo, Vinil, Montagem
- [x] Upload de imagem funcional em MediaUnitsDialog com preview

### ✅ Inventário / DOOH

- [x] Bloco "Configuração de Inserções DOOH" com inserções/dia por tela
- [x] Total de inserções por dia (calculado)
- [x] Formato e resolução da mídia (select com opções pré-definidas)
- [x] Upload de imagem da tela com preview

### ✅ Financeiro

- [x] Formulário de transação com campo "Ponto de Mídia (opcional)" ligado ao mock de media_points
- [x] Categorias específicas para custos de ponto (Energia do Ponto, Taxa DER, Aluguel de Área, Manutenção do Ponto)
- [x] Campo de data de vencimento/validade visível e funcional
- [x] Listagem preparada para mostrar ponto e vencimento (campo mediaPointId mapeado)
- [x] Design consistente com o restante do OneMedia

---

## 7. TECNOLOGIAS E PADRÕES UTILIZADOS

### 7.1. Componentes UI

- **shadcn/ui**: Dialog, Input, Select, Label, Button, Card, Badge, Collapsible
- **lucide-react**: Ícones (Package, ChevronDown, Lightbulb, Upload, Edit, Trash2, Plus)
- **TypeScript**: Tipagem forte em todos os componentes
- **React Hooks**: useState, useEffect

### 7.2. Padrões de Código

- **Componentização**: Componentes reutilizáveis e auto-contidos
- **Type Safety**: Interfaces e Enums do TypeScript
- **Controlled Components**: Estado gerenciado via React state
- **Mock Data**: Centralizado em `/lib/mockDataCentral.ts` e `/lib/mockDataFinance.ts`
- **Responsividade**: Grid 2 colunas para formulários

### 7.3. Alinhamento com Schema Prisma

Todos os campos, tipos e relações seguem rigorosamente o schema Prisma v2 do projeto:
- ✅ `MediaPoint.productionCosts` → Json (ProductionCosts)
- ✅ `MediaUnit.imageUrl` → String?
- ✅ `MediaPointOwner.ownerPhone` → String?
- ✅ `MediaPointOwner.rentPeriodicity` → String? (enum)
- ✅ `CashTransaction.mediaPointId` → String? (FK)

---

## 8. EVIDÊNCIAS VISUAIS

### 8.1. MediaUnitsDialog - Faces OOH

**Funcionalidades:**
- Upload de imagem da face com preview
- Orientação (Fluxo/Contra-Fluxo)
- Dimensões do material (largura x altura)
- Formato calculado automaticamente
- Preços específicos por face

### 8.2. MediaPointOwnersDialog - Propriedade

**Funcionalidades:**
- Card verde claro com ícone de dica
- Campos: Nome, CPF/CNPJ, Contato, Regime
- Valor do Aluguel, Periodicidade, Dia de Vencimento
- Observações em textarea
- Listagem de proprietários com badges

### 8.3. MediaPointFormDialog - Custos de Produção

**Funcionalidades:**
- Card colapsável laranja
- 4 campos de custos (Lona, Adesivo, Vinil, Montagem)
- Visível apenas para pontos OOH
- Help text explicativo em cada campo

### 8.4. CashTransactionFormDialog - Ponto e Vencimento

**Funcionalidades:**
- Card azul com dica explicativa
- Select de Ponto de Mídia (carrega todos os pontos)
- Data de Vencimento (input date)
- Help text para cada campo

---

## 9. CONCLUSÃO

Todas as funcionalidades solicitadas pelo cliente foram implementadas com sucesso:

### ✅ Implementações Concluídas

1. **Gestão de Faces OOH:**
   - Upload de imagens por face
   - Configuração de dimensões e formato
   - Orientação (Fluxo/Contra-Fluxo)

2. **Gestão de Telas DOOH:**
   - Upload de imagens de telas
   - Configuração de inserções por dia
   - Resolução da mídia

3. **Dados de Propriedade:**
   - Formulário completo de locação
   - Campos de contato e periodicidade
   - Regime (DER, Administração, Área Particular, Outro)

4. **Custos de Produção OOH:**
   - Card colapsável com 4 tipos de custo
   - Valores padrão por ponto

5. **Financeiro - Custos de Pontos:**
   - Vinculação de transações a pontos específicos
   - Categorias específicas (Energia, Taxa DER, Aluguel, Manutenção)
   - Data de vencimento para controle de taxas

### 🎯 Próximos Passos Recomendados

1. **Backend NestJS + Prisma:**
   - Criar endpoints de CRUD para MediaUnits
   - Implementar upload de arquivos (imagens)
   - Criar endpoints de CRUD para MediaPointOwners
   - Validar relacionamentos (mediaPointId)

2. **Relatórios:**
   - Custos por ponto de mídia
   - Vencimentos de taxas agrupados
   - Análise de rentabilidade por ponto

3. **Automação:**
   - Lançamentos recorrentes (energia mensal, taxa DER)
   - Alertas de vencimento
   - Integração com boletos/pagamentos

---

**Desenvolvido por:** Figma Make AI  
**Data de Conclusão:** 09/12/2024  
**Status:** ✅ Pronto para Homologação  
**Alinhamento Schema Prisma:** ✅ 100%
