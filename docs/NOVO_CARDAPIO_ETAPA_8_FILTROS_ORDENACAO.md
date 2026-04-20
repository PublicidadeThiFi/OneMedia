# Novo Cardápio — Etapa 8 (Filtros e ordenação)

## Objetivo
Consolidar a lógica de filtros e ordenação dentro da página-catálogo `/menu`, mantendo compatibilidade com o link compartilhado e com o funil legado.

## O que foi ajustado
- centralização da lógica de filtros em `src/lib/menuCatalogFilters.ts`
- manutenção dos filtros via query string (`q`, `type`, `city`, `district`, `environment`, `availability`, `sort`)
- opções dinâmicas de cidade, bairro, ambiente e tipo com contagem por opção
- resumo de resultados baseado no escopo atual do catálogo
- remoção individual de filtros pelos chips do resumo
- limpeza completa dos filtros locais mantendo o token e o fluxo compartilhado

## Comportamento esperado
- o catálogo abre com filtros vindos da URL já aplicados
- o usuário pode alterar filtros sem sair do `/menu`
- as contagens e a listagem reagem imediatamente
- o cardápio continua navegando para o fluxo legado quando necessário
