# Segurança contínua no CI — Frontend

Esta etapa adiciona um pipeline de segurança para impedir regressão na superfície pública do frontend.

## Workflows
Arquivos:
- `.github/workflows/frontend-security-ci.yml`
- `.github/workflows/deploy-pages.yml`

O workflow de CI executa, nesta ordem:
1. `npm ci`
2. `npm run security:scan`
3. `npm run validate:public-env`
4. `npm run build`
5. `npm run security:audit`

O workflow de deploy agora também bloqueia a publicação se o `security:scan` ou o `security:audit` falharem.

## Scripts
- `npm run security:scan` → procura segredos versionados e arquivos proibidos (`.env`, `.pem`, `.key`, etc.)
- `npm run validate:public-env` → impede variáveis `VITE_*` com perfil de segredo no bundle
- `npm run security:audit` → roda `npm audit` nas dependências de produção
- `npm run ci:security` → fluxo consolidado para execução manual/local

## Falhas esperadas do pipeline
O pipeline deve falhar quando:
- um segredo for versionado no repositório
- uma variável pública suspeita for exposta no build
- o build do frontend quebrar
- uma vulnerabilidade alta/crítica aparecer em dependências de produção
