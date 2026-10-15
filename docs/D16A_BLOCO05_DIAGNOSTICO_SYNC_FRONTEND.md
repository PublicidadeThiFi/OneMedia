# D16A05 — Diagnóstico de versões e heartbeat

A seção DOOH → Telas e Players → detalhe técnico inclui painel **Sincronização técnica — D16A05**. Consulta sob demanda, `GET /dooh/manifests/players/:id/sync-diagnostic`, sem polling, writes ou comandos. Não modifica D16A01 inventário nem D16A04 preflight/materialização QA.

Autorização local exige empresa da sessão, grant DOOH, papel técnico e modo `FULL`/`READ_ONLY`. Valida no retorno o player, a empresa, as versões e o timestamp do heartbeat do detalhe. Respostas diferentes do detalhe exigem reabertura e nunca são exibidas como consistentes. Requisições anteriores são canceladas ao trocar contexto. Erros são mensagens fixas.

Apenas dados técnicos. `REPORTED_EQUAL` **não** representa ACK de download, integridade do conteúdo ou Proof-of-Play. Checksum abreviado é registro de banco, não hash de objeto baixado. O backend é a autoridade sobre estado e heartbeat; a UI não confirma distribuição ou reprodução.

Teste: `node --experimental-strip-types --test scripts/d16a5-manifest-sync-diagnostic.test.mjs` e regressão `scripts/d13[jkl]-*.test.mjs scripts/d15*.test.mjs scripts/d16*.test.mjs` (com globs separados no zsh). Build: `npm run build`.
