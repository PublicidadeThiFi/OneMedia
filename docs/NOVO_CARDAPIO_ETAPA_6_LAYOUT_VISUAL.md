# Novo Cardápio — Etapa 6 (Construção do novo layout visual)

## Objetivo
Aplicar a camada visual do novo cardápio do Mídia Kit na rota `/menu`, alinhando a experiência ao PDF de referência com:

- hero com capa, logo e última atualização
- bloco institucional “Sobre nós”
- ações rápidas
- barra de filtros visível na mesma tela
- resumo de resultados
- grade de cards com hierarquia comercial mais forte

## Arquivos alterados
- `src/components/menu/catalog/MenuCatalogPage.tsx`
- `src/components/menu/catalog/MenuCatalogHero.tsx`
- `src/components/menu/catalog/MenuCatalogAbout.tsx`
- `src/components/menu/catalog/MenuCatalogActions.tsx`
- `src/components/menu/catalog/MenuCatalogResults.tsx`
- `src/components/menu/catalog/MenuCatalogGrid.tsx`
- `src/components/menu/catalog/MenuCatalogCard.tsx`
- `src/components/menu/catalog/MenuCatalogFilters.tsx` (novo)

## Resultado desta etapa
- a entrada `/menu` passa a ter a estrutura visual principal do novo catálogo
- o hero deixa de ser provisório e passa a refletir o layout institucional do cardápio
- a barra de filtros já aparece integrada à página
- os cards deixam de ser apenas técnicos e ganham leitura comercial mais próxima do design de referência
- o funil legado permanece preservado

## Observação
A Etapa 8 continua responsável pelo refinamento completo da lógica de filtros e ordenação, mas a base visual já está instalada nesta etapa.
