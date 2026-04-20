# Novo Cardápio — Etapa 9 (Integração com detalhe, faces, carrinho e envio)

## Objetivo
Conectar o novo `/menu` em formato catálogo ao funil já estável do cardápio público, sem substituir as etapas internas legadas.

## O que foi integrado
- o catálogo agora entra no detalhe do ponto preservando o contexto da vitrine
- detalhe, faces, carrinho e checkout passam a carregar e propagar o contexto de origem do catálogo
- os botões de voltar retornam ao `/menu` quando a navegação começou na nova vitrine
- os filtros ativos do catálogo são preservados durante a navegação do funil
- o catálogo passou a exibir atalho para o carrinho quando houver itens selecionados
- o pós-envio consegue retornar ao catálogo em vez de jogar o usuário apenas na lista legada

## Estratégia adotada
- manter o funil legado (`detalhe -> faces -> carrinho -> checkout -> enviado`)
- adicionar apenas uma camada de contexto de navegação (`source=catalog`)
- reaproveitar os mesmos endpoints e regras existentes
- preservar o comportamento antigo quando o usuário entrar pelo fluxo legado

## Arquivos principais alterados
- `src/lib/menuFlow.ts`
- `src/components/menu/catalog/MenuCatalogPage.tsx`
- `src/components/menu/catalog/MenuCatalogActions.tsx`
- `src/pages/menu-detalhe.tsx`
- `src/pages/menu-faces.tsx`
- `src/pages/menu-carrinho.tsx`
- `src/pages/menu-checkout.tsx`
- `src/pages/menu-enviado.tsx`

## Observações
- esta etapa não troca o funil interno por um funil novo; ela integra a nova entrada visual ao fluxo operacional que já existia
- quando a navegação não vier do catálogo, o comportamento legado continua funcionando
