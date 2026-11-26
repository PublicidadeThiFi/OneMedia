# OneMedia DOOH — UX10/F3A — Gerenciar conteúdo (26/11/2026)

## Escopo entregue

Na área **Minhas telas** cada tela operacional passa a ter a ação **Gerenciar conteúdo**. A pessoa escolhe mídia READY por nome, consulta versão preparada, define segundos, adiciona e remove itens, organiza a sequência por botões Subir/Descer e salva a ordem. A tela aceita rascunho mesmo sem dispositivo pareado. O formulário de upload seguro já existente foi incorporado no contexto da tela: upload não publica e o estado de preparação é consultado de maneira limitada, sem forçar worker ou criar chamadas de publicação.

## Backend necessário

UX10/F3A com as rotas `GET content-capabilities`, `GET :id/content-draft` e `POST :id/content-draft`, schema/migração aditiva. Contratos rígidos rejeitam empresa e dados incorretos. Para modificar itens são usadas somente APIs CAS já existentes (`add-cas`, `remove-cas`, `order-cas`). A interface bloqueia alterações quando não existe permissão FULL ou quando `DOOH_GUIDED_DRAFT_ENABLED` não está ativo.

## Limites expressos

- O rascunho está ligado à tela no banco, mas **não** significa agenda publicada, manifesto instalado nem vídeo reproduzido.
- A escolha de horários e a orquestração das publicações playlist/schedule/manifesto pertencem ao **UX10/F3B**. Não foram simuladas nem ativadas.
- Nenhuma mudança feita no frontend do Player Web, código de pareamento, S3, CloudFront, worker, Cakto, licenças ou quotas.
- O fluxo antigo de playlists e agendas continua intacto para operações técnicas e histórico existente.
- O botão depende de deploy/migração/flag, que ficarão adiados até a finalização das integrações.

## Testes

`node --experimental-strip-types --test scripts/ux10-guided-content.test.mjs`: 7/7 testes do contrato, CAS e fail-closed.
`node --experimental-strip-types --test scripts/ux09-operational-screens-contract.test.mjs`: 5/5 regressões UX09.
`node --experimental-strip-types --test scripts/ux01-ux05-functional.test.mjs`: 7/7 regressões UX01–UX05.
`npm run security:scan`: aprovado.

A validação sintática via TypeScript transpileModule não substitui build Vite/Nest e Jest do Mac. UX10/F3A ainda precisa ser validado no repositório local antes de abrir PR.
