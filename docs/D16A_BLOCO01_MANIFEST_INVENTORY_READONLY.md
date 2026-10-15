# OneMedia — D16A01 — Consulta de manifests por player

## Interface

A ação **Consultar manifests** aparece sob o detalhe técnico de um player existente em **DOOH → Telas e Players**. Só consulta depois de ação explícita do operador com papel `TI`/`ADMINISTRATIVO`, tenant correspondente, grant DOOH e `FULL`/`READ_ONLY`.

Endpoint: `GET /dooh/manifests/players/:playerId/inventory` (base `/api` gerenciada pelo cliente existente).

O frontend confere identidade do player e da empresa, lifecycle, contadores exatos do detalhe, formatos dos checksums e datas, ordem estritamente decrescente, limite de 50 e semântica `hasMore`. Requisições são canceladas em troca de player, tenant, sessão ou entitlement. Apenas o prefixo do checksum é apresentado, e o JSON recebido não é preservado como estado.

**Limites expressos na UI:** hash armazenado não significa integridade criptográfica comprovada; igualdade entre `currentManifestVersion` e `desiredManifestVersion` não equivale a confirmação de download, reprodução, audiência ou Proof-of-Play. Não há URL de mídia, manifest JSON nem comandos operacionais.

## Testes no VS Code

```bash
node --experimental-strip-types --test \
  scripts/d13j-*.test.mjs \
  scripts/d13k-*.test.mjs \
  scripts/d13l-*.test.mjs \
  scripts/d15*.test.mjs \
  scripts/d16a1-manifest-inventory-readonly.test.mjs
npm run build
```

No teste conjunto, deixar os checkouts frontend `OneMedia` e backend `ooh-manager-api` lado a lado. No CI frontend isolado, alguns cenários antigos podem ser reportados como `SKIP` porque o código backend não acompanha o checkout; isso não substitui o Jest específico no backend.

## Publicação

A interface é somente leitura, mas depende de uma rota backend nova. Validar builds, contrato e sequência de rollout **backend primeiro, frontend depois**; documentar rollback antes de qualquer publicação. Não habilitar endpoints de escrita, flags de QA, deploy ou recursos AWS por causa deste patch.
