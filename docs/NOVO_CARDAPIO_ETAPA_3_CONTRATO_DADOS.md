# Novo Cardápio do Mídia Kit — Etapa 3 (Revisão do Contrato de Dados)

Fonte verdade desta etapa: `Novo_Cardapio_Etapas.pdf`.

## Objetivo da etapa
Validar exatamente quais dados o frontend já recebe do endpoint público do Mídia Kit, quais blocos do novo catálogo já podem ser alimentados sem mexer no backend e quais lacunas ainda existem para uma versão totalmente administrável.

## Contrato atual validado
O frontend já recebe do endpoint público `/api/public/media-kit` os seguintes blocos principais:

### 1. Empresa selecionada
Origem atual: `company`

Campos validados:
- `id`
- `name`
- `logoUrl`
- `primaryColor`
- `email`
- `phone`
- `site`
- `addressCity`
- `addressState`
- `agencyMarkupPercent`

Uso no novo catálogo:
- logo do hero
- identidade básica da marca
- contatos e ações rápidas

### 2. Pontos do catálogo
Origem atual: `points[]`

Campos validados no ponto:
- `id`
- `name`
- `type`
- `subcategory`
- `description`
- `addressStreet`
- `addressNumber`
- `addressDistrict`
- `addressCity`
- `addressState`
- `latitude`
- `longitude`
- `dailyImpressions`
- `socialClasses`
- `environment`
- `basePriceMonth`
- `basePriceWeek`
- `basePriceDay`
- `mainImageUrl`
- `unitsCount`
- `occupiedUnitsCount`
- `availableUnitsCount`
- `availability`
- `promotion`
- `units[]`

Campos validados na unidade:
- `id`
- `label`
- `unitType`
- `orientation`
- `widthM`
- `heightM`
- `priceMonth`
- `priceWeek`
- `priceDay`
- `imageUrl`
- `isActive`
- `isOccupied`
- `isAvailable`
- `availability`
- `availableOn`
- `blockedFrom`
- `blockedUntil`
- `promotion`
- `effectivePromotion`

Uso no novo catálogo:
- cards de pontos
- detalhamento comercial
- disponibilidade
- preços base e preços por unidade
- futura integração com detalhe/faces

### 3. Estatísticas gerais
Origem atual: `stats`

Campos validados:
- `pointsCount`
- `totalUnits`
- `totalImpressions`
- `totalImpressionsFormatted`

Uso no novo catálogo:
- resumo superior
- resumo de resultados
- contadores comerciais

### 4. Metadados públicos
Origem atual:
- `generatedAt`
- `ownerCompanies`
- `selectedOwnerCompanyId`

Uso no novo catálogo:
- “Última atualização”
- chave para filtros e contexto de responsável
- manutenção do link compartilhado

## Blocos do layout novo já viáveis sem mexer no backend
Com o contrato atual já é possível montar:
1. hero com logo e última atualização
2. bloco de ações rápidas
3. barra de filtros por busca, tipo, cidade, bairro, ambiente e disponibilidade
4. resumo de resultados
5. grade de cards
6. integração posterior com detalhe/faces/carrinho

## Lacunas confirmadas nesta etapa
Os seguintes campos **não existem hoje de forma explícita** no payload público:
- texto institucional “Sobre nós”
- imagem/capa específica do hero
- métricas-resumo prontas no formato final do PDF, como blocos editoriais próprios

## Decisão técnica aprovada nesta etapa
Para reduzir risco e acelerar a entrega:
- a próxima implementação pode seguir com o contrato atual
- o frontend poderá derivar métricas agregadas a partir de `points` e `stats`
- texto institucional e capa do hero ficam oficialmente tratados como **gaps de contrato**, a serem cobertos numa etapa de backend apenas se necessário

## Derivações seguras autorizadas no frontend
Podem ser calculadas no frontend sem alterar o backend:
- quantidade de cidades distintas
- quantidade de bairros distintos
- quantidade de ambientes distintos
- quantidade de tipos de mídia distintos
- total de pontos
- total de unidades/telas/faces
- total de impactos

## Campos que exigiriam backend para ficar 100% administráveis
- `heroImageUrl`
- `aboutText`
- `heroMetrics[]` customizáveis/prontas

## Resultado esperado desta etapa
- contrato atual formalmente validado
- lista de lacunas objetiva
- base pronta para iniciar a implementação visual do novo `/menu` com baixo risco de regressão
