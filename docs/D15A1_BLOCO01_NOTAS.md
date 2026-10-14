# OneMedia — D15A1, bloco 01 (14/10/2026)

## Baseline e escopo

- Frontend de entrada: `OneMedia_frontend_atual11(1).zip`, commit `97e0458` (informado no repositório zipado).
- Backend consultado para contratos: `ooh-manager-api_atual121(1).zip`, commit `131d1c2`.
- **Mudanças: apenas frontend.** Não há migration, configuração AWS, operação Cakto, deploy nem alteração de backend.
- As telas antigas D13J/D13K continuam somente leitura; o novo componente `DoohPlayerOperations.tsx` é exibido em **DOOH > Telas e Players**, depois do inventário.

## Incluído nesta entrega

1. Consulta defensiva autenticada a `/api/dooh/players?page=1&pageSize=100`, com busca por nome/plataforma.
2. Consulta autenticada à lista de `/api/dooh/player-groups` com contagem de membros e agendamentos.
3. Atualização **apenas do campo `name`** via `PATCH /api/dooh/players/:id`.
4. Criação de grupos via `POST /api/dooh/player-groups`, e renomeação via `PATCH /api/dooh/player-groups/:id`.
5. Bloqueio de escrita por `companyId` + grant DOOH `FULL` + papéis `ADMINISTRATIVO`/`TI`, confirmação explícita via diálogo antes da gravação, tratamento sanitizado dos erros e nova consulta após confirmação da API.
6. Validação defensiva das respostas, sem expor installationId, credenciais, metadata, tokens ou detalhes internos de erro.

## Ainda NÃO entregue

- Pareamento por código, QR e cadastro automático de player; integração com app/hardware.
- Alteração de `lifecycleStatus`, ACTIVE_PLAYER, quota, pausa global, replace-player.
- Associação/desassociação SCREEN, membros de grupos, remoções ou exclusões.
- Restart remoto, comando e ACK; histórico operacional de comandos.
- Operações de mídia, playlists, schedules, Proof-of-Play, billing, Cakto e produção.

## Proteções e limitações

- A **API é a autoridade final de RBAC/entitlement e isolamento de tenant**; a validação de frontend é defesa adicional, não substituição.
- A interface não faz escritas automaticamente. Toda mutação exige clique consciente, `FULL` e confirmação.
- `READ_ONLY` permite somente consulta. Sem grant válido ou fora da função técnica, painel oculto.
- Até 100 players são listados por pesquisa; para mais registros, filtrar a consulta.
- A criação/renomeação de grupos pode ocorrer sem player físico e não deve modificar a pausa global DOOH.
- **Não executar mutations no tenant de produção durante a homologação sem aprovação específica de dados QA.**

## Verificação automatizada local

Na raiz do frontend, com Node 22 e dependências já instaladas:

```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs
npm run build
```

No ambiente de elaboração deste patch, **55/55 testes Node passaram** e os novos TS/TSX não apresentaram erro sintático no parser TypeScript. O **build Vite não pôde ser executado** porque `npm ci` não conseguiu baixar dependências (`EAI_AGAIN` no registry npm); o executor deve enviar log do `npm run build` local antes de considerar a entrega validada.

## Smoke controlado — quando autorizado

1. Conferir `GET /api/platform-access` e tenant atual para contas `FULL`, `READ_ONLY` e `NONE`.
2. Com `READ_ONLY`, confirmar consultas sem botões ativos para mutações.
3. Com conta técnica `FULL` e tenant QA aprovado, criar/renomear um grupo exclusivo de QA, sem exclusão; verificar persistência e contagens reais.
4. Se houver player de QA previamente autorizado, editar apenas o nome; conferir persistência e que `lifecycleStatus`, assignment e licença não foram alterados.
5. Validar erro 409 (nome duplicado), 403 (sem permissão), 404 (registro de outro tenant), e recarga da página.
6. Sem autorização para mutações, classificar smoke de escrita como `BLOCKED`, jamais `PASS`.

Decisão de liberação: **D15A1 bloco 01 — patch disponível, aprovação de build e homologação pendentes**.
