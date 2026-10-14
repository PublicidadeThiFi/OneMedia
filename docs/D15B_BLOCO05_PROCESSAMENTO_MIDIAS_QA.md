# OneMedia — D15B Bloco 05 — Histórico de processamento DOOH e fila QA

**Baseline:** `OneMedia_frontend_atual21` (`c15ea32`) e `ooh-manager-api_atual124` (`eace20c`).

## Escopo e decisão

- Novo painel independente em Biblioteca: mídia carregada, histórico de até 50 jobs, versão, tentativas e estados de fila (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`).
- GET `GET /api/dooh/media/:id/processing` conforme contrato existente de `DoohMediaProcessingService.history`, leitura autorizada a `ADMINISTRATIVO` ou `TI` com módulo DOOH `FULL` ou `READ_ONLY` do mesmo tenant.
- Para escrita, UI **desligada por padrão**. O botão de enfileiramento só existe quando `VITE_DOOH_MEDIA_PROCESSING_QA_UI_ENABLED === 'true'`; exige também DOOH `FULL`, perfil técnico, estado `PENDING`/`ERROR`, ausência de job ativo, confirmação textual `PROCESSAR` e confirmação final.
- Antes de enfileirar, requisita mídia e histórico atualizados. A proteção final de concorrência/estado/tenant está em `DoohMediaProcessingService.enqueue` (transação serializável). A UI não cria/versiona conteúdo por conta própria.
- POST existente `POST /api/dooh/media/:id/process` exige `DOOH_MEDIA_PROCESSING_ENABLED=true` no backend. **A flag do backend é global, e não uma allowlist de tenants de QA**; portanto este Bloco 05 NÃO autoriza sua ativação em produção ou em ambiente compartilhado. Uma liberação posterior requer um gate de autorização QA por tenant no servidor e avaliação do worker. Não habilitar este env no ambiente atual; nenhuma variável foi alterada neste patch.
- Resposta do POST confirma apenas a inclusão na fila; jamais representa resultado `READY`. Erros de rede/resposta ambígua pedem consulta ao histórico em vez de tentativa cega.
- Não há worker automático nem publicação, exclusão, modificação de arquivos ou alterações em Cakto/AWS/Prisma. Nenhum S3 real é acessado por esta interface.

## Limitação importante: worker isolado

- O adaptador atual `DoohMediaProcessingAdapterService.assertIsolatedEnvironment` exige `DOOH_MEDIA_WORKER_ENABLED=true`, `DOOH_MEDIA_PROCESSING_ENABLED=true`, bucket/endpoint locais explicitamente permitidos, banco local e `NODE_ENV !== 'production'`.
- Portanto **não existe worker de produção homologado** que consuma jobs enfileirados. Não ative UI/servidor em produção e não execute processamento em dispositivo ou bucket real.
- Para a futura homologação: definir rollout/rollback aprovado, worker seguro e orquestrado, supervisão de falhas e recuperação de leases, limites de CPU/memória/armazenamento, storage isolado e execução de smoke em ambiente apropriado. O presente patch NÃO realiza essas liberações.

## Contrato de segurança

- A API projeta dados estritamente necessários ao histórico, sem `leaseToken`, IDs de ator, S3 key, resultados brutos, checksum ou mensagens arbitrárias do servidor.
- Dados malformados, outra mídia, jobs duplicados, datas, status e tentativas inválidas são rejeitados; a UI não inventa histórico nem certifica exibição.
- O catálogo de mídias pode conter até 100 itens no filtro ativo; o painel não promete pesquisa global.
- Não há polling automático, execução de worker nem retries automáticos.

## Arquivos do patch

1. `src/lib/doohMediaProcessingContract.ts` (novo)
2. `src/components/DoohMediaProcessing.tsx` (novo)
3. `src/components/DoohMediaLibraryReadOnly.tsx` (integração)
4. `src/components/DoohFoundationPage.tsx` (descrição)
5. `scripts/d15b5-media-processing.test.mjs` (novo)
6. `docs/D15B_BLOCO05_PROCESSAMENTO_MIDIAS_QA.md` (este arquivo)

## Validação e aceite

- Rodar o script novo e as regressões D13J/D13K/D13L, D15A1 e D15B01-04, com `node --experimental-strip-types --test`.
- Rodar `npm run build` no VS Code.
- Esperado: 160/160 testes passando quando backend estiver ao lado na pasta `../ooh-manager-api`. No CI sem backend, a validação cruzada é explicitamente marcada como `SKIP` e não substitui Jest/backend.
- **Não habilitar flags, não testar POST em produção, não disparar deploy sem aprovação.** A branch `master` tem pipeline de publicação automática (GitHub Pages).
