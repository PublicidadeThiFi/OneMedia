# OneMedia — D15B / Bloco 06 — Versões processadas (frontend)

Baseline: OneMedia_frontend_atual22.zip / commit 61efbb2.

## Escopo
- Nova seção independente de consulta de versões na Biblioteca DOOH.
- GET autenticado `/dooh/media/:id/versions`, somente para tenant correspondente e funções técnicas com módulo DOOH concedido (`READ_ONLY` ou `FULL`).
- Apresenta as últimas 50 versões com total declarado pela API; não inventa paginação nem total.
- Mostra `status`, dimensões, duração, checksum truncado, metadados do asset derivado e avisos estruturais.
- Estados não-READY não são confundidos com mídia pronta; READY sem checksum ou asset disponível sinaliza revisão.
- Resposta da API é validada e convertida para projeção local (não armazena payload bruto, URLs privadas ou metadata).
- AbortController e chave contextual impedem renderização de requisição antiga ao trocar mídia, empresa ou sessão.

## Limites importantes
A verificação é **exclusivamente estrutural**: a existência de `processedAsset`/checksum no PostgreSQL não prova a existência do objeto S3, integridade binária, codec, publicação, reprodução ou Proof-of-Play. O painel não invoca workers, uploads, escrita nem publicação. O endpoint é novo e requer backend atualizado antes de funcionar.

## Validações
Na raiz do frontend (com backend irmão em `../ooh-manager-api`):

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
  scripts/d15b3-media-organize-cas.test.mjs \
  scripts/d15b4-media-upload.test.mjs \
  scripts/d15b5-media-processing.test.mjs \
  scripts/d15b6-media-versions.test.mjs
npm run build
```

Esperado: **172 PASS, 0 FAIL, 0 SKIP** com ambos os repositórios; no frontend isolado a checagem cruzada de backend é `SKIP` explícito e não conta como validação do backend.

## Rollout e rollback (não autorizado neste bloco)
1. Testes locais Jest/build NestJS do backend e testes/build do frontend.
2. Aprovação explícita de publicação; publicar backend primeiro e confirmar disponibilidade/autorização da nova rota GET em ambiente de homologação.
3. Publicar o frontend somente após confirmar compatibilidade. GitHub Pages pode disparar deploy automático no push.
4. Reversão frontend por commit anterior; backend pode manter o endpoint GET sem consumidor, ou sofrer rollback coordenado se necessário.
5. Proibido habilitar `DOOH_MEDIA_UPLOADS_ENABLED`, `DOOH_MEDIA_PROCESSING_ENABLED`, flags de QA, workers ou alterar infraestrutura neste bloco.
