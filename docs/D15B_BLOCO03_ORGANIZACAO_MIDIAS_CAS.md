# D15B — Bloco 03 — Organização de Mídias DOOH

## Entregue

- Seleção de uma das até 100 mídias retornadas no filtro atual.
- Renomeação e movimentação entre pastas existentes ou raiz, uma ação por vez.
- Confirmação explícita pelo usuário, preflight GET e checagem de snapshot.
- Endpoint exclusivo `PATCH /dooh/media/:id/organize-cas` com expectedName, expectedFolderId e expectedUpdatedAt.
- Verificação estrita de ID da mídia, tenant, nome, pasta e timestamp pós-escrita.
- Proteção de permissões FULL/ADMINISTRATIVO ou TI; estado seguro durante troca de empresa/sessão.
- Mensagens de erro sanitizadas, sem refletir payload da API ou credenciais.
- Atualização da Biblioteca após escrita confirmada.

## Não incluído

Upload, exclusão, renomeação/movimentação em lote, publicação, acionamento de player, processamento, versionamento ou edição de pasta. Não altera AWS, Cakto, banco ou licenciamento.

## Dependência obrigatória

O backend D15B-03 deve estar disponível antes da publicação deste frontend. O endpoint legado PATCH simples não é utilizado. Enquanto o backend não estiver atualizado, a interface retorna erro de recurso ausente; não há fallback inseguro.

## Comandos

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
  scripts/d15b2-folder-operations.test.mjs \
  scripts/d15b3-media-organize-cas.test.mjs
npm run build
```

A verificação cruzada B03-12 faz `SKIP` explícito se o backend não estiver na pasta irmã `../ooh-manager-api`. Execute Jest no projeto backend de qualquer modo.

## Homologação pendente

Testar contra API implantada em ambiente autorizado, especialmente concorrência de dois operadores e timestamps/404/409, sem tocar dados produtivos. Manter `HOLD_NO_PURGE`, pausa DOOH e planejamento de rollback.
