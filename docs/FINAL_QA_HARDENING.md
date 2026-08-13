# Final QA / Hardening — Frontend OneMedia

A validação final combina build/scan estático, smoke HTTP e navegador headless real sem adicionar dependências de teste.

## Comandos

- `npm run qa:final:self-test`: valida o próprio classificador da suíte (shell SPA, fallback do GitHub Pages e filtro de 404 de navegação).
- `npm run qa:final:static`: regressões críticas e contratos do frontend.
- `npm run qa:final:http`: verifica infraestrutura HTTP e entradas SPA.
- `npm run qa:final:browser`: abre Chrome/Chromium headless em desktop e mobile, observa requests, erros de console, imagens quebradas e Leaflet.
- `npm run qa:final:safe`: self-test + static + security + Phase 5 + build + bundle budget.
- `npm run qa:final:remote`: HTTP + browser contra ambiente implantado (útil localmente).

Os resultados JSON ficam em `.qa-results/`.

## GitHub Pages e rotas SPA

O domínio de produção é publicado via GitHub Pages. Em acesso direto a uma rota SPA como `/home`, `/termos` ou `/mapa/<token>`, o Pages pode responder inicialmente com `HTTP 404` contendo `public/404.html`. Esse documento carrega `/route-redirect.js`, transfere a rota para `/?p=...`, e `/route-restore.js` restaura a URL antes do React montar.

Por isso:

- o smoke HTTP **não considera qualquer 404 como sucesso**;
- ele aceita `404` somente quando o HTML corresponde exatamente ao fallback controlado (`Redirecting...` + `/route-redirect.js`);
- `/route-redirect.js`, `/route-restore.js` e o shell `/` são validados separadamente;
- o Chrome é responsável por confirmar que a navegação termina na rota correta e que a aplicação realmente monta;
- `404/500` de API, imagens, assets ou documentos diferentes da navegação inicial continuam sendo falhas reais.

No workflow manual, HTTP e navegador rodam em etapas separadas com coleta de evidências mesmo se uma delas falhar. O gate final reprova caso qualquer uma das duas falhe.

## Produção

```bash
QA_ALLOW_PRODUCTION=true \
QA_WEB_BASE_URL=https://onemediaap.com.br \
QA_MEDIA_MAP_URL='https://onemediaap.com.br/mapa/<token-de-qa>' \
npm run qa:final:remote
```

`QA_MEDIA_MAP_URL` é opcional. Quando definido, o runner exige mapa Leaflet com dimensão útil, ausência do CTA legado `Solicitar proposta` e ausência de imagens internas quebradas.

O browser runner procura `google-chrome`, `google-chrome-stable`, `chromium` ou `chromium-browser`. Também é possível definir `CHROME_BIN`.
