# OneMedia — D15C Bloco 04 — Ordenação segura do rascunho

## Escopo

Interface `DoohPlaylistDraftReorder` em Programação → Playlists. Botões Subir/Descer operam sobre estado local, com opção de descartar e confirmação antes de salvar. Somente acesso `DOOH FULL` e papéis `ADMINISTRATIVO`/`TI` da empresa autenticada.

`GET /dooh/playlists/:id/draft/items` identifica o rascunho e sua ordem original. Antes de gravar, a interface faz um novo GET e rejeita alterações concorrentes observadas (ID do draft, itens, versões e durações). `PUT /dooh/playlists/:id/draft/items/order-cas` envia `expectedDraftId`, `expectedItemIds` e `itemIds`. A nova rota exige CAS dentro da transação no backend. Um `409` exige atualizar e revisar, nunca repetir silenciosamente.

### Limitações explícitas

- Não publica playlist, não aciona player, não altera agenda ou manifest e não provisiona AWS.
- A nova rota exige backend atualizado. CI de frontend não comprova atualização do backend de produção.
- Não há teste real de PostgreSQL nem de interface autenticada neste pacote.
- Máximo técnico de 200 itens (não é cota comercial); nenhuma ordenação com menos de dois itens.
- Logs e notificações não devem incluir URLs privadas, tokens ou bodies brutos.
- Endpoint legado de ordem é preservado por compatibilidade, mas nunca usado pela nova interface.

## Validação

1. Aplicar o patch backend e o frontend em seus respectivos repositórios locais.
2. Rodar Jest do CAS e da regressão de itens no backend, seguido de `npm run build`.
3. Rodar regressão Node no frontend (D13J/K/L, D15A1, D15B, D15C01-04), seguida de `npm run build`.
4. Não autorizar deploy com base apenas em CI; em eventual rollout, aprovar backend primeiro, verificar endpoint e rollback, depois frontend.

## Rollback

Reverter o componente e sua integração no frontend; no backend, reverter a rota/DTO/método adicionados, preservando o legado. Nenhuma migration ou alteração de schema compõe este patch.
