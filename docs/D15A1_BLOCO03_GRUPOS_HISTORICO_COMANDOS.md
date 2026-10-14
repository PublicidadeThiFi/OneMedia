# OneMedia D15A1 — Bloco 03 — Consulta de membros e comandos

Data-base: 14/10/2026. Baseline de entrada: `OneMedia_frontend_atual13.zip` (commit informado nos logs: `983fd5c`). Backend de referência: `ooh-manager-api_atual121(1).zip`.

## Escopo implementado
- Adicionado `DoohPlayerAuditReadOnly` à seção DOOH > Telas/Players, **sem substituir** os componentes D13J/K ou D15A1 blocos 01/02.
- Listagem autenticada de grupos (`GET /api/dooh/player-groups`) e inventário (`GET /api/dooh/players?page=1&pageSize=100`).
- Composição de membros de grupo (`GET /api/dooh/player-groups/:id`) com nome, status técnico, conectividade e data de associação.
- Histórico dos **até 50 comandos recentes** (`GET /api/dooh/players/:id/commands`) com tipo, status e datas de requisição/expiração.
- Projeções estritas dos DTOs para não armazenar/mostrar `installationId`, `nonce`, tokens, hashes, dados de solicitante, e-mail, `result` nem `metadata`.
- Permissões de leitura: mesmo `companyId`, DOOH concedido com modo diferente de NONE, papéis ADMINISTRATIVO/TI. Não se infere grant por rótulo comercial.
- Requisições canceláveis e seleção vinculada a contexto de usuário/empresa/grant/papel; respostas inválidas ocultadas.

## Deliberadamente NÃO incluído
- Sem POST, PUT, PATCH ou DELETE neste novo componente.
- Sem reiniciar players, emitir pairing, alterar grupos, reatribuir SCREEN ou alterar licenças/pausa.
- O endpoint GET de comandos pode expirar comandos vencidos internamente no backend, mas a UI não enfileira nem confirma comandos.
- A exibição de `ACKED` é um estado técnico da API, não prova certificada de execução física ou de exibição de mídia.
- Alteração de membros via `PUT /player-groups/:id/members` **substitui o conjunto inteiro**. Não expor ainda sem plano de concorrência/consistência (risco de remover membros cadastrados por outro operador).
- Device runtime, media upload, agendas, proof-of-play e billing continuam fora deste bloco.

## Alterações
1. `src/components/DoohFoundationPage.tsx` — import/rendimento do novo componente; copy atualizada.
2. `src/components/DoohPlayerAuditReadOnly.tsx` — nova UI GET somente leitura.
3. `src/lib/doohPlayerAuditContract.ts` — validação e projeções dos DTOs, erros genéricos seguros.
4. `scripts/d15a1-group-command-audit.test.mjs` — contratos e não regressão.
5. Este documento.

Sem alteração de backend, Prisma, `.env`, Cakto, plano comercial, AWS, GitHub Actions nem produção.

## Aplicação local
Na raiz do frontend `OneMedia`, com o patch na pasta paralela `../GPT`:

```bash
unzip -o "../GPT/OneMedia_D15A1_BLOCO03_Grupos_Comandos_Consulta_patch.zip" -d .
```

## Verificação
```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs \
  scripts/d15a1-group-command-audit.test.mjs

npm run build
```

Evidência no ambiente de edição: 76/76 testes PASS, checagem sintática TS/TSX aprovada; `npm run build` depende da instalação de dependências da máquina do executor. Os testes não são homologação real do runtime/player.

## Gate de continuidade
Antes de implementar a substituição de membros e o comando de restart: especificar a proteção de concorrência e o processo de homologação controlada de efeitos em equipamento QA; continuar preservando `HOLD_NO_PURGE` e `GLOBAL paused=true` (somente backend aplica pausa e quota).
