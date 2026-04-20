# Refinamento do Novo Cardápio — Etapa 1 (Escopo visual e funcional congelado)

Fontes verdade desta etapa:
- `Refinamento_Novo_Cardapio_Etapas.pdf`
- `Mídia Kit.pdf`

## Objetivo da etapa
Congelar o escopo visual e funcional do refinamento final do cardápio público antes de iniciar mudanças estruturais e interativas no frontend e nos payloads públicos do backend.

## Decisões fechadas desta rodada
1. O cardápio público seguirá o visual de catálogo comercial do `Mídia Kit.pdf`.
2. Os botões `Ver pontos` e `Compartilhar` acima da área de filtros deixam de fazer parte do layout final.
3. A capa principal passará a usar `fundo_capa_cardapio_global.png` com overlay de:
   - logo da empresa dona do cardápio
   - texto `Última atualização em ...`
4. A data de última atualização deverá refletir a última mudança relevante do inventário público.
5. Os cards passam a seguir o formato horizontal compacto do design desejado.
6. Cada card deverá suportar:
   - carrossel de mídia
   - imagem e vídeo
   - modal para vídeo expandido
   - flip para mapa interativo
7. A seleção comercial continuará existindo, mas sem poluir o layout:
   - `Selecionar Pontos`
   - `Cancelar seleção`
   - `Adicionar ao carrinho`
   - `Ver carrinho`
8. Apenas itens com status `Disponível` poderão ser selecionados.
9. Carrinho e telas seguintes serão refinados visualmente sem quebrar contratos, inputs, outputs e integrações já existentes.

## Escopo visual obrigatório
Blocos obrigatórios do fluxo público refinado:
1. cabeçalho/capa institucional responsiva
2. bloco `Sobre nós` em texto corrido e comercial
3. área única de filtros e resumo do catálogo
4. grade de cards horizontais compactos
5. barra de ações de seleção e carrinho
6. continuidade visual do fluxo público após a vitrine inicial

## Escopo funcional obrigatório
Funcionalidades obrigatórias desta rodada:
- filtros responsivos com limpeza total e retorno ao estado padrão
- carrossel por card com estado independente
- vídeo com overlay e modal fechável por clique externo ou `X`
- flip de card para mapa interativo com reversão no mesmo card
- modo de seleção com restrição por disponibilidade
- integração com o carrinho já existente

## Premissas de implementação
- O token público continua obrigatório.
- O backend atual deve ser preservado sempre que possível.
- Mudanças de contrato entram apenas quando forem necessárias para suportar `lastInventoryChangeAt`, galeria de mídia e mapa/carrossel.
- O design das áreas do dono não entra no escopo desta rodada.
- O fluxo público já existente continua sendo a base operacional até a homologação final.

## Fora do escopo desta etapa
- publicar a interface final
- remover rotas legadas ou código antigo
- reescrever regras de negócio do carrinho/checkout
- alterar telas internas do dono
- introduzir mudanças não previstas nas fontes verdade desta rodada

## Entregáveis desta etapa
- documento de escopo final desta rodada
- base tipada para guiar as próximas etapas de refinamento sem alterar o comportamento atual
