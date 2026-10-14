# OneMedia — D15C Bloco 02 (frontend)

## Escopo

- Criação segura de playlist com nome, gerando exatamente um DRAFT v1, sem publicação.
- Renomeação via novo `PATCH /dooh/playlists/:id/rename-cas`, nunca via PATCH legado.
- GET de pré-validação e snapshot com nome/data originais; CAS definitivo no backend.
- Acesso DOOH `FULL`, tenant correto, papel ADMINISTRATIVO ou TI, confirmação explícita, cancelamento em troca de contexto e validação da resposta.
- Mantém catálogo read-only e programação do Marketplace existentes.
- Não inclui adicionar/reordenar itens, publicar, gerar agendas/manifests, arquivar ou excluir.

## Teste local

```sh
node --experimental-strip-types --test scripts/d15c2-playlist-write-cas.test.mjs
npm run build
```

Executar regressão completa D13J-L, D15A1, D15B e D15C01/02; frontend + backend lado a lado para evitar SKIPs das verificações de contrato cruzadas.

## Rollout

Não realizar push/deploy sem aprovação da sequência backend → frontend. O GitHub Pages pode publicar automaticamente. Em incompatibilidade do endpoint, manter escrita suspensa ou reverter frontend; nunca recorrer automaticamente ao PATCH legado.
