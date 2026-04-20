# Novo Cardápio do Mídia Kit — Etapa 1 (Escopo Congelado)

Fonte verdade desta etapa: `Novo_Cardapio_Etapas.pdf`.

## Objetivo da etapa
Congelar o escopo da mudança completa do cardápio do Mídia Kit antes de iniciar alterações estruturais no frontend e no backend.

## Decisões fechadas
1. A rota `/menu` passa a ser a entrada principal do novo cardápio.
2. O novo cardápio será uma **página-catálogo única**, substituindo a lógica de tela intermediária como experiência principal.
3. O topo do cardápio deverá conter:
   - capa/hero
   - logo
   - última atualização
   - bloco institucional (“Sobre nós”)
4. Os filtros ficarão concentrados na mesma tela.
5. Os pontos serão exibidos em cards.
6. O usuário continuará conseguindo avançar até o funil já existente:
   - `/menu/detalhe`
   - `/menu/faces`
   - `/menu/carrinho`
   - `/menu/checkout`
   - `/menu/enviado`

## Estratégia de transição aprovada
- O novo catálogo será montado em paralelo.
- O fluxo antigo será mantido como fallback temporário durante homologação.
- Nesta etapa **não há troca de rota em produção** nem remoção de páginas antigas.

## Rotas legadas preservadas nesta fase
- `/menu/uf`
- `/menu/cidades`
- `/menu/pontos`
- `/menu/detalhe`
- `/menu/faces`
- `/menu/carrinho`
- `/menu/checkout`
- `/menu/enviado`

## Escopo visual aprovado para as próximas etapas
Blocos obrigatórios do novo `/menu`:
1. hero superior com capa, logo e última atualização
2. bloco “Sobre nós”
3. botões de ação
4. barra de filtros
5. resumo de resultados
6. grade de cards dos pontos

## Escopo funcional aprovado para as próximas etapas
Filtros previstos:
- busca textual
- tipo de mídia
- cidade
- bairro
- ambiente
- disponibilidade / todos os pontos
- ordenação

## Premissas de implementação
- O token continuará sendo obrigatório para acesso público.
- O novo catálogo deverá continuar compatível com o link compartilhado.
- O fluxo de detalhe/carrinho/proposta será preservado nesta primeira entrega.
- Mudanças de payload no backend só entram quando forem realmente necessárias.

## Fora do escopo desta etapa
- refatorar o fluxo interno completo de detalhe, faces, carrinho e checkout
- apagar rotas legadas
- trocar definitivamente o compartilhamento público
- alterar contrato de dados sem validação da Etapa 3

## Entregável desta etapa
- escopo congelado e documentado no repositório
- base de decisão pronta para as Etapas 2 a 12
