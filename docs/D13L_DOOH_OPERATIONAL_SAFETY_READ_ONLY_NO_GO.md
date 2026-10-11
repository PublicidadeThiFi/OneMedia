# OneMedia — D13L — Segurança operacional e contrato da consulta DOOH

Status de engenharia: candidato ao QA local, **PRODUCTION NO-GO**. Origem: `OneMedia_frontend_atual7.zip` (contém D13J e D13K); backend de referência `ooh-manager-api_atual112.zip`.

## Escopo aplicado

- Reforço da validação da listagem `GET /api/dooh/players`: coerência básica entre `total`, `totalPages` e `pageSize`, unicidade dos IDs, limites de campos e status `online` compatível com o ciclo de vida.
- **Minimização de dados no frontend**: o backend ainda pode retornar `installationId`, `credential`, `groups`, `mediaPoint` e outros campos administrativos na resposta. Agora `parseDoohPlayerInventoryResponse` projeta somente `id`, `name`, `platform`, `lifecycleStatus`, `online`, `lastSeenAt`, `appVersion`, duas versões de manifest e identificação mínima de tela. O estado React guarda apenas essa projeção. Isso **não altera a resposta HTTP enviada pelo backend** e não elimina esses campos da aba Network do navegador.
- Mensagens de erro HTTP 401, 402/403, 404, 429, 5xx, genéricas e incompatibilidade de contrato, sem interpolar exceções ou dados vindos do servidor.
- Página que deixou de existir por mudança de volume exibe orientação para voltar sem apresentar itens fictícios.
- D13J e D13K preservadas. Nenhuma mutação de player, atribuição, pareamento, manifest ou campanha.

## Critérios locais de aceite

`bash scripts/run-d13l-dooh-operational-safety-qa.sh` **na raiz `OneMedia`** executa 13 testes D13J + 16 D13K + 18 D13L, e Vite build, e só então escreve `D13L_FRONTEND_DOOH_OPERATIONAL_SAFETY_QA_PASS__PRODUCTION_NO_GO`.

Não executa teste HTTP autenticado ponta a ponta com backend ou dispositivo físico. Vite build não demonstra homologação visual. Não executa migrations, manipula banco, AWS, Cakto ou CloudWatch.

## Restrição operacional

Proibido promover `HOLD_NO_PURGE` e `NO_GO` automaticamente. O gate de quota e pausa compartilhada do backend D13D segue obrigatório. Logs offline D13E–D13H mantidos; observabilidade externa permanece no backlog, sem custo novo. A aprovação local desse patch não constitui autorização de produção.
