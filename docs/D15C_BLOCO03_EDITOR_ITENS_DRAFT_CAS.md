# OneMedia — D15C Bloco 03 | Editor de itens do rascunho

## Integração

A interface **DOOH → Programação → Itens do rascunho** utiliza:

- `GET /dooh/playlists/:id/draft/items` — leitura de snapshot e pré-validação antes de gravar;
- `GET /dooh/media?take=100` — catálogo limitado de mídias (resultado pode ser parcial);
- `GET /dooh/media/:id/versions` — seleção de versões `READY` com metadados de asset processado;
- `POST /dooh/playlists/:id/draft/items/add-cas` e `POST /dooh/playlists/:id/draft/items/remove-cas/:itemId` — exclusivamente CAS.

O seletor usa até 100 mídias recentes e no máximo 50 versões por mídia; não representa a biblioteca completa. Uma versão `READY` nos metadados não comprova bytes reais presentes no S3 nem codecs reproduzíveis; o servidor valida status e asset novamente.

## Salvaguardas

Exige empresa atual, grant DOOH `FULL` e papel técnico. Confirmações explícitas, payload mínimo, comparação da leitura local com o preflight e CAS atômico no backend. Após resposta confirmada, relê o rascunho. Se uma requisição retorna estado indeterminado, atualizar antes de repetir; não há fallback à rota legada.

Não habilita publicação, programação, rearranjo, delete de mídia, upload, processamento, despausa global, comandos a players ou qualquer alteração na AWS/Cakto.

## Regressão

`node --experimental-strip-types --test scripts/d13j-dooh-player-inventory.test.mjs scripts/d13k-dooh-player-detail.test.mjs scripts/d13l-dooh-player-operational-safety.test.mjs scripts/d15a1-player-operations.test.mjs scripts/d15a1-pairing-assignment.test.mjs scripts/d15a1-group-command-audit.test.mjs scripts/d15a1-safe-group-membership.test.mjs scripts/d15a1-restart-qa.test.mjs scripts/d15b1-media-library-readonly.test.mjs scripts/d15b2-folder-operations.test.mjs scripts/d15b3-media-organize-cas.test.mjs scripts/d15b4-media-upload.test.mjs scripts/d15b5-media-processing.test.mjs scripts/d15b6-media-versions.test.mjs scripts/d15c1-playlists-readonly.test.mjs scripts/d15c2-playlist-write-cas.test.mjs scripts/d15c3-playlist-draft-cas.test.mjs`

`npm run build`

Executar Jest e build do backend antes de considerar compatível. O CI do frontend isolado pode marcar a checagem cruzada do backend como `SKIP`, sem substituir Jest. Deploy e testes reais somente com autorização.
