# Final QA / Hardening — Frontend OneMedia

A validação final combina build/scan estático, smoke HTTP e navegador headless real sem adicionar dependências de teste.

## Comandos

- `npm run qa:final:static`: regressões críticas e contratos do frontend.
- `npm run qa:final:http`: verifica as rotas públicas via HTTP.
- `npm run qa:final:browser`: abre Chrome/Chromium headless em desktop e mobile, observa requests, erros de console, imagens quebradas e Leaflet.
- `npm run qa:final:safe`: static + security + Phase 5 + build + bundle budget.
- `npm run qa:final:remote`: HTTP + browser contra ambiente implantado.

Os resultados JSON ficam em `.qa-results/`.

## Produção

```bash
QA_ALLOW_PRODUCTION=true \
QA_WEB_BASE_URL=https://onemediaap.com.br \
QA_MEDIA_MAP_URL='https://onemediaap.com.br/mapa/<token-de-qa>' \
npm run qa:final:remote
```

`QA_MEDIA_MAP_URL` é opcional. Quando definido, o runner exige mapa Leaflet com dimensão útil, ausência do CTA legado `Solicitar proposta` e ausência de imagens internas quebradas.

O browser runner procura `google-chrome`, `google-chrome-stable`, `chromium` ou `chromium-browser`. Também é possível definir `CHROME_BIN`.
