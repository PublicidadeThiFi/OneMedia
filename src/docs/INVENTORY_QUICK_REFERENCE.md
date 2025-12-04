# Referência Rápida - Inventário

## Modelos (Schema Prisma)

### MediaPoint
```typescript
{
  id: string
  companyId: string
  type: MediaType               // OOH | DOOH
  subcategory?: string          // OUTDOOR, PAINEL_LED, etc.
  name: string
  description?: string
  
  // Endereço
  addressZipcode?: string
  addressStreet?: string
  addressNumber?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressCountry?: string
  
  // Localização
  latitude?: number             // Obrigatório
  longitude?: number            // Obrigatório
  
  // Comercial
  dailyImpressions?: number
  socialClasses: string[]       // ['A', 'B', 'C', 'D', 'E']
  environment?: string
  showInMediaKit: boolean
  basePriceMonth?: number
  basePriceWeek?: number
  basePriceDay?: number
  
  // Mídia
  mainImageUrl?: string
  
  createdAt: Date
  updatedAt: Date
}
```

### MediaUnit
```typescript
{
  id: string
  companyId: string
  mediaPointId: string
  unitType: UnitType            // FACE | SCREEN
  label: string
  
  // OOH
  orientation?: Orientation     // FLUXO | CONTRA_FLUXO
  widthM?: number
  heightM?: number
  
  // DOOH
  insertionsPerDay?: number
  resolutionWidthPx?: number
  resolutionHeightPx?: number
  
  // Preços
  priceMonth?: number
  priceWeek?: number
  priceDay?: number
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### MediaPointOwner
```typescript
{
  id: string
  companyId: string
  mediaPointId: string
  ownerName: string
  ownerDocument?: string
  regime?: OwnerRegime          // DER | ADMIN_PUBLICA | AREA_PARTICULAR
  derMonthlyFee?: number
  rentValue?: number
  fixedExpenseDueDay?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### MediaPointContract
```typescript
{
  id: string
  companyId: string
  mediaPointId: string
  fileName: string
  s3Key: string
  signedAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

## Enums

```typescript
enum MediaType {
  OOH = 'OOH',
  DOOH = 'DOOH'
}

enum UnitType {
  FACE = 'FACE',
  SCREEN = 'SCREEN'
}

enum Orientation {
  FLUXO = 'FLUXO',
  CONTRA_FLUXO = 'CONTRA_FLUXO'
}

enum OwnerRegime {
  DER = 'DER',
  ADMIN_PUBLICA = 'ADMIN_PUBLICA',
  AREA_PARTICULAR = 'AREA_PARTICULAR'
}
```

## Constantes

### Subcategorias OOH
```typescript
['OUTDOOR', 'FRONT_LIGHT', 'TOTEM', 'EMPENA', 'PAINEL_RODOVIARIO']
```

### Subcategorias DOOH
```typescript
['PAINEL_LED', 'TELA_DIGITAL', 'PAINEL_ELETRONICO']
```

### Ambientes
```typescript
[
  'Shopping Center',
  'Rodovia',
  'Avenida Principal',
  'Terminal de Ônibus',
  'Centro Comercial',
  'Bairro Residencial',
  'Aeroporto',
  'Estação de Metrô'
]
```

### Classes Sociais
```typescript
['A', 'B', 'C', 'D', 'E']
```

### Estados (UF)
```typescript
['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
```

## Componentes

### Inventory.tsx
**Responsabilidade:** Tela principal do módulo
**Props:** Nenhuma
**State:**
- `mediaPoints`: MediaPoint[]
- `searchQuery`: string
- `typeFilter`: string
- `cityFilter`: string
- Dialogs state

**Funções principais:**
- `handleSavePoint()`
- `handleEditPoint()`
- `handleDuplicatePoint()`
- `handleToggleMediaKit()`
- `handleExportInventory()`
- `getUnitStats()`

### MediaPointFormDialog
**Responsabilidade:** Formulário de cadastro/edição
**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mediaPoint?: MediaPoint | null`
- `onSave: (data: Partial<MediaPoint>) => void`

**Validações:**
- name (obrigatório)
- addressCity (obrigatório)
- addressState (obrigatório)
- latitude (obrigatório)
- longitude (obrigatório)

### MediaPointOwnersDialog
**Responsabilidade:** Gestão de proprietários
**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mediaPointId: string`
- `mediaPointName: string`

**Regras:**
- Máximo 2 proprietários (padrão)
- Add-on libera mais

### MediaPointContractsDialog
**Responsabilidade:** Gestão de contratos
**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mediaPointId: string`
- `mediaPointName: string`

**TODO:** Upload S3 real

### MediaUnitsDialog
**Responsabilidade:** Gestão de unidades (stub)
**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `mediaPointId: string`
- `mediaPointName: string`
- `mediaPointType: MediaType`

**Status:** Placeholder

## Helper Functions

### getMediaUnitsForPoint
```typescript
(mediaPointId: string): MediaUnit[]
```
Retorna unidades de um ponto específico

### getOwnersForPoint
```typescript
(mediaPointId: string): MediaPointOwner[]
```
Retorna proprietários de um ponto

### getContractsForPoint
```typescript
(mediaPointId: string): MediaPointContract[]
```
Retorna contratos de um ponto

## Fluxos Principais

### Criar Ponto
```
1. Clicar "+ Novo Ponto"
2. Selecionar tipo (OOH/DOOH)
3. Preencher campos obrigatórios
4. Selecionar classes sociais
5. "Salvar Ponto"
```

### Editar Ponto
```
1. Menu ⋮ > "Editar ponto"
2. Modificar campos
3. "Salvar Alterações"
```

### Adicionar Proprietário
```
1. Menu ⋮ > "Proprietários"
2. "Adicionar Proprietário"
3. Preencher dados
4. Selecionar regime
5. "Adicionar Proprietário"
```

### Adicionar Contrato
```
1. Menu ⋮ > "Contratos do ponto"
2. "Adicionar Novo Contrato"
3. Selecionar PDF
4. Definir datas
5. "Salvar Contrato"
```

### Exportar
```
1. Clicar "Exportar"
2. CSV baixado automaticamente
```

## Validações

### Campos Obrigatórios
- ✅ name
- ✅ addressCity
- ✅ addressState
- ✅ latitude
- ✅ longitude

### Campos Recomendados
- ⚠️ dailyImpressions
- ⚠️ environment
- ⚠️ socialClasses

### Limites
- 📍 Latitude: -90 a 90
- 📍 Longitude: -180 a 180
- 👥 Proprietários: 2 (padrão)
- 📄 Arquivo: PDF, max 10MB

## Filtros

### Busca
Campos pesquisados:
- name
- addressCity
- addressDistrict
- subcategory

### Tipo
- Todos os tipos
- OOH
- DOOH

### Cidade
Dinâmico baseado em pontos cadastrados

## Exportação CSV

### Colunas
```
ID, Nome, Tipo, Subcategoria, Cidade, Estado, 
Impactos/Dia, Preço Mensal, Mídia Kit
```

### Formato
```csv
ID,Nome,Tipo,Subcategoria,Cidade,Estado,Impactos/Dia,Preço Mensal,Mídia Kit
mp1,Outdoor Av. Paulista 1000,OOH,OUTDOOR,São Paulo,SP,85000,8500,Sim
```

## Importação (Planejado)

### Colunas Esperadas
```
name, type, subcategory, description, 
addressCity, addressState, latitude, longitude, 
dailyImpressions, environment, 
basePriceMonth, showInMediaKit
```

### Formatos
- .xlsx (Excel)
- .csv (CSV)

## Mock Data

### Localização
`/lib/mockData.ts`

### Estrutura
```typescript
export const mockMediaPoints: MediaPoint[]
export const mockMediaUnits: MediaUnit[]
export const mockMediaPointOwners: MediaPointOwner[]
export const mockMediaPointContracts: MediaPointContract[]
```

### Helpers
```typescript
getMediaUnitsForPoint(mediaPointId)
getOwnersForPoint(mediaPointId)
getContractsForPoint(mediaPointId)
```

## TODOs Documentados

### Alta Prioridade
```typescript
// TODO: Implementar CRUD completo de MediaUnit
// TODO: Integrar com API real
// TODO: Implementar upload S3
// TODO: Implementar parser de XLS/CSV
```

### Média Prioridade
```typescript
// TODO: Adicionar mapa interativo
// TODO: Implementar estatísticas de uso
// TODO: Adicionar validação de CNPJ/CPF
// TODO: Template de importação downloadável
```

### Baixa Prioridade
```typescript
// TODO: Atalhos de teclado
// TODO: Modo lista/grid
// TODO: Arquivar pontos
// TODO: Tags customizadas
```

## Comandos Úteis

### Desenvolvimento
```bash
npm run dev          # Iniciar dev server
npm run build        # Build para produção
npm run type-check   # Verificar tipos
```

### Testes (futuros)
```bash
npm run test         # Rodar testes
npm run test:watch   # Modo watch
npm run test:cov     # Cobertura
```

## Atalhos (Planejados)

| Atalho | Ação |
|--------|------|
| `Ctrl+N` | Novo Ponto |
| `Ctrl+F` | Focar busca |
| `/` | Focar busca |
| `Esc` | Fechar dialogs |

## Troubleshooting

### Ponto não aparece no Mídia Kit
✅ Verificar `showInMediaKit = true`

### Unidades não aparecem
✅ Verificar `mediaPointId` correto
✅ Verificar `isActive = true`

### Filtro não funciona
✅ Verificar case-insensitive
✅ Verificar campos nullable

### Validação falha
✅ Conferir campos obrigatórios
✅ Verificar formato de dados

## Recursos

### Documentação
- `/docs/INVENTORY_MODULE.md` - Técnica
- `/docs/INVENTORY_USAGE.md` - Uso
- `/docs/INVENTORY_CHANGELOG.md` - Mudanças
- `/docs/INVENTORY_QUICK_REFERENCE.md` - Esta referência

### Código
- `/components/Inventory.tsx` - Principal
- `/components/inventory/*` - Subdialogs
- `/lib/mockData.ts` - Dados mock
- `/types/index.ts` - Tipos

### Schema
- `schema.prisma` - Fonte da verdade
- Modelos: MediaPoint, MediaUnit, MediaPointOwner, MediaPointContract

---

**Versão:** 2.0.0  
**Última atualização:** 24/11/2024
