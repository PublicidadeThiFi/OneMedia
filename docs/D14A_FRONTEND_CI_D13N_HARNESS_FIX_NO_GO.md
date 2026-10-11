# OneMedia — D14A CI FIX — Frontend (2026-10-11)

## Escopo

- `tools/dooh-ui/d13n/dooh-inventory.spec.ts`: `SECRET` era apenas um marcador privado sintético utilizado para verificar não vazamento no DOM; foi renomeado `PRIVATE_TEST_MARKER` sem mudar os cenários.
- `tools/dooh-ui/d13n/playwright.config.ts`: `webServer.cwd` agora aponta para a raiz Vite/React (`resolve(__dirname, '../../..')`), evitando o erro anterior `node_modules/.bin/vite: No such file or directory` iniciado a partir da pasta de testes.

## QA

Na raiz `OneMedia`: `npm run security:scan`, `npm run build`, `bash scripts/run-d13n-dooh-browser-qa.sh` (este último exige node_modules e Chromium local do Playwright). Nenhuma lógica de negócio ou arquivo de configuração Vercel foi alterado.

## Deploy

O `vercel.json` do frontend existente envia `/api/*` diretamente a `https://api.onemediaap.com.br/api/*`. Uma prévia conectará à API definida nessa regra; não utilizá-la para testes de escrita contra produção sem validar o destino e isolar banco/credenciais.
