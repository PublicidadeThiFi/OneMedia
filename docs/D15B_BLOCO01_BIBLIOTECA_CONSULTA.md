# OneMedia — D15B Bloco 01 / Biblioteca de mídias DOOH

Baseline: frontend `OneMedia_frontend_atual17.zip` (commit `6cc1be6`); backend `ooh-manager-api_atual123.zip` (commit `d13cd1d`).

## Escopo implementado

- Substitui placeholder da rota DOOH/Biblioteca por catálogo **somente leitura**.
- Dois endpoints autenticados existentes: `GET /api/dooh/folders` e `GET /api/dooh/media?take=100[&folderId=...]` (via `apiClient` com `/dooh/...`).
- Exige grant DOOH (`FULL` ou `READ_ONLY`), mesmo tenant e papel `ADMINISTRATIVO` ou `TI`.
- Projeta **somente** dados permitidos, descartando identificadores de armazenamento, hashes/checksums, cliente, detalhes internos e payloads de erro.
- Exibe hierarquia de pastas, quantidade de mídia, estado PENDING/PROCESSING/READY/ERROR, tipo, tamanho, dimensões, duração, versões e data de cadastro.
- Filtro de pasta aplicado no servidor. Busca e filtro de estado aplicados somente aos **até 100 resultados recentes** retornados. Não afirmar que são todas as mídias nem expor total não informado pela API.
- Invalidar dados em troca de empresa/usuário, filtro de pasta ou refresh, com AbortController. Falha fechada em DTO inválido/cross-tenant.

## Fora do escopo

Upload, URLs assinadas, preview público, CRUD de pastas, ações em lote, edição de mídia, processamento, publicação, manifest, deleção e prova de exibição.

## Segurança e estado

Não alterar backend, Prisma, banco, storage, Cakto, AWS, grants, `ACTIVE_PLAYER`, `DOOH_MEDIA_UPLOADS_ENABLED` ou `HOLD_NO_PURGE`. Status READY **não certifica** playback, audiência nem entrega contratual.

## Aplicação

No frontend, executar:

```bash
unzip -o "../GPT/OneMedia_D15B_BLOCO01_Biblioteca_Consulta_patch.zip" -d .
node --experimental-strip-types --test scripts/d15b1-media-library-readonly.test.mjs
npm run build
```

Para regressão conjunta, somar todos os scripts D13J/K/L e D15A1-01..05 usados na etapa anterior. Sem testes interativos em localhost. Publicação não autorizada automaticamente.

## Aceite

Testes Node D15B01 aprovados; regressão D15A1 sem falhas; build Vite aprovado no ambiente do desenvolvedor. A homologação com mídia e tenant reais fica para etapa controlada.
