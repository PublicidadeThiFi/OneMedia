# Novo Cardápio do Mídia Kit — Etapa 2 (Levantamento Técnico e Estratégia de Transição)

Fonte verdade desta etapa: `Novo_Cardapio_Etapas.pdf`.

## Objetivo da etapa
Preparar a migração do cardápio para o novo catálogo sem desmontar o fluxo atual que já está em produção.

## Decisão central desta etapa
A transição será feita em **paralelo**:
- o novo catálogo será construído para a rota principal `/menu`
- o fluxo legado continuará existindo temporariamente como fallback operacional
- detalhe, faces, carrinho, checkout e envio continuarão funcionando nas rotas já existentes até a etapa de integração

## Inventário técnico validado no frontend
### Entrada atual
- `src/pages/menu.tsx`

### Rotas legadas que precisam permanecer durante a homologação
- `src/pages/menu-uf.tsx`
- `src/pages/menu-cidades.tsx`
- `src/pages/menu-pontos.tsx`
- `src/pages/menu-detalhe.tsx`
- `src/pages/menu-faces.tsx`
- `src/pages/menu-carrinho.tsx`
- `src/pages/menu-checkout.tsx`
- `src/pages/menu-enviado.tsx`

### Base de leitura de dados já existente
- `src/hooks/usePublicMediaKit.ts`
- `src/lib/publicMediaKit.ts`
- `src/lib/menuFlow.ts`

### Ponto de roteamento principal identificado
- `src/App.tsx`

## Estratégia de transição aprovada
1. Não sobrescrever o funil legado de uma vez.
2. Construir o novo catálogo por componentes, em paralelo.
3. Manter as rotas legadas como fallback temporário.
4. Fazer a integração do novo `/menu` com o fluxo legado só depois do catálogo estar visualmente estável.
5. Deixar a limpeza do legado apenas para a etapa final, após homologação.

## Estrutura alvo para as próximas etapas no frontend
### Página de entrada
- `/menu` passa a ser a vitrine principal do catálogo.

### Componentes novos previstos
- `src/components/menu/catalog/MenuCatalogPage.tsx`
- `src/components/menu/catalog/MenuCatalogHero.tsx`
- `src/components/menu/catalog/MenuCatalogAbout.tsx`
- `src/components/menu/catalog/MenuCatalogActions.tsx`
- `src/components/menu/catalog/MenuCatalogFilters.tsx`
- `src/components/menu/catalog/MenuCatalogResults.tsx`
- `src/components/menu/catalog/MenuCatalogGrid.tsx`
- `src/components/menu/catalog/MenuCatalogCard.tsx`

### Reaproveitamento planejado
- token compartilhado
- ownerCompanyId
- flow
- endpoint público atual
- funil legado de detalhe, faces, carrinho, checkout e envio

## Regras operacionais desta etapa
- nenhuma rota existente deve ser removida
- nenhum comportamento público deve ser alterado agora
- nenhuma exclusão de arquivo deve ocorrer nesta etapa
- qualquer novo componente nas próximas etapas deve respeitar a estratégia de paralelismo definida aqui

## Resultado esperado desta etapa
- arquitetura de transição documentada
- inventário técnico consolidado
- base pronta para iniciar revisão de contrato e implementação visual sem regressão operacional
