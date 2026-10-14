# OneMedia D15A1 — Bloco 05: interface protegida de restart DOOH

Baseline: `OneMedia_frontend_atual16.zip` / commit conhecido `a9bbb78`. Exige backend com gate D15A1-B05 para envio efetivo; sem migração ou alteração de dados.

## Entrega

- Painel **Telas e Players → Reinicialização remota** separado dos componentes de consulta e edição anteriores.
- **Desabilitado por padrão na compilação do frontend**; não há chamadas de restart na distribuição normal.
- Apenas build de QA explicitamente autorizada pode exibir formulário de envio: `VITE_DOOH_RESTART_QA_ENABLED=true`.
- Mesmo em build de QA, o **backend exige independentemente** a flag e a allowlist privada do tenant (`DOOH_ADMIN_RESTART_QA_ENABLED`, `DOOH_ADMIN_RESTART_QA_COMPANY_IDS`). O frontend não é a barreira de segurança principal.
- Exige módulo DOOH `FULL`, empresa exata, role técnica, player `ACTIVE`, heartbeat online, histórico sem `QUEUED`/`DELIVERED`, texto `REINICIAR` e confirmação adicional.
- Usa `Idempotency-Key` estável durante tentativas do mesmo player na sessão. Resposta projetada sem nonce, result, credenciais ou outros campos técnicos.
- Um comando aceito pela API **não comprova reinicialização física, exibição de mídia ou impressão**.

**Não definir as flags de QA nem fazer restart real durante esta validação. Não executar push/deploy automático antes de planejamento de rollout e rollback.** O backend publicado previamente, sem o novo gate, não constitui homologação segura desta interface.

## Comandos de validação

```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs \
  scripts/d15a1-group-command-audit.test.mjs \
  scripts/d15a1-safe-group-membership.test.mjs \
  scripts/d15a1-restart-qa.test.mjs
npm run build
```

Teste cruzado B05-09: usa `ONEMEDIA_BACKEND_ROOT` se definido, ou procura o checkout irmão `../ooh-manager-api` ou `../backend`. Sem backend disponível, marca `SKIP` explicitamente; o Jest backend continua obrigatório. Em ambiente com ambos os repositórios, o esperado é **96/96 PASS, 0 SKIP**.

## Fora do escopo

Sem comandos em hardware, sem backend deploy, sem alterações de quota/licenciamento, sem despausar DOOH, sem delete/purge ou reinício forçado de qualquer serviço de infraestrutura.
