# Novo Cardápio do Mídia Kit — Etapa 5 (Reestruturação da Entrada do Cardápio no Frontend)

Fonte verdade desta etapa: `Novo_Cardapio_Etapas.pdf`.

## Objetivo da etapa
Trocar a antiga tela intermediária de `/menu` por uma entrada unificada do novo catálogo, preservando o token compartilhado, o `ownerCompanyId`, o `flow` e a compatibilidade com o funil legado.

## Arquivos alterados
- `src/pages/menu.tsx`
- `src/lib/menuFlow.ts`
- `src/lib/publicMediaKit.ts`
- `src/components/menu/catalog/MenuCatalogPage.tsx`
- `src/components/menu/catalog/MenuCatalogHero.tsx`
- `src/components/menu/catalog/MenuCatalogAbout.tsx`
- `src/components/menu/catalog/MenuCatalogActions.tsx`
- `src/components/menu/catalog/MenuCatalogResults.tsx`
- `src/components/menu/catalog/MenuCatalogGrid.tsx`
- `src/components/menu/catalog/MenuCatalogCard.tsx`

## O que mudou no frontend
### 1. `/menu` agora abre direto o novo catálogo
A antiga tela de seleção de fluxo foi substituída por uma página-catálogo unificada, ainda compatível com:
- `token`
- `ownerCompanyId`
- `flow`
- filtros vindos do link compartilhado

### 2. Estrutura base do catálogo foi criada
A entrada do novo cardápio agora é composta pelos blocos base previstos nas etapas seguintes:
- hero
- sobre nós
- ações rápidas
- resumo de resultados
- grade inicial de cards

### 3. Compatibilidade com o funil legado foi preservada
Mesmo entrando pelo novo `/menu`, o usuário ainda consegue seguir para:
- `/menu/uf`
- `/menu/cidades`
- `/menu/pontos`
- `/menu/detalhe`
- `/menu/faces`
- `/menu/carrinho`
- `/menu/checkout`
- `/menu/enviado`

### 4. Filtros do link continuam sendo respeitados
A página lê e reaplica no catálogo os filtros vindos pela URL, com suporte inicial para:
- `uf`
- `city`
- `q`
- `type`
- `district`
- `environment`
- `availability`
- `sort`

## Resultado desta etapa
- `/menu` deixa de ser uma tela intermediária e passa a ser a base estrutural do novo catálogo
- o carregamento do payload público continua centralizado no fluxo existente
- a navegação antiga segue disponível como fallback
- as próximas etapas podem evoluir o visual, os cards e os filtros sem precisar trocar novamente a rota de entrada
