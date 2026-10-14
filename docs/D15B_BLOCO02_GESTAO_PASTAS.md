# OneMedia — D15B / Bloco 02 — Gestão controlada de pastas

**Baseline:** `OneMedia_frontend_atual18.zip` (commit `3575811`) e backend `ooh-manager-api_atual123.zip`.

## Entregue

- Novo componente independente `DoohFolderOperations` na Biblioteca DOOH, somente quando a listagem de pastas validada está disponível.
- Criação de pastas na raiz ou dentro de pastas do tenant selecionado (`POST /dooh/folders`).
- Renomeação de pasta existente (`PATCH /dooh/folders/:id`), precedida por consulta `GET /dooh/folders/:id` e verificação de nome/parent da lista lida.
- Validação do nome (trim, não vazio, até 120 caracteres, sem caracteres de controle), UUID e parent conhecido.
- Confirmação explícita antes da escrita, proteção pelo grant DOOH `FULL`, tenant exato e função `ADMINISTRATIVO` ou `TI`.
- Projeção estrita da resposta, sem guardar campos confidenciais; classificação segura de erros HTTP.
- Atualização da listagem da Biblioteca após confirmação de sucesso. Consulta do Bloco 01 e todo D15A1 preservados.
- Mudança de contexto de autenticação/empresa durante o preflight bloqueia o envio subsequente.

## Fora do escopo

Nenhuma exclusão de pasta, criação ou exclusão de mídia, alteração de `folderId` de mídia, uploads, processamento, publicação, licenciamento, chamadas ao runtime ou modificações de banco. Não há mudanças no backend nem migrations.

## Limite relevante de concorrência

O contrato existente do backend para renomeação usa `PATCH` sem `expectedName`, `version` ou `If-Match`. O preflight reduz alterações baseadas em leituras defasadas, **mas não é compare-and-set atômico**: outra alteração feita entre o GET e o PATCH ainda pode ser sobrescrita. A interface informa essa limitação. O Bloco 03, voltado à movimentação de mídia, deverá avaliar proteção transacional/versionamento no backend antes de habilitar escrituras mais sensíveis.

## Validação local (frontend)

```bash
node --experimental-strip-types --test \
  scripts/d13j-dooh-player-inventory.test.mjs \
  scripts/d13k-dooh-player-detail.test.mjs \
  scripts/d13l-dooh-player-operational-safety.test.mjs \
  scripts/d15a1-player-operations.test.mjs \
  scripts/d15a1-pairing-assignment.test.mjs \
  scripts/d15a1-group-command-audit.test.mjs \
  scripts/d15a1-safe-group-membership.test.mjs \
  scripts/d15a1-restart-qa.test.mjs \
  scripts/d15b1-media-library-readonly.test.mjs \
  scripts/d15b2-folder-operations.test.mjs
npm run build
```

Somente aplicação local e testes automatizados estão autorizados nesta etapa. Build não homologa integrações nem libera alterações em produção. Qualquer push em branch com deploy automático exige avaliação de rollout e rollback.
