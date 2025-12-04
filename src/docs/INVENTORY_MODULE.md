# Módulo de Inventário - Documentação

## Visão Geral

O módulo de Inventário foi completamente refatorado e alinhado 100% com o schema Prisma e escopo funcional v2.

## Estrutura de Arquivos

```
/components
  /inventory
    MediaPointFormDialog.tsx       # Formulário de cadastro/edição de pontos
    MediaPointOwnersDialog.tsx     # Gestão de proprietários (MediaPointOwner)
    MediaPointContractsDialog.tsx  # Gestão de contratos (MediaPointContract)
    MediaUnitsDialog.tsx           # Gestão de unidades/faces/telas (MediaUnit) - stub
  Inventory.tsx                    # Componente principal

/lib
  mockData.ts                      # Dados mock tipados + helpers

/types
  index.ts                         # Tipos TypeScript gerados do schema Prisma
```

## Modelos Implementados

### 1. MediaPoint (Ponto Físico)

**Campos principais:**
- `type`: OOH | DOOH
- `subcategory`: OUTDOOR, EMPENA, FRONT_LIGHT, TOTEM, PAINEL_RODOVIARIO (OOH) | PAINEL_LED, TELA_DIGITAL, PAINEL_ELETRONICO (DOOH)
- `name`: Nome do ponto
- `description`: Descrição
- **Endereço completo**: addressZipcode, addressStreet, addressNumber, addressDistrict, addressCity, addressState, addressCountry
- **Localização**: latitude, longitude (obrigatórios)
- **Comercial**: dailyImpressions, socialClasses (array: A/B/C/D/E), environment, showInMediaKit
- **Preços base**: basePriceMonth, basePriceWeek, basePriceDay
- **Mídia**: mainImageUrl

### 2. MediaUnit (Faces/Telas)

**Campos principais:**
- `unitType`: FACE (OOH) | SCREEN (DOOH)
- `label`: Ex: "Face 1 - Fluxo"
- **OOH**: orientation (FLUXO/CONTRA_FLUXO), widthM, heightM
- **DOOH**: insertionsPerDay, resolutionWidthPx, resolutionHeightPx
- **Preços**: priceMonth, priceWeek, priceDay
- `isActive`: boolean

**Status:** Stub implementado - tela completa pendente

### 3. MediaPointOwner (Proprietários)

**Campos principais:**
- `ownerName`: Nome do proprietário
- `ownerDocument`: CNPJ/CPF
- `regime`: DER | ADMIN_PUBLICA | AREA_PARTICULAR
- `derMonthlyFee`: Taxa mensal DER
- `rentValue`: Valor do aluguel
- `fixedExpenseDueDay`: Dia do vencimento
- `notes`: Observações

**Limite:** Por padrão 2 proprietários por ponto. Add-on "Multi-Proprietários" permite mais.

### 4. MediaPointContract (Contratos)

**Campos principais:**
- `fileName`: Nome do arquivo
- `s3Key`: Chave S3 para armazenamento
- `signedAt`: Data de assinatura
- `expiresAt`: Data de expiração

**TODO:** Integração real com S3 para upload/download

## Funcionalidades Implementadas

### ✅ Tela Principal (Inventory.tsx)

1. **Cards de Resumo**
   - Total de Pontos
   - Pontos OOH
   - Pontos DOOH
   - Unidades (Faces/Telas)
   - Dados calculados dinamicamente

2. **Filtros e Busca**
   - Busca textual: nome, cidade, bairro, subcategoria
   - Filtro por tipo: Todos / OOH / DOOH
   - Filtro por cidade: dinâmico baseado nos pontos
   - Contador de resultados

3. **Cards de Pontos**
   - Imagem do ponto (mainImageUrl)
   - Badges: tipo e subcategoria
   - Informações: nome, localização, unidades, impactos, preço
   - Tag de ambiente
   - Toggle "Mídia Kit" (showInMediaKit)
   - Menu de três pontinhos com ações

4. **Menu de Ações (⋮)**
   - ✅ Editar ponto
   - ✅ Gerenciar unidades (stub)
   - ✅ Proprietários / Empresas vinculadas
   - ✅ Contratos do ponto
   - ✅ Duplicar ponto

5. **Botões de Header**
   - ✅ + Novo Ponto
   - ✅ Importar (estrutura básica)
   - ✅ Exportar (CSV funcional)

### ✅ Formulário de Ponto (MediaPointFormDialog)

**Seções:**
1. Informações Básicas
   - Nome, subcategoria, descrição
   
2. Localização
   - Endereço completo (CEP, rua, número, bairro)
   - Cidade, estado (dropdown), país
   - Latitude, longitude (obrigatórios)

3. Dados Comerciais e Audiência
   - Impactos diários
   - Ambiente (dropdown)
   - Classes sociais (multi-select com badges)
   - Preços: mensal, semanal, diário

4. Visibilidade
   - Checkbox "Exibir no Mídia Kit"

**Validações:**
- Nome obrigatório
- Cidade obrigatória
- Estado obrigatório
- Latitude obrigatória
- Longitude obrigatória
- Aviso se não preencher impactos diários

**Comportamento:**
- Tabs OOH/DOOH controlam o tipo
- Subcategorias mudam conforme o tipo
- Modo criação e edição no mesmo componente
- Salva em estado local (mock)

### ✅ Proprietários (MediaPointOwnersDialog)

**Funcionalidades:**
- Lista de proprietários do ponto
- Adicionar novo proprietário
- Editar proprietário existente
- Remover proprietário
- Validação de limite (2 proprietários padrão)
- Aviso sobre add-on Multi-Proprietários
- Campos específicos por regime (DER vs particular)

### ✅ Contratos (MediaPointContractsDialog)

**Funcionalidades:**
- Lista de contratos do ponto
- Upload de arquivo (estrutura preparada)
- Metadados: data assinatura, data expiração
- Geração automática de s3Key
- Download de contrato (estrutura preparada)
- Remoção de contrato

**TODO:** Integração real com S3

### ⏳ Unidades (MediaUnitsDialog)

**Status:** Stub/Placeholder

**Planejado:**
- CRUD completo de MediaUnit
- Formulário específico OOH (orientation, dimensões)
- Formulário específico DOOH (inserções, resolução)
- Listagem com status de ocupação
- Ativar/desativar unidades
- Preços individuais por unidade

## Dados Mock

**Localização:** `/lib/mockData.ts`

**Conteúdo:**
- `mockMediaPoints`: 3 pontos de exemplo
- `mockMediaUnits`: 5 unidades de exemplo
- `mockMediaPointOwners`: 3 proprietários
- `mockMediaPointContracts`: 2 contratos
- Helpers: `getMediaUnitsForPoint()`, `getOwnersForPoint()`, `getContractsForPoint()`
- Constantes: subcategorias, ambientes, estados, classes sociais

## Próximos Passos (TODO)

### Alta Prioridade

1. **MediaUnitsDialog - Implementação Completa**
   - Formulário de cadastro de unidades
   - Diferenciação OOH vs DOOH
   - Gestão de ativação/desativação
   - Visualização de ocupação

2. **Integração com API Backend**
   - Substituir mock por chamadas reais
   - Endpoints: GET/POST/PUT/DELETE para MediaPoint
   - Endpoints para MediaUnit, MediaPointOwner, MediaPointContract

3. **Upload S3**
   - Integração real para contratos
   - Upload de imagens de pontos (mainImageUrl)
   - Geração de presigned URLs

### Média Prioridade

4. **Importação de Inventário**
   - Parser de XLS/CSV
   - Validação de dados
   - Feedback de erros/sucessos
   - Template downloadável

5. **Mapa Interativo**
   - Google Maps / Mapbox
   - Pins por ponto (latitude/longitude)
   - Filtros no mapa
   - Clique em pin abre detalhes

6. **Estatísticas de Inventário**
   - Cliques em pontos do Mídia Kit
   - Mídias mais visualizadas
   - Buscas sem resultado
   - Cidades mais procuradas

### Baixa Prioridade

7. **Funcionalidades Avançadas**
   - Arquivar pontos
   - Histórico de alterações
   - Comentários/anotações por ponto
   - Tags customizadas
   - Fotos adicionais (galeria)

## Convenções de Código

1. **Nomenclatura:**
   - Usar EXATAMENTE os nomes do schema Prisma
   - Não inventar novos campos
   - Comentar com `// TODO:` funcionalidades pendentes

2. **Tipos:**
   - Importar de `/types/index.ts`
   - Usar interfaces completas
   - Tipar dados mock corretamente

3. **Componentes:**
   - Um arquivo por dialog/modal
   - Prefixo claro: MediaPoint*, MediaUnit*
   - Props tipadas com interfaces

4. **Estado:**
   - useState para mock local
   - Preparar para substituição por API calls
   - Manter imutabilidade

5. **Comentários TODO:**
   ```typescript
   // TODO: Integrar com API real
   // TODO: Implementar upload S3
   // TODO: Adicionar validação de CNPJ
   ```

## Alinhamento com Schema

✅ **100% alinhado** - Todos os campos usam nomenclatura exata do Prisma
✅ **Sem invenções** - Nenhum campo ou modelo criado fora do schema
✅ **Enums corretos** - MediaType, UnitType, Orientation, OwnerRegime
✅ **Relacionamentos** - MediaPoint → MediaUnit, MediaPointOwner, MediaPointContract

## Limitações Conhecidas

1. Dados em mock (não persistem)
2. Upload S3 não implementado (estrutura pronta)
3. MediaUnit sem CRUD completo (stub)
4. Importação/Exportação básicas
5. Sem integração com backend
6. Sem mapa interativo
7. Sem estatísticas de uso

## Testes Manuais

### Checklist de Funcionalidades

- [ ] Criar novo ponto OOH
- [ ] Criar novo ponto DOOH
- [ ] Editar ponto existente
- [ ] Duplicar ponto
- [ ] Toggle Mídia Kit
- [ ] Buscar por nome
- [ ] Filtrar por tipo
- [ ] Filtrar por cidade
- [ ] Adicionar proprietário
- [ ] Editar proprietário
- [ ] Remover proprietário
- [ ] Adicionar contrato (metadados)
- [ ] Exportar inventário (CSV)
- [ ] Validação de campos obrigatórios
- [ ] Multi-select de classes sociais
- [ ] Cálculo correto de unidades ativas

## Referências

- **Schema Prisma:** `/prisma/schema.prisma`
- **Escopo Funcional v2:** Seção Inventário/Mídia Kit
- **Documento Infra:** Seção 11.2 - Inventário de pontos de mídia
