# Novo Cardápio do Mídia Kit — Etapa 4 (Ajustes de Backend)

Fonte verdade desta etapa: `Novo_Cardapio_Etapas.pdf`.

## Objetivo da etapa
Preparar o frontend para consumir o payload expandido do endpoint público do Mídia Kit, mantendo compatibilidade com o fluxo atual.

## Arquivos alterados
- `src/lib/publicMediaKit.ts`
- `src/lib/menuCatalogDataContract.ts`

## O que mudou no frontend
### 1. Tipagem do payload público foi expandida
O tipo `PublicMediaKitResponse` agora reconhece:
- `heroImageUrl`
- `aboutText`
- `heroMetrics[]`

### 2. O contrato do catálogo foi atualizado
O helper de contrato do novo cardápio agora:
- lê os campos dedicados do hero quando presentes
- continua com fallback seguro caso o backend retorne payload antigo
- centraliza as métricas do topo em um único ponto

### 3. Compatibilidade preservada
Mesmo com os novos campos disponíveis:
- nenhuma tela existente foi quebrada
- o consumo legado continua válido
- o frontend já fica pronto para as próximas etapas visuais

## Resultado desta etapa
O frontend passa a reconhecer oficialmente o novo bloco de dados do hero do cardápio e fica alinhado ao payload expandido do backend para as próximas entregas.
